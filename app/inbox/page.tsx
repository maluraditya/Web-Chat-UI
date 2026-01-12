
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Conversation = {
    id: string;
    phone: string;
    name: string | null;
    status: 'bot' | 'human' | 'closed';
    last_message: string | null;
    updated_at: string;
};

export default function InboxPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchConversations();

        // specific realtime subscription
        const channel = supabase
            .channel('conversations_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'conversations' },
                (payload) => {
                    console.log('Change received!', payload);
                    fetchConversations(); // Re-fetch to keep order simple for now
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [router]);

    const fetchConversations = async () => {
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) console.error('Error fetching conversations:', error);
        else setConversations(data as Conversation[]);
        setLoading(false);
    };

    if (loading) return <div className="p-8">Loading inbox...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>

                </div>
            </header>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {conversations.map((conv) => (
                            <li key={conv.id}>
                                <Link href={`/chat/${conv.id}`} className="block hover:bg-gray-50">
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-blue-600 truncate">
                                                {conv.name || conv.phone}
                                            </p>
                                            <div className="ml-2 flex-shrink-0 flex">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${conv.status === 'human' ? 'bg-green-100 text-green-800' :
                                                    conv.status === 'bot' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {conv.status.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <p className="flex items-center text-sm text-gray-500">
                                                    {conv.last_message || 'No messages'}
                                                </p>
                                            </div>
                                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                <p>
                                                    {new Date(conv.updated_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                        {conversations.length === 0 && (
                            <li className="px-4 py-8 text-center text-gray-500">No conversations yet.</li>
                        )}
                    </ul>
                </div>
            </main>
        </div>
    );
}
