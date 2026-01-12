
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { conversation_id, message } = await req.json();

        if (!conversation_id || !message) {
            return NextResponse.json({ error: 'Missing conversation_id or message' }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Fetch conversation to get phone number
        const { data: conversation, error: fetchError } = await supabaseAdmin
            .from('conversations')
            .select('phone, status')
            .eq('id', conversation_id)
            .single();

        if (fetchError || !conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        // 2. Insert message into Supabase
        const { error: insertError } = await supabaseAdmin
            .from('messages')
            .insert({
                conversation_id: conversation_id,
                sender: 'human',
                message: message
            });

        if (insertError) {
            console.error("Error saving message:", insertError);
            return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
        }

        // 3. Call n8n webhook
        // Assuming n8n webhook URL is in environment variables
        const n8nWebhookUrl = process.env.N8N_SEND_WEBHOOK_URL;

        if (n8nWebhookUrl) {
            try {
                await fetch(n8nWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: conversation.phone,
                        message: message,
                        status: conversation.status
                    })
                });
            } catch (n8nError) {
                console.error("Error calling n8n:", n8nError);
                // We don't fail the request if n8n fails, but we should log it. 
                // In a real app we might want to retry or mark message as failed.
            }
        } else {
            console.warn("N8N_SEND_WEBHOOK_URL not set");
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Send API error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
