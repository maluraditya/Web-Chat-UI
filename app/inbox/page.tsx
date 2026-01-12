'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, User, Bot, Loader2, MessageSquare, Filter } from 'lucide-react';

type Conversation = {
    id: string;
    phone: string;
    name: string | null;
    status: 'bot' | 'human' | 'closed';
    last_message: string | null;
    updated_at: string;
    unread_count: number;
};

type FilterType = 'all' | 'unread' | 'human' | 'bot';

export default function InboxPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');
    const [search, setSearch] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchConversations();

        const channel = supabase
            .channel('conversations_inbox')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'conversations' },
                () => {
                    fetchConversations();
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

    const filteredConversations = conversations
        .filter(c => {
            // Search filter
            const matchSearch = (c.name?.toLowerCase().includes(search.toLowerCase()) ||
                c.phone.includes(search));
            if (!matchSearch) return false;

            // Tab filter
            if (filter === 'all') return true;
            if (filter === 'unread') return (c.unread_count || 0) > 0;
            if (filter === 'human') return c.status === 'human';
            if (filter === 'bot') return c.status === 'bot';
            return true;
        });

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = diff / (1000 * 3600 * 24);

        if (days < 1) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (days < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#111b21]">
            <Loader2 className="animate-spin text-[#00a884]" size={40} />
            <span className="ml-3 text-white">Loading WhatsApp...</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#111b21] text-[#e9edef] font-sans">
            {/* Header */}
            <header className="bg-[#202c33] px-4 py-3 flex justify-between items-center sticky top-0 z-10 border-b border-[#2a3942]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden">
                        {/* Placeholder Profile */}
                        <div className="w-full h-full flex items-center justify-center bg-[#6a7f8a] text-white">
                            <User size={24} />
                        </div>
                    </div>
                    <h1 className="text-xl font-semibold">Chats</h1>
                </div>
                <div className="flex gap-4">
                    <Link href="/new" className="text-[#aebac1]">
                        <MessageSquare size={24} />
                    </Link>
                    <button className="text-[#aebac1]">
                        <Filter size={24} />
                    </button>
                </div>
            </header>

            {/* Search Bar */}
            <div className="px-3 py-2 bg-[#111b21]">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-[#8696a0]" />
                    </div>
                    <input
                        type="text"
                        className="bg-[#202c33] text-[#d1d7db] text-sm rounded-lg block w-full pl-10 p-2 placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                        placeholder="Search or start new chat"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 px-3 pb-3 overflow-x-auto no-scrollbar">
                {(['all', 'unread', 'human', 'bot'] as FilterType[]).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${filter === f
                                ? 'bg-[#00a884] text-[#111b21] font-medium'
                                : 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942]'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* List */}
            <main className="bg-[#111b21]">
                <div className="divide-y divide-[#2a3942] border-t border-[#2a3942]">
                    {filteredConversations.map((conv) => (
                        <Link
                            key={conv.id}
                            href={`/chat/${conv.id}`}
                            className="flex items-center px-3 py-3 hover:bg-[#202c33] cursor-pointer transition-colors group"
                        >
                            {/* Avatar */}
                            <div className="relative flex-shrink-0 mr-3">
                                <div className="w-12 h-12 rounded-full bg-[#6a7f8a] flex items-center justify-center text-white text-lg font-medium">
                                    {conv.name ? conv.name.charAt(0).toUpperCase() : '#'}
                                </div>
                                {conv.status === 'bot' && (
                                    <div className="absolute -bottom-1 -right-1 bg-yellow-600 rounded-full p-1 border-2 border-[#111b21]">
                                        <Bot size={10} className="text-white" />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h2 className={`text-base truncate ${(conv.unread_count || 0) > 0 ? 'text-white font-semibold' : 'text-[#e9edef] font-normal'
                                        }`}>
                                        {conv.name || conv.phone}
                                    </h2>
                                    <span className={`text-xs ${(conv.unread_count || 0) > 0 ? 'text-[#00a884] font-medium' : 'text-[#8696a0]'
                                        }`}>
                                        {formatTime(conv.updated_at)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-[#8696a0] truncate max-w-[80%]">
                                        {conv.last_message || 'No messages'}
                                    </p>
                                    {(conv.unread_count || 0) > 0 && (
                                        <div className="bg-[#00a884] text-[#111b21] text-xs font-bold px-1.5 min-w-[1.2rem] h-[1.2rem] rounded-full flex items-center justify-center">
                                            {conv.unread_count}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}

                    {filteredConversations.length === 0 && (
                        <div className="py-12 text-center text-[#8696a0]">
                            <p>No chats found</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
