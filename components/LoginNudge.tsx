import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Course, Product } from '../src/lib/store';
import { formatPrice } from '../src/lib/store';
import { useAuth } from '../src/lib/auth';
import { usePurchase } from '../src/lib/purchase';

// For visitors arriving from a shared link who aren't logged in: after a few
// seconds, a small card explains that one Google login is all it takes, and
// the button logs them in and goes straight to payment / the free download.
export const LoginNudge: React.FC<{ item: Product | Course }> = ({ item }) => {
  const { user, loading } = useAuth();
  const { buy, claimFree, paying } = usePurchase();
  const [show, setShow] = useState(false);
  const key = `yef-nudge-${item.id}`;

  useEffect(() => {
    if (loading || user) { setShow(false); return; }
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(key) === '1'; } catch { /* ignore */ }
    if (dismissed) return;
    const t = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(t);
  }, [user, loading, key]);

  if (!show || user) return null;
  const close = () => { setShow(false); try { sessionStorage.setItem(key, '1'); } catch { /* ignore */ } };
  const image = 'image' in item ? item.image : item.thumbnail;
  const title = 'name' in item ? item.name : item.title;
  const free = !item.price;

  return (
    <div className="fixed z-[65] left-3 right-3 bottom-[118px] lg:left-auto lg:right-6 lg:bottom-6 lg:w-[380px] animate-[nudgeIn_.5s_cubic-bezier(.2,.8,.2,1)]">
      <style>{`@keyframes nudgeIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}`}</style>
      <div className="relative rounded-2xl border border-[#FF7A1A]/40 bg-[#141008] shadow-[0_24px_60px_rgba(0,0,0,.7)] p-4">
        <button onClick={close} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full grid place-items-center text-zinc-500 hover:text-white hover:bg-white/10" aria-label="Close"><X size={15} /></button>
        <div className="flex gap-3 items-center pr-6">
          {image && <img src={image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />}
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-wider text-[#FF7A1A]">NEW HERE?</div>
            <div className="text-sm font-bold leading-snug">Log in with Google once — get this in seconds.</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1"><b className="text-white">1</b> Google login</span>→
          <span className="flex items-center gap-1"><b className="text-white">2</b> {free ? 'Get free' : 'Pay by UPI'}</span>→
          <span className="flex items-center gap-1"><b className="text-white">3</b> Download</span>
        </div>
        <button
          onClick={() => (free ? claimFree(item) : buy(item))}
          disabled={paying === item.id}
          className="yef-shine mt-3 w-full h-12 rounded-xl bg-[#FF7A1A] text-black font-extrabold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden><path fill="#000" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5zM46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7c4.3-4 7.2-9.9 7.2-17.4zM10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1zM24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.2-8.5 2.2-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>
          {paying === item.id ? 'Opening…' : free ? 'Login & get it free' : `Login & buy — ${formatPrice(item.price)}`}
        </button>
      </div>
    </div>
  );
};
