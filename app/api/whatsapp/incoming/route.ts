
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { phone, name, message } = await req.json();

        if (!phone || !message) {
            return NextResponse.json({ error: 'Missing phone or message' }, { status: 400 });
        }

        // Initialize Supabase client (using service role key if needed for RLS bypass, 
        // but here assuming anon key with proper policies or server-side auth)
        // For webhooks, we usually need the SERVICE_ROLE_KEY to bypass RLS if the webhook isn't authenticated as a user.
        // However, for this MVP, we'll try with the standard client and assume policies allow insert.
        // OPTIONALLY: Use process.env.SUPABASE_SERVICE_ROLE_KEY for admin access.

        // Better to use a server-side client with admin privileges for webhooks
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Find or create conversation
        let { data: conversation, error: fetchError } = await supabaseAdmin
            .from('conversations')
            .select('id, status')
            .eq('phone', phone)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error("Error fetching conversation:", fetchError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!conversation) {
            const { data: newConv, error: createError } = await supabaseAdmin
                .from('conversations')
                .insert({ phone, name, status: 'bot', last_message: message })
                .select()
                .single();

            if (createError) {
                console.error("Error creating conversation:", createError);
                return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
            }
            conversation = newConv;
        } else {
            // Update last message
            await supabaseAdmin
                .from('conversations')
                .update({ last_message: message, updated_at: new Date().toISOString() })
                .eq('id', conversation.id);
        }


        // 2. Insert message
        if (!conversation) {
            return NextResponse.json({ error: 'Failed to resolve conversation' }, { status: 500 });
        }

        const { error: msgError } = await supabaseAdmin
            .from('messages')
            .insert({
                conversation_id: conversation.id,
                sender: 'user', // Incoming message from user
                message: message
            });

        if (msgError) {
            console.error("Error inserting message:", msgError);
            return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
