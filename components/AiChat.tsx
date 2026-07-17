import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, MessageCircle, RotateCcw } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../src/lib/site';
import { CHAT_FLOW, WELCOME, buildSummary, buildWhatsAppText } from '../src/lib/chatFlow';
import { streamAssistant, AiUnavailableError, ChatTurn } from '../src/lib/aiService';
import { newConversationId, startConversation, saveChatTurn } from '../src/lib/chatHistory';

interface AiChatProps {
  open: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: number;
  role: 'assistant' | 'user';
  text: string;
}

// Hybrid assistant. A predefined flow (src/lib/chatFlow.ts) offers a fast,
// button-driven path for structured lead capture, while any free-text question
// is answered by the AI Service (src/lib/aiService.ts → /api/chat → OpenAI,
// streamed live). No key or provider detail ever lives in this component.
let msgId = 1;
const nextId = () => msgId++;

export const AiChat: React.FC<AiChatProps> = ({ open, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stepIndex, setStepIndex] = useState(0);      // which flow step we're on
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);   // guided-flow "thinking" dots
  const [streaming, setStreaming] = useState(false); // AI is streaming a reply
  const [done, setDone] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const convId = useRef<string>('');       // Firestore conversation id
  const convStarted = useRef(false);        // parent doc created yet?

  // Persist one exchange to Firebase — best-effort, never blocks the UI.
  const recordTurn = useCallback(async (userMessage: string, aiMessage: string) => {
    try {
      if (!convStarted.current) { await startConversation(convId.current); convStarted.current = true; }
      await saveChatTurn(convId.current, userMessage, aiMessage);
    } catch (e) {
      console.warn('Chat history save failed:', e);
    }
  }, []);

  const currentStep = stepIndex < CHAT_FLOW.length ? CHAT_FLOW[stepIndex] : null;
  // Free-text input is always available for AI questions, except while a reply
  // is in flight or the guided flow is mid-"typing".
  const textInputActive = !typing && !streaming;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    abortRef.current?.abort();
    abortRef.current = null;
  };

  // Post an assistant message after a short "typing" delay
  const botSay = useCallback((text: string, delay = 900) => {
    setTyping(true);
    const t = setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { id: nextId(), role: 'assistant', text }]);
    }, delay);
    timers.current.push(t);
  }, []);

  // Start / restart the whole conversation
  const startFlow = useCallback(() => {
    clearTimers();
    msgId = 1;
    convId.current = newConversationId();
    convStarted.current = false;
    setMessages([{ id: nextId(), role: 'assistant', text: WELCOME }]);
    setAnswers({});
    setStepIndex(0);
    setInput('');
    setDone(false);
    setTyping(false);
    setStreaming(false);
    // Ask the first question shortly after the welcome
    if (CHAT_FLOW.length > 0) botSay(CHAT_FLOW[0].question, 700);
  }, [botSay]);

  // (Re)start each time the panel opens; clean up timers when it closes
  useEffect(() => {
    if (open) {
      startFlow();
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
    clearTimers();
  }, [open, startFlow]);

  useEffect(() => () => clearTimers(), []);

  // Auto-scroll to newest message / typing indicator
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

  // Record an answer for the current step and advance to the next one
  const answerStep = (value: string) => {
    const text = value.trim();
    if (!text || typing || !currentStep) return;

    setMessages(prev => [...prev, { id: nextId(), role: 'user', text }]);
    setAnswers(prev => ({ ...prev, [currentStep.key]: text }));
    setInput('');

    const next = stepIndex + 1;
    setStepIndex(next);

    let botMessage: string;
    if (next < CHAT_FLOW.length) {
      botMessage = CHAT_FLOW[next].question;
      botSay(botMessage, 900);
    } else {
      // Flow complete — summarise using the answers collected so far
      const finalAnswers = { ...answers, [currentStep.key]: text };
      botMessage = buildSummary(finalAnswers);
      botSay(botMessage, 900);
      const t = setTimeout(() => setDone(true), 900);
      timers.current.push(t);
    }
    // Persist this guided exchange (user's choice → assistant's next message)
    recordTurn(text, botMessage);
  };

  // Send a free-text question to the AI and stream the reply into a bubble.
  const askAi = async (value: string) => {
    const text = value.trim();
    if (!text || streaming || typing) return;

    const userMsg: ChatMessage = { id: nextId(), role: 'user', text };
    const replyId = nextId();
    // Build the history to send BEFORE adding the empty reply bubble
    const history: ChatTurn[] = [...messages, userMsg]
      .filter(m => m.text !== WELCOME)
      .map(m => ({ role: m.role, content: m.text }));

    setMessages(prev => [...prev, userMsg, { id: replyId, role: 'assistant', text: '' }]);
    setInput('');
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let aiText = '';
    try {
      aiText = await streamAssistant({
        history,
        answers,
        signal: controller.signal,
        onToken: (chunk) => {
          setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: m.text + chunk } : m));
        },
      });
    } catch (err) {
      aiText = err instanceof AiUnavailableError
        ? "The AI assistant isn't switched on yet. Use the quick options above, or message on WhatsApp and Janish will reply personally. 🙌"
        : "Sorry — I couldn't reach the assistant just now. Please try again, or reach out on WhatsApp.";
      setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: aiText } : m));
    } finally {
      setStreaming(false);
      abortRef.current = null;
      // Persist this AI exchange (user's question → assistant's reply)
      recordTurn(text, aiText);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askAi(input);
    }
  };

  const whatsappHref =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppText(answers))}`;

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
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" /> Online · guided chat
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

              {/* Quick-reply buttons for the current option step */}
              {!typing && !done && currentStep?.type === 'options' && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap gap-2 pt-1"
                >
                  {currentStep.options!.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => answerStep(opt)}
                      className="px-3.5 py-2 rounded-full text-xs font-semibold border border-[#E50914]/40 bg-[#E50914]/10 text-white hover:bg-[#E50914]/20 hover:border-[#E50914] transition-all active:scale-95"
                    >
                      {opt}
                    </button>
                  ))}
                </motion.div>
              )}

              {/* Completion actions */}
              {done && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-2 pt-1"
                >
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-2xl bg-[#25D366] hover:bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <MessageCircle size={16} fill="currentColor" /> Send on WhatsApp
                  </a>
                  <button
                    onClick={startFlow}
                    className="w-full py-2.5 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                  >
                    <RotateCcw size={13} /> Start over
                  </button>
                </motion.div>
              )}
            </div>

            {/* Input bar — free-text questions go to the AI */}
            <div className="relative border-t border-white/10 px-3 py-3">
              <div className={`flex items-end gap-2 rounded-2xl border px-3 py-1.5 transition-all ${
                textInputActive ? 'border-white/10 bg-white/5 focus-within:border-[#E50914]/60' : 'border-white/5 bg-white/[0.02] opacity-60'
              }`}>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  disabled={!textInputActive}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={
                    streaming ? 'Assistant is replying…'
                    : 'Ask me anything…  (Shift+Enter for a new line)'
                  }
                  className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none py-2 max-h-[120px] no-scrollbar disabled:cursor-not-allowed"
                />
                <button
                  onClick={() => askAi(input)}
                  disabled={!textInputActive || !input.trim()}
                  aria-label="Send message"
                  className="w-9 h-9 mb-0.5 shrink-0 rounded-xl bg-[#E50914] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700 text-white flex items-center justify-center transition-all active:scale-95"
                >
                  <Send size={15} />
                </button>
              </div>
              <p className="text-center text-[10px] text-zinc-600 mt-2">Pick a quick option, or type your own question</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
