import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { useAuthStore } from '../store/authStore';
import { Send, X, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


interface Message {
    content: string;
    sender_id: string;
    sender_name: string;
    created_at: string;
}

interface ChatProps {
    groupId: string;
    onClose: () => void;
}

export default function Chat({ groupId, onClose }: ChatProps) {
    const { token, user } = useAuthStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load message history on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/v1/chat/${groupId}/history`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data && Array.isArray(res.data)) {
                    setMessages(res.data);
                }
            } catch (e) {
                console.error("Failed to load chat history:", e);
            }
        };
        loadHistory();
    }, [groupId, token]);

    // WebSocket & Connection State
    const [isConnected, setIsConnected] = useState(false);
    const reconnectTimeout = useRef<any>(null);

    // Robust WebSocket Connection Hook
    useEffect(() => {
        let socket: WebSocket | null = null;
        let shouldReconnect = true;

        const connect = () => {
            console.log("🔌 Connecting to Live Chat...");
            socket = new WebSocket(`${API_URL.replace(/^http/, 'ws')}/api/v1/chat/${groupId}?token=${token}`);

            socket.onopen = () => {
                console.log("✅ Connected to Live Chat");
                setIsConnected(true);
                // Clear any pending reconnections
                if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (!Array.isArray(data)) {
                        setMessages((prev) => {
                            const isDuplicate = prev.some(m =>
                                m.content === data.content &&
                                m.sender_id === data.sender_id &&
                                m.created_at === data.created_at
                            );
                            if (isDuplicate) return prev;
                            return [...prev, data];
                        });

                        if (data.sender_name?.includes("Homie")) {
                            setIsTyping(false);
                        }
                    }
                } catch (e) { console.error("WS Error:", e); }
            };

            socket.onclose = () => {
                console.log("❌ Disconnected");
                setIsConnected(false);
                if (shouldReconnect) {
                    console.log("🔄 Attempting Reconnect in 3s...");
                    reconnectTimeout.current = setTimeout(connect, 3000);
                }
            };

            socket.onerror = (err) => {
                console.error("⚠️ Socket encountered error: ", err);
                socket?.close();
            };

            ws.current = socket;
        };

        connect();

        return () => {
            shouldReconnect = false;
            if (socket) socket.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };
    }, [groupId, token]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = () => {
        if (!input.trim() || !ws.current) return;

        // Send to server
        ws.current.send(JSON.stringify({ content: input }));
        setInput("");

        // Show typing indicator if message contains @Homie
        if (input.toLowerCase().includes('@homie') || input.toLowerCase().includes('homie')) {
            setIsTyping(true);
        }
    };

    return (
        <>
            {/* Floating Chat Button with Animated Character */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="fixed bottom-6 right-6 z-50"
                    >
                        {/* Cute Animated Character */}
                        <motion.div
                            animate={{
                                y: [0, -15, 0],
                                rotate: [0, 8, -8, 0]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            onClick={() => setIsOpen(true)}
                            className="cursor-pointer relative"
                        >
                            {/* Character Body */}
                            <div className="w-24 h-24 bg-gradient-to-br from-purple-400 via-pink-400 to-purple-500 rounded-full border-4 border-white shadow-2xl flex items-center justify-center relative overflow-hidden">
                                {/* Sparkles */}
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0"
                                >
                                    <div className="absolute top-2 left-2 text-yellow-300">✨</div>
                                    <div className="absolute bottom-2 right-2 text-yellow-300">✨</div>
                                </motion.div>

                                {/* Face */}
                                <div className="relative z-10 text-4xl">
                                    <motion.div
                                        animate={{ rotate: [0, 10, -10, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        🤖
                                    </motion.div>
                                </div>

                                {/* Notification Badge */}
                                {messages.filter(m => m.sender_id !== user?.id).length > 0 && (
                                    <motion.div
                                        animate={{ scale: [1, 1.3, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full border-3 border-white flex items-center justify-center text-white text-sm font-black shadow-lg"
                                    >
                                        {messages.filter(m => m.sender_id !== user?.id).length > 9 ? '9+' : messages.filter(m => m.sender_id !== user?.id).length}
                                    </motion.div>
                                )}
                            </div>

                            {/* Speech Bubble */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                                className="absolute -left-40 top-4 bg-white px-4 py-3 rounded-2xl shadow-xl border-3 border-purple-400 whitespace-nowrap"
                            >
                                <span className="font-black text-purple-600 text-sm">Chat with Homie! 💬</span>
                                <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[12px] border-l-purple-400" />
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.5, opacity: 0, y: 50 }}
                        transition={{ type: "spring", damping: 20 }}
                        className={`fixed ${isMaximized
                            ? 'inset-4 w-auto h-auto'
                            : 'bottom-6 right-6 w-[400px] h-[550px]'
                            } bg-white rounded-3xl shadow-2xl border-4 border-purple-400 z-50 flex flex-col overflow-hidden`}
                    >
                        {/* Header with Character */}
                        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 p-4 flex items-center justify-between relative overflow-hidden">
                            {/* Animated Background */}
                            <motion.div
                                animate={{ x: [0, 100, 0] }}
                                transition={{ duration: 10, repeat: Infinity }}
                                className="absolute inset-0 opacity-20"
                            >
                                <div className="text-6xl">✨💫⭐</div>
                            </motion.div>

                            <div className="flex items-center gap-3 relative z-10">
                                {/* Mini Character */}
                                <motion.div
                                    animate={{
                                        rotate: [0, 15, -15, 0],
                                        scale: [1, 1.1, 1]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-3xl shadow-lg border-2 border-purple-300"
                                >
                                    🤖
                                </motion.div>
                                <div>
                                    <h3 className="font-black text-white text-xl drop-shadow-lg">Homie AI</h3>
                                    <p className="text-xs text-purple-100 font-bold flex items-center gap-1">
                                        Your smart assistant ✨
                                        {isConnected ?
                                            <span className="w-2 h-2 bg-green-400 rounded-full inline-block animate-pulse" /> :
                                            <span className="w-2 h-2 bg-red-400 rounded-full inline-block" />
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 relative z-10">
                                <button
                                    onClick={() => setIsMaximized(!isMaximized)}
                                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition backdrop-blur-sm"
                                    title={isMaximized ? "Restore" : "Maximize"}
                                >
                                    {isMaximized ? (
                                        <Minimize2 size={18} color="white" />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                                        </svg>
                                    )}
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition backdrop-blur-sm"
                                >
                                    <Minimize2 size={18} color="white" />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 bg-white/20 hover:bg-red-400 rounded-full flex items-center justify-center transition backdrop-blur-sm"
                                >
                                    <X size={20} color="white" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-purple-50 via-pink-50 to-purple-50">
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender_id === user?.id;
                                const isAi = msg.sender_name?.includes("Homie");

                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {isAi && (
                                            <motion.div
                                                animate={{ rotate: [0, 10, -10, 0] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="text-2xl self-end mb-1"
                                            >
                                                🤖
                                            </motion.div>
                                        )}
                                        <div
                                            className={`max-w-[75%] ${isMe
                                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                                : isAi
                                                    ? 'bg-gradient-to-r from-cyan-100 to-blue-100 border-2 border-cyan-300'
                                                    : 'bg-white border-2 border-purple-200'
                                                } px-4 py-3 shadow-md`}
                                            style={{
                                                borderRadius: isMe
                                                    ? '20px 20px 5px 20px'  // Cloud shape - right side
                                                    : '20px 20px 20px 5px'   // Cloud shape - left side
                                            }}
                                        >
                                            {!isMe && !isAi && (
                                                <div className="text-xs font-black text-purple-600 mb-1">{msg.sender_name}</div>
                                            )}
                                            <div className={`text-sm ${isMe ? 'text-white' : 'text-gray-800'} whitespace-pre-wrap`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {/* Typing Indicator */}
                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-2 justify-start"
                                >
                                    <motion.div
                                        animate={{ rotate: [0, 10, -10, 0] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                        className="text-2xl"
                                    >
                                        🤖
                                    </motion.div>
                                    <div className="bg-gradient-to-r from-cyan-100 to-blue-100 border-2 border-cyan-300 px-4 py-3 rounded-2xl rounded-bl-sm">
                                        <div className="flex gap-1">
                                            <motion.div
                                                animate={{ y: [0, -5, 0] }}
                                                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                                className="w-2 h-2 bg-purple-500 rounded-full"
                                            />
                                            <motion.div
                                                animate={{ y: [0, -5, 0] }}
                                                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                                className="w-2 h-2 bg-purple-500 rounded-full"
                                            />
                                            <motion.div
                                                animate={{ y: [0, -5, 0] }}
                                                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                                className="w-2 h-2 bg-purple-500 rounded-full"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-white border-t-2 border-purple-200">
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 px-4 py-3 border-2 border-purple-300 rounded-full focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition text-sm"
                                    placeholder="Ask @Homie anything..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                />
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={sendMessage}
                                    className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
                                >
                                    <Send size={20} color="white" />
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
