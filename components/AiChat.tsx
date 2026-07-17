import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Sparkles, Send, X, MessageCircle, RotateCcw, Loader2, ArrowDown, Square, RefreshCw } from 'lucide-react';
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
  error?: boolean;   // AI reply failed — offer a retry
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
  const [typing, setTyping] = useState(false);        // guided-flow "thinking" dots
  const [streaming, setStreaming] = useState(false);  // AI reply in flight
  const [awaiting, setAwaiting] = useState(false);    // sent, waiting for 1st token
  const [done, setDone] = useState(false);
  const [atBottom, setAtBottom] = useState(true);     // is the list scrolled down?

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const convId = useRef<string>('');       // Firestore conversation id
  const convStarted = useRef(false);        // parent doc created yet?
  const messagesRef = useRef<ChatMessage[]>([]);   // latest messages for closures
  const atBottomRef = useRef(true);
  const dragControls = useDragControls();

  useEffect(() => { messagesRef.current = messages; }, [messages]);

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
  const busy = typing || streaming;
  const textInputActive = !busy;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    abortRef.current?.abort();
    abortRef.current = null;
  };

  // ---- Scrolling -----------------------------------------------------------
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior }));
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = near;
    setAtBottom(near);
  };

  // Follow new content only if the user is already near the bottom, so reading
  // history isn't interrupted by a streaming reply.
  useEffect(() => {
    if (atBottomRef.current) scrollToBottom('smooth');
  }, [messages, typing, awaiting, scrollToBottom]);

  // ---- Guided flow ---------------------------------------------------------
  const botSay = useCallback((text: string, delay = 900) => {
    setTyping(true);
    const t = setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { id: nextId(), role: 'assistant', text }]);
    }, delay);
    timers.current.push(t);
  }, []);

  const startFlow = useCallback(() => {
    clearTimers();
    msgId = 1;
    convId.current = newConversationId();
    convStarted.current = false;
    atBottomRef.current = true;
    setAtBottom(true);
    setMessages([{ id: nextId(), role: 'assistant', text: WELCOME }]);
    setAnswers({});
    setStepIndex(0);
    setInput('');
    setDone(false);
    setTyping(false);
    setStreaming(false);
    setAwaiting(false);
    if (CHAT_FLOW.length > 0) botSay(CHAT_FLOW[0].question, 700);
  }, [botSay]);

  // (Re)start on open; lock body scroll (mobile); clean up on close
  useEffect(() => {
    if (open) {
      startFlow();
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => { clearTimeout(t); document.body.style.overflow = prevOverflow; };
    }
    clearTimers();
  }, [open, startFlow]);

  useEffect(() => () => clearTimers(), []);

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

  const answerStep = (value: string) => {
    const text = value.trim();
    if (!text || busy || !currentStep) return;

    setMessages(prev => [...prev, { id: nextId(), role: 'user', text }]);
    setAnswers(prev => ({ ...prev, [currentStep.key]: text }));
    setInput('');
    atBottomRef.current = true; setAtBottom(true);

    const next = stepIndex + 1;
    setStepIndex(next);

    let botMessage: string;
    if (next < CHAT_FLOW.length) {
      botMessage = CHAT_FLOW[next].question;
      botSay(botMessage, 900);
    } else {
      const finalAnswers = { ...answers, [currentStep.key]: text };
      botMessage = buildSummary(finalAnswers);
      botSay(botMessage, 900);
      const t = setTimeout(() => setDone(true), 900);
      timers.current.push(t);
    }
    recordTurn(text, botMessage);
  };

  // ---- Free-text AI, with error handling + retry ---------------------------

  // Stream a reply for `question`, given the history to send. `replyId` is the
  // (already-inserted) empty assistant bubble to fill.
  const streamReply = async (question: string, history: ChatTurn[], replyId: number) => {
    setStreaming(true);
    setAwaiting(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let aiText = '';
    let firstToken = true;
    try {
      aiText = await streamAssistant({
        history,
        answers,
        signal: controller.signal,
        onToken: (chunk) => {
          if (firstToken) { firstToken = false; setAwaiting(false); }
          setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: m.text + chunk } : m));
        },
      });
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === 'AbortError') {
        return; // user stopped — keep whatever streamed, no error UI
      }
      if (err instanceof AiUnavailableError) {
        aiText = "The AI assistant isn't switched on yet. Use the quick options above, or message on WhatsApp and Janish will reply personally. 🙌";
        setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: aiText } : m));
      } else {
        aiText = "Sorry — I couldn't reach the assistant just now.";
        setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: aiText, error: true } : m));
      }
    } finally {
      setStreaming(false);
      setAwaiting(false);
      abortRef.current = null;
    }
    if (aiText) recordTurn(question, aiText);
  };

  const askAi = (value: string) => {
    const text = value.trim();
    if (!text || busy) return;

    const userMsg: ChatMessage = { id: nextId(), role: 'user', text };
    const replyId = nextId();
    const history: ChatTurn[] = [...messagesRef.current, userMsg]
      .filter(m => m.text !== WELCOME && !m.error)
      .map(m => ({ role: m.role, content: m.text }));

    setMessages(prev => [...prev, userMsg, { id: replyId, role: 'assistant', text: '' }]);
    setInput('');
    atBottomRef.current = true; setAtBottom(true);
    streamReply(text, history, replyId);
  };

  // Retry a failed reply: drop the errored bubble and re-ask the same question.
  const retry = (erroredId: number, question: string) => {
    const base = messagesRef.current.filter(m => m.id !== erroredId);
    const replyId = nextId();
    const history: ChatTurn[] = base
      .filter(m => m.text !== WELCOME && !m.error)
      .map(m => ({ role: m.role, content: m.text }));
    setMessages([...base, { id: replyId, role: 'assistant', text: '' }]);
    atBottomRef.current = true; setAtBottom(true);
    streamReply(question, history, replyId);
  };

  // Find the user question that preceded a given assistant message id
  const questionBefore = (assistantId: number): string => {
    const list = messagesRef.current;
    const idx = list.findIndex(m => m.id === assistantId);
    for (let i = idx - 1; i >= 0; i--) if (list[i].role === 'user') return list[i].text;
    return '';
  };

  const stop = () => { abortRef.current?.abort(); setStreaming(false); setAwaiting(false); };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAi(input); }
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
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.97 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_e, info) => { if (info.offset.y > 130 || info.velocity.y > 700) onClose(); }}
            className="relative w-full sm:max-w-md h-[88dvh] sm:h-[600px] max-h-[88dvh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-white/15 shadow-2xl"
            style={{
              background: 'rgba(17,17,17,0.72)',
              backdropFilter: 'blur(24px) saturate(140%)',
              WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            }}
          >
            {/* Ambient glow */}
            <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-[#E50914]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-purple-600/15 blur-3xl" />

            {/* Mobile drag handle (initiates drag-to-dismiss) */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="sm:hidden relative flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing touch-none"
            >
              <div className="w-10 h-1 rounded-full bg-white/25" />
            </div>

            {/* Header */}
            <div className="relative flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E50914] to-purple-600 flex items-center justify-center shadow-lg shadow-[#E50914]/20">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-tight">AI Assistant</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-[#25D366]"
                      animate={{ opacity: busy ? [0.4, 1, 0.4] : 1 }}
                      transition={{ duration: 1, repeat: busy ? Infinity : 0 }}
                    />
                    {streaming ? 'Typing…' : typing ? 'Thinking…' : 'Online'}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close chat"
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="relative flex-1 overflow-y-auto overscroll-contain px-4 py-5 space-y-3 no-scrollbar scroll-smooth"
            >
              <AnimatePresence initial={false}>
                {messages.map((m) => {
                  const isStreamingThis = streaming && m.role === 'assistant' && m.id === messages[messages.length - 1]?.id;
                  return (
                    <motion.div
                      key={m.id}
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                      className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[82%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl border ${
                          m.role === 'user'
                            ? 'bg-[#E50914] text-white border-transparent rounded-br-md'
                            : m.error
                            ? 'bg-[#2a0a0a] text-zinc-100 border-[#E50914]/40 rounded-bl-md'
                            : 'bg-white/5 text-zinc-100 border-white/10 rounded-bl-md'
                        }`}
                      >
                        {m.text}
                        {isStreamingThis && (
                          <motion.span
                            className="inline-block w-1.5 h-4 -mb-0.5 ml-0.5 rounded-sm bg-[#E50914] align-middle"
                            animate={{ opacity: [1, 0.2, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                          />
                        )}
                      </div>
                      {m.error && (
                        <button
                          onClick={() => retry(m.id, questionBefore(m.id))}
                          className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-[#E50914]/40 bg-[#E50914]/10 text-white hover:bg-[#E50914]/20 transition-all active:scale-95"
                        >
                          <RefreshCw size={12} /> Retry
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Loading dots — guided "thinking" OR awaiting first AI token */}
              <AnimatePresence>
                {(typing || awaiting) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
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
              <AnimatePresence>
                {!busy && !done && currentStep?.type === 'options' && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-wrap gap-2 pt-1"
                  >
                    {currentStep.options!.map((opt, i) => (
                      <motion.button
                        key={opt}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => answerStep(opt)}
                        className="px-3.5 py-2 rounded-full text-xs font-semibold border border-[#E50914]/40 bg-[#E50914]/10 text-white hover:bg-[#E50914]/20 hover:border-[#E50914] transition-all active:scale-95"
                      >
                        {opt}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

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

            {/* Scroll-to-bottom pill */}
            <AnimatePresence>
              {!atBottom && (
                <motion.button
                  initial={{ opacity: 0, y: 8, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.8 }}
                  onClick={() => scrollToBottom('smooth')}
                  aria-label="Scroll to latest"
                  className="absolute left-1/2 -translate-x-1/2 bottom-24 z-10 w-9 h-9 rounded-full bg-[#E50914] text-white shadow-lg shadow-black/40 flex items-center justify-center hover:bg-red-700 transition-colors"
                >
                  <ArrowDown size={16} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Input bar */}
            <div className="relative border-t border-white/10 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className={`flex items-end gap-2 rounded-2xl border px-3 py-1.5 transition-all ${
                textInputActive ? 'border-white/10 bg-white/5 focus-within:border-[#E50914]/60' : 'border-white/5 bg-white/[0.02]'
              }`}>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  disabled={!textInputActive}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  enterKeyHint="send"
                  placeholder={
                    streaming ? 'Assistant is replying…'
                    : typing ? 'One moment…'
                    : 'Ask me anything…  (Shift+Enter = new line)'
                  }
                  className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none py-2 max-h-[120px] no-scrollbar disabled:cursor-not-allowed"
                />
                {streaming ? (
                  <button
                    onClick={stop}
                    aria-label="Stop generating"
                    className="w-9 h-9 mb-0.5 shrink-0 rounded-xl bg-white/10 border border-white/15 text-white flex items-center justify-center hover:bg-white/20 transition-all active:scale-95"
                  >
                    <Square size={13} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    onClick={() => askAi(input)}
                    disabled={!textInputActive || !input.trim()}
                    aria-label="Send message"
                    className="w-9 h-9 mb-0.5 shrink-0 rounded-xl bg-[#E50914] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700 text-white flex items-center justify-center transition-all active:scale-95"
                  >
                    {awaiting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                )}
              </div>
              <p className="text-center text-[10px] text-zinc-600 mt-2">Pick a quick option, or type your own question</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
