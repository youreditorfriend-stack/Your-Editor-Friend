import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X } from 'lucide-react';

interface AiChatProps {
  open: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: number;
  role: 'assistant' | 'user';
  text: string;
}

// Placeholder-only assistant. No AI is wired yet — the send button simply
// echoes a friendly "coming soon" reply so the UI can be reviewed in
// isolation. The real provider call will later live in src/lib/aiChat.ts.
const GREETING: ChatMessage = {
  id: 0,
  role: 'assistant',
  text: "Hey! 👋 I'm your editing assistant. Ask me about services, pricing or how to start a project. (I'm still learning — full answers coming soon!)",
};

export const AiChat: React.FC<AiChatProps> = ({ open, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the conversation each time the panel is reopened
  useEffect(() => {
    if (open) {
      setMessages([GREETING]);
      setInput('');
      // Focus the input shortly after the open animation starts
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Keep the newest message in view
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMessage = { id: Date.now(), role: 'user', text };
    const placeholder: ChatMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      text: "Thanks! The AI assistant isn't switched on yet — for now, tap “Let's Talk” or message on WhatsApp and Janish will reply personally. 🙌",
    };
    setMessages(prev => [...prev, userMsg, placeholder]);
    setInput('');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="relative w-full sm:max-w-md h-[85vh] sm:h-[600px] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-white/15 shadow-2xl"
            style={{
              background: 'rgba(17,17,17,0.72)',
              backdropFilter: 'blur(24px) saturate(140%)',
              WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            }}
          >
            {/* Ambient glow */}
            <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-[#E50914]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-purple-600/15 blur-3xl" />

            {/* Header */}
            <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E50914] to-purple-600 flex items-center justify-center shadow-lg shadow-[#E50914]/20">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-tight">AI Assistant</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" /> Online · placeholder
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close chat"
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-5 space-y-3 no-scrollbar">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed rounded-2xl border ${
                      m.role === 'user'
                        ? 'bg-[#E50914] text-white border-transparent rounded-br-md'
                        : 'bg-white/5 text-zinc-100 border-white/10 rounded-bl-md'
                    }`}
                  >
                    {m.text}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input bar */}
            <div className="relative border-t border-white/10 px-3 py-3">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 focus-within:border-[#E50914]/60 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                  placeholder="Type a message…"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none py-2"
                />
                <button
                  onClick={send}
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="w-9 h-9 shrink-0 rounded-xl bg-[#E50914] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700 text-white flex items-center justify-center transition-all active:scale-95"
                >
                  <Send size={15} />
                </button>
              </div>
              <p className="text-center text-[10px] text-zinc-600 mt-2">AI responses are not enabled yet — placeholder preview</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
