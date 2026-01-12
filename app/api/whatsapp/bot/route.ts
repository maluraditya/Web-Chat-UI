import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { phone, message } = await req.json();

        if (!phone || !message) {
            return NextResponse.json({ error: 'Missing phone or message' }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Find conversation
        const { data: conversation, error: fetchError } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .eq('phone', phone)
            .single();

        if (fetchError || !conversation) {
            return NextResponse.json({ error: 'Conversation not found. Bot cannot reply to unknown user.' }, { status: 404 });
        }

        // 2. Insert BOT message
        const { error: msgError } = await supabaseAdmin
            .from('messages')
            .insert({
                conversation_id: conversation.id,
                sender: 'bot',
                message: message,
                is_read: true // Bot messages are read by default (or doesn't matter)
            });

        if (msgError) {
            console.error("Error logging bot message:", msgError);
            return NextResponse.json({ error: `Failed to save message` }, { status: 500 });
        }

        // 3. Update last message (but NOT unread count)
        await supabaseAdmin
            .from('conversations')
            .update({
                last_message: message,
                updated_at: new Date().toISOString()
            })
            .eq('id', conversation.id);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Bot API error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
