import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MessageCircle, X } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../src/lib/site';

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ open, onClose }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', refLink: '', budget: '' });

  // Reset when reopened
  React.useEffect(() => {
    if (open) {
      setStep(0);
      setForm({ name: '', refLink: '', budget: '' });
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Modal Header */}
            <div className="relative px-8 pt-8 pb-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-[#E50914] font-bold mb-1">Let's Work Together</div>
                  <h3 className="text-2xl font-black tracking-tight text-white">Start Your Project</h3>
                </div>
                <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                  <X size={16} />
                </button>
              </div>
              {/* Step indicator */}
              <div className="flex gap-2 mt-5">
                {[0, 1, 2].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-[#E50914]' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>

            {/* Step 0 — Name */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="px-8 py-8">
                <div className="w-14 h-14 rounded-2xl bg-[#E50914]/10 border border-[#E50914]/20 flex items-center justify-center mb-6">
                  <span className="text-2xl">👋</span>
                </div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-3">Your Name *</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="உங்கள் பெயர் / Your name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' && form.name.trim()) setStep(1); }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-base outline-none focus:border-[#E50914] transition-all placeholder:text-zinc-700"
                />
                <button
                  onClick={() => { if (form.name.trim()) setStep(1); }}
                  disabled={!form.name.trim()}
                  className="mt-6 w-full bg-[#E50914] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all"
                >
                  Continue <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {/* Step 1 — Reference Reel */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="px-8 py-8">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
                  <span className="text-2xl">🎬</span>
                </div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-1">Reference Reel Link</label>
                <p className="text-zinc-600 text-xs mb-3">Optional — share a video you love as style reference</p>
                <input
                  autoFocus
                  type="url"
                  placeholder="https://instagram.com/... or YouTube link"
                  value={form.refLink}
                  onChange={e => setForm(f => ({ ...f, refLink: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') setStep(2); }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-base outline-none focus:border-purple-500 transition-all placeholder:text-zinc-700"
                />
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(0)} className="flex-1 bg-white/5 border border-white/10 text-zinc-400 py-4 rounded-2xl font-bold text-sm hover:bg-white/10 transition-all">
                    ← Back
                  </button>
                  <button onClick={() => setStep(2)} className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all">
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2 — Budget */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="px-8 py-8">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6">
                  <span className="text-2xl">💰</span>
                </div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-1">Your Budget</label>
                <p className="text-zinc-600 text-xs mb-3">Optional — helps us suggest the right plan for you</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Under ₹5,000', '₹5,000–₹10,000', '₹10,000–₹20,000', '₹20,000+', 'Not sure yet'].map(b => (
                    <button key={b} onClick={() => setForm(f => ({ ...f, budget: b }))}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${form.budget === b ? 'bg-[#25D366]/20 border-[#25D366] text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}`}>
                      {b}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or type your budget..."
                  value={['Under ₹5,000', '₹5,000–₹10,000', '₹10,000–₹20,000', '₹20,000+', 'Not sure yet'].includes(form.budget) ? '' : form.budget}
                  onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:border-[#25D366] transition-all placeholder:text-zinc-700"
                />
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(1)} className="flex-1 bg-white/5 border border-white/10 text-zinc-400 py-4 rounded-2xl font-bold text-sm hover:bg-white/10 transition-all">
                    ← Back
                  </button>
                  <a
                    href={(() => {
                      const msg = [
                        `Hi Janish! 👋 I'm interested in your video editing services.`,
                        ``,
                        `*Name:* ${form.name}`,
                        form.refLink ? `*Reference Reel:* ${form.refLink}` : null,
                        form.budget ? `*Budget:* ${form.budget}` : null,
                        ``,
                        `Looking forward to working with you! 🎬`,
                      ].filter(Boolean).join('\n');
                      return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      onClose();
                      // Save to Google Sheets
                      fetch('https://script.google.com/macros/s/AKfycbwqoWI2NEtCJIWxLIgWuSPRW6zk2C-14VYsvXyazbifRSiDCag9sziXHDac5rbCedST/exec', {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          source: 'Start Your Project Modal',
                          name: form.name,
                          whatsapp: '',
                          style: '',
                          quantity: '',
                          budget: form.budget || '',
                          refLink: form.refLink || '',
                          requirements: '',
                          total: '',
                          addons: '',
                        }),
                      }).catch(() => {});
                    }}
                    className="flex-[2] bg-[#25D366] hover:bg-green-600 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageCircle size={18} fill="currentColor" /> Send on WhatsApp
                  </a>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
