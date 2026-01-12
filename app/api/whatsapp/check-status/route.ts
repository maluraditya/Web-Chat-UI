import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Missing phone' }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: conversation, error } = await supabaseAdmin
            .from('conversations')
            .select('status')
            .eq('phone', phone)
            .single();

        if (error || !conversation) {
            // If user doesn't exist, they are technically "bot" handled (default)
            // But we'll return 404 to let the client decide
            return NextResponse.json({ error: 'Conversation not found', status: 'bot' }, { status: 404 });
        }

        return NextResponse.json({ success: true, status: conversation.status });

    } catch (error) {
        console.error("Check Status API error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
