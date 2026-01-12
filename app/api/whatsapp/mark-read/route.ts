import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { conversation_id } = await req.json();

        if (!conversation_id) {
            return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Reset unread_count on conversation
        const { error: convError } = await supabase
            .from('conversations')
            .update({ unread_count: 0 })
            .eq('id', conversation_id);

        if (convError) {
            console.error("Error resetting unread count:", convError);
            return NextResponse.json({ error: `Failed to update conversation: ${convError.message}` }, { status: 500 });
        }

        // 2. Mark messages as read (OPTIONAL: if you want to track individual message read status)
        // This might be heavy if there are thousands of messages, but for a chat app it's usually standard.
        // We can optimize by only updating 'user' messages that are !is_read
        const { error: msgError } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversation_id)
            .eq('sender', 'user')
            .eq('is_read', false);

        if (msgError) {
            console.error("Error marking messages read:", msgError);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Mark read error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
