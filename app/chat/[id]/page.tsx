'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Phone, Video, MoreVertical, Paperclip, Smile, Mic, User, Bot, Check, CheckCheck } from 'lucide-react';

type Message = {
    id: string;
    sender: 'user' | 'bot' | 'human';
    message: string;
    created_at: string;
};

type Conversation = {
    id: string;
    phone: string;
    name: string | null;
    status: 'bot' | 'human' | 'closed';
};

export default function ChatPage() {
    const { id } = useParams() as { id: string };
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Mark as read on open
    useEffect(() => {
        if (id) {
            fetch('/api/whatsapp/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation_id: id })
            }).catch(err => console.error("Failed to mark read", err));
        }
    }, [id]);

    useEffect(() => {
        fetchConversation();
        fetchMessages();

        const channel = supabase
            .channel(`messages:${id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new as Message]);
                    // Mark as read immediately if user is on this page
                    fetch('/api/whatsapp/mark-read', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ conversation_id: id })
                    });
                }
            )
            .subscribe();

        const statusChannel = supabase
            .channel(`conversation:${id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${id}` },
                (payload) => {
                    setConversation(payload.new as Conversation);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(statusChannel);
        };
    }, [id, router]);

    const fetchConversation = async () => {
        const { data, error } = await supabase.from('conversations').select('*').eq('id', id).single();
        if (error) console.error('Error fetching conversation', error);
        else setConversation(data);
    }

    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });

        if (error) console.error('Error fetching messages:', error);
        else setMessages(data as Message[]);
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setSending(true);

        try {
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation_id: id, message: newMessage })
            });

            if (!res.ok) throw new Error('Failed to send');

            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setSending(false);
        }
    };

    const toggleStatus = async () => {
        if (!conversation) return;
        const newStatus = conversation.status === 'bot' ? 'human' : 'bot';

        const { error } = await supabase
            .from('conversations')
            .update({ status: newStatus })
            .eq('id', conversation.id);

        if (error) {
            console.error("Error updating status:", error);
        } else {
            setConversation({ ...conversation, status: newStatus });
        }
    }

    if (!conversation) return (
        <div className="flex items-center justify-center min-h-screen bg-[#111b21] text-white">
            Loading chat...
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-[#0b141a]">
            {/* WhatsApp Header */}
            <div className="bg-[#202c33] px-2 py-2 flex justify-between items-center z-10 border-b border-[#2a3942]">
                <div className="flex items-center gap-2">
                    <Link href="/inbox" className="text-[#d1d7db] p-2 rounded-full hover:bg-[#374248]">
                        <ArrowLeft size={24} />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#6a7f8a] flex items-center justify-center text-white text-lg overflow-hidden">
                            {conversation.name ? conversation.name.charAt(0).toUpperCase() : <User size={24} />}
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-[#e9edef] font-semibold text-base leading-tight">
                                {conversation.name || conversation.phone}
                            </h2>
                            <div className="text-xs text-[#8696a0] flex items-center gap-1">
                                {conversation.status === 'human' ? 'Human Agent' : 'Bot AI'}
                                {conversation.status === 'human' && <div className="w-2 h-2 rounded-full bg-green-500 ml-1"></div>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-[#aebac1]">
                    <button className="p-2 hover:bg-[#374248] rounded-full hidden sm:block"><Video size={24} /></button>
                    <button className="p-2 hover:bg-[#374248] rounded-full hidden sm:block"><Phone size={22} /></button>
                    <div className="h-6 w-px bg-[#374248] mx-1"></div>
                    <button
                        onClick={toggleStatus}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${conversation.status === 'bot'
                                ? 'bg-[#00a884] text-[#111b21] hover:bg-[#02906f]'
                                : 'bg-[#202c33] border border-[#d1d7db] text-[#d1d7db]'
                            }`}
                    >
                        {conversation.status === 'bot' ? 'Take Over' : 'Return to Bot'}
                    </button>
                    <button className="p-2 hover:bg-[#374248] rounded-full"><MoreVertical size={24} /></button>
                </div>
            </div>

            {/* Chat Area */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0b141a]"
                style={{
                    backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                    backgroundRepeat: 'repeat',
                    backgroundSize: '400px',
                    backgroundBlendMode: 'overlay',
                }}
            >
                {/* Date Divider Example */}
                <div className="flex justify-center my-4">
                    <span className="bg-[#1f2c33] text-[#8696a0] text-xs px-3 py-1.5 rounded-lg shadow-sm">
                        Today
                    </span>
                </div>

                {messages.map((msg) => {
                    const isUser = msg.sender === 'user'; // User is incoming (left)
                    const isHuman = msg.sender === 'human';
                    // Outgoing (Right) are Bot or Human
                    const isOutgoing = !isUser;

                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} group mb-1`}
                        >
                            <div
                                className={`relative max-w-[85%] sm:max-w-[65%] px-3 py-1.5 rounded-lg shadow-sm text-sm ${isOutgoing
                                        ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                                        : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                                    }`}
                            >
                                {/* Sender Label for Human/Bot context */}
                                {isOutgoing && (
                                    <div className={`text-[10px] font-bold mb-0.5 ${isHuman ? 'text-[#00a884]' : 'text-[#e9edef] opacity-50'}`}>
                                        {isHuman ? 'You' : 'Bot'}
                                    </div>
                                )}

                                <p className="whitespace-pre-wrap leading-relaxed mr-14 pb-1">
                                    {msg.message}
                                </p>

                                <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                    <span className="text-[10px] text-[#ffffff99] min-w-fit">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isOutgoing && (
                                        <span className="text-[#53bdeb]">
                                            <CheckCheck size={14} strokeWidth={1.5} />
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Warning if Human not active */}
            {conversation.status === 'bot' && (
                <div className="bg-[#202c33] px-4 py-2 text-center text-xs text-[#ffd279] border-t border-[#2a3942]">
                    This chat is managed by the AI Bot. Click "Take Over" to reply manually.
                </div>
            )}

            {/* Input Area */}
            <div className="bg-[#202c33] px-2 py-2 flex items-end gap-2 z-10">
                <button className="p-3 text-[#8696a0] hover:text-[#d1d7db] hidden sm:block">
                    <Smile size={24} />
                </button>
                <button className="p-3 text-[#8696a0] hover:text-[#d1d7db]">
                    <Paperclip size={24} />
                </button>

                <form onSubmit={sendMessage} className="flex-1 flex gap-2 items-end">
                    <div className="flex-1 bg-[#2a3942] rounded-lg flex items-center min-h-[42px] px-4 py-1.5 my-1">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message"
                            className="w-full bg-transparent text-[#d1d7db] placeholder-[#8696a0] focus:outline-none text-base"
                            disabled={sending}
                        />
                    </div>

                    {newMessage.trim() ? (
                        <button
                            type="submit"
                            disabled={sending}
                            className="p-3 bg-[#00a884] text-[#111b21] rounded-full hover:bg-[#02906f] transition-all mb-1 shadow-md"
                        >
                            <Send size={20} className="ml-0.5" />
                        </button>
                    ) : (
                        <button type="button" className="p-3 text-[#8696a0] hover:text-[#d1d7db] mb-1">
                            <Mic size={24} />
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
