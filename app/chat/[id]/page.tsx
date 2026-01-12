
'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Message = {
    id: string;
    sender: 'user' | 'bot' | 'human';
    message: string;
    created_at: string;
};

type Conversation = {
    id: string;
    phone: string;
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

    useEffect(() => {
        fetchConversation();
        fetchMessages();

        // Subscribe to new messages
        const channel = supabase
            .channel(`messages:${id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new as Message]);
                }
            )
            .subscribe();

        // Subscribe to status changes
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
            alert("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const toggleStatus = async (newStatus: 'bot' | 'human') => {
        if (!conversation) return;
        const { error } = await supabase
            .from('conversations')
            .update({ status: newStatus })
            .eq('id', conversation.id);

        if (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        } else {
            setConversation({ ...conversation, status: newStatus });
        }
    }

    if (!conversation) return <div className="p-8">Loading chat...</div>;

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white shadow px-4 py-3 flex justify-between items-center z-10">
                <div className="flex items-center">
                    <Link href="/inbox" className="text-gray-500 hover:text-gray-700 mr-4">
                        &larr; Back
                    </Link>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{conversation.phone}</h2>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                            Status: <span className={`font-semibold ${conversation.status === 'human' ? 'text-green-600' : 'text-yellow-600'}`}>{conversation.status.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {conversation.status === 'bot' ? (
                        <button
                            onClick={() => toggleStatus('human')}
                            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
                        >
                            Take Over
                        </button>
                    ) : (
                        <button
                            onClick={() => toggleStatus('bot')}
                            className="bg-yellow-500 text-white px-4 py-2 rounded text-sm hover:bg-yellow-600"
                        >
                            Return to Bot
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[70%] rounded-lg px-4 py-2 shadow ${msg.sender === 'user' ? 'bg-white text-gray-900' :
                            msg.sender === 'human' ? 'bg-blue-600 text-white' :
                                'bg-gray-200 text-gray-800' // Bot messages
                            }`}>
                            <div className="text-xs mb-1 opacity-75">
                                {msg.sender === 'user' ? 'User' : msg.sender === 'human' ? 'You' : 'Bot'}
                            </div>
                            <p>{msg.message}</p>
                            <div className="text-xs mt-1 opacity-50 text-right">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white p-4 border-t">
                <form onSubmit={sendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
