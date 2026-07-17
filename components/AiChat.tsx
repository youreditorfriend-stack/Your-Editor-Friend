import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// Placeholder-only assistant. No AI is wired yet — replies are picked from a
// canned list so the full interface (bubbles, typing indicator, auto-scroll,
// multiline input) can be reviewed in isolation. The real provider call will
// later live in src/lib/aiChat.ts and only this pickReply() needs swapping.
const GREETING: ChatMessage = {
  id: 0,
  role: 'assistant',
  text: `Hi 👋

Welcome to Your Editor Friend.

I'm your AI Assistant.

I can help you with

• Video Editing
• Pricing
• Courses
• Services
• Portfolio
• Custom Quote
• Availability

What can I help you with today?`,
};

const DUMMY_REPLIES = [
  "Great question! I'm still in preview mode, but Janish offers reel editing, YouTube edits, thumbnails and full-time retainer plans. 🎬",
  "Pricing depends on the format and turnaround. Short-form reels usually start affordable — tap “Let's Talk” for an exact quote. 💰",
  "You can start a project any time — share a reference video you like and your deadline, and we'll take it from there. ✨",
  "Once the AI is switched on I'll answer this properly. For now, message on WhatsApp and Janish will reply personally. 🙌",
];

let replyCursor = 0;
const pickReply = (): string => {
  const r = DUMMY_REPLIES[replyCursor % DUMMY_REPLIES.length];
  replyCursor += 1;
  return r;
};

export const AiChat: React.FC<AiChatProps> = ({ open, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the conversation each time the panel is reopened
  useEffect(() => {
    if (open) {
      setMessages([GREETING]);
      setInput('');
      setTyping(false);
      replyCursor = 0;
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Clean up any pending typing timer on unmount
  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current); }, []);

  // Auto-scroll to the newest message / typing indicator
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  // Grow the textarea with its content (capped)
  const autosize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => { autosize(); }, [input, autosize]);

  const send = () => {
    const text = input.trim();
    if (!text || typing) return;
    const userMsg: ChatMessage = { id: Date.now(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate the assistant "thinking", then drop a canned reply
    typingTimer.current = setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: pickReply() }]);
    }, 1100);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter inserts a newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
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
                    className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl border ${
                      m.role === 'user'
                        ? 'bg-[#E50914] text-white border-transparent rounded-br-md'
                        : 'bg-white/5 text-zinc-100 border-white/10 rounded-bl-md'
                    }`}
                  >
                    {m.text}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {typing && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-zinc-400"
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input bar */}
            <div className="relative border-t border-white/10 px-3 py-3">
              <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 focus-within:border-[#E50914]/60 transition-all">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Type a message…  (Shift+Enter for a new line)"
                  className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none py-2 max-h-[120px] no-scrollbar"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || typing}
                  aria-label="Send message"
                  className="w-9 h-9 mb-0.5 shrink-0 rounded-xl bg-[#E50914] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700 text-white flex items-center justify-center transition-all active:scale-95"
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
