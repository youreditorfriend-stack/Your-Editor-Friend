import React, { useRef, useState } from 'react';
import { Pause, Play, Star } from 'lucide-react';
import { useTestimonials, type Testimonial } from '../src/lib/testimonials';

const SRC: Record<string, string> = { whatsapp: 'via WhatsApp', instagram: 'via Instagram', email: 'via email', site: 'verified buyer', other: '' };

const Voice: React.FC<{ url: string }> = ({ url }) => {
  const ref = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);
  const [p, setP] = useState(0);
  return (
    <div className="flex items-center gap-3 mt-2">
      <button
        onClick={() => { const a = ref.current; if (!a) return; if (a.paused) { document.querySelectorAll('audio').forEach(x => x !== a && x.pause()); a.play(); } else a.pause(); }}
        className="w-11 h-11 rounded-full bg-[#FF7A1A] text-black grid place-items-center shrink-0" aria-label={on ? 'Pause voice note' : 'Play voice note'}>
        {on ? <Pause size={18} fill="#000" /> : <Play size={18} fill="#000" className="ml-0.5" />}
      </button>
      <div className="flex-1 flex items-center gap-[3px] h-8">
        {Array.from({ length: 28 }).map((_, i) => (
          <i key={i} className="flex-1 rounded-full transition-colors" style={{ height: `${30 + Math.abs(Math.sin(i * 1.7)) * 70}%`, background: i / 28 < p ? '#FF7A1A' : '#3a3a3a' }} />
        ))}
      </div>
      <audio ref={ref} src={url} preload="none" onPlay={() => setOn(true)} onPause={() => setOn(false)}
        onEnded={() => { setOn(false); setP(0); }} onTimeUpdate={e => { const a = e.currentTarget; setP(a.duration ? a.currentTime / a.duration : 0); }} />
    </div>
  );
};

const Card: React.FC<{ t: Testimonial }> = ({ t }) => (
  <figure className="w-[290px] md:w-[330px] shrink-0 rounded-2xl border border-white/[0.08] bg-[#131313] p-4 flex flex-col">
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-full bg-[#FF7A1A]/20 text-[#FF7A1A] grid place-items-center font-extrabold text-sm">{(t.name || '?')[0].toUpperCase()}</div>
      <div className="min-w-0">
        <b className="block text-sm truncate">{t.name}</b>
        <small className="text-[11px] text-zinc-500">{SRC[t.source] || ''}{t.productName ? ` · ${t.productName}` : ''}</small>
      </div>
      {!!t.rating && (
        <span className="ml-auto flex gap-0.5 shrink-0">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={12} fill="#ffc35a" className="text-[#ffc35a]" />)}</span>
      )}
    </div>
    {t.text && <blockquote className="text-[14px] text-zinc-200 leading-relaxed mt-3 line-clamp-5">“{t.text}”</blockquote>}
    {t.audioUrl && <Voice url={t.audioUrl} />}
    {t.imageUrl && <img src={t.imageUrl} alt="" loading="lazy" className="mt-3 rounded-xl max-h-56 w-full object-cover object-top border border-white/[0.06]" />}
  </figure>
);

// Auto-scrolling row of featured reviews (pauses on hover/touch).
export const TestimonialsStrip: React.FC = () => {
  const { list } = useTestimonials(true);
  if (list.length === 0) return null;
  const loop = list.length >= 3 ? [...list, ...list] : list;
  return (
    <section className="mt-16 md:mt-24">
      <div className="flex items-end justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h2 className="text-[22px] md:text-[28px] font-extrabold tracking-tight">What editors say</h2>
          <p className="text-zinc-500 text-[13px] md:text-sm mt-0.5">Real messages and voice notes from buyers.</p>
        </div>
      </div>
      <div className="-mx-4 md:mx-0 overflow-hidden">
        <div className={`flex gap-3 md:gap-4 px-4 md:px-0 w-max items-start ${list.length >= 3 ? 'animate-[marquee_60s_linear_infinite] hover:[animation-play-state:paused] active:[animation-play-state:paused]' : ''}`}>
          {loop.map((t, i) => <Card key={`${t.id}-${i}`} t={t} />)}
        </div>
      </div>
    </section>
  );
};
