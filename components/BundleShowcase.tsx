import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bundle, bundleProducts, bundleValue, StoreData } from '../src/lib/store';
import { usePurchase } from '../src/lib/purchase';

// Fan positions for up to 4 stacked thumbnails (x%, y%, rotate°).
const FAN: [number, number, number][] = [[-38, -6, -12], [38, -6, 12], [-14, 4, -4], [14, 8, 4]];

// Big bundle block: stacked product art on the left, item list + anchor price
// + one-click buy on the right. Buying grants every product in the bundle.
export const BundleShowcase: React.FC<{ bundle: Bundle; store: StoreData }> = ({ bundle: b, store }) => {
  const { owns, buy, isLoggedIn, paying } = usePurchase();
  const items = bundleProducts(store, b);
  const value = bundleValue(items);
  const savePct = value > b.price ? Math.round(((value - b.price) / value) * 100) : 0;
  const owned = owns(b.id) || (items.length > 0 && items.every(p => owns(p.id)));
  if (items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      className="grid md:grid-cols-2 rounded-2xl md:rounded-[22px] overflow-hidden border border-white/[0.08] border-t-[3px] border-t-[#FF7A1A] bg-[#131313]"
    >
      {/* Stacked visual */}
      <div className="relative min-h-[280px] sm:min-h-[340px] md:min-h-[420px] bg-[#0e0e0e] grid place-items-center overflow-hidden">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7, type: 'spring', stiffness: 260, damping: 14 }}
          className="absolute top-4 left-4 z-10 bg-[#FF7A1A] text-black text-xs font-extrabold px-3 py-1.5 rounded-full"
        >
          {items.length} in 1
        </motion.span>
        {items.slice(0, 4).map((p, i) => {
          const [x, y, r] = FAN[i] || FAN[3];
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: '0%', y: '40%', rotate: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, x: `${x}%`, y: `${y}%`, rotate: r, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.15 + i * 0.12, ease: [0.2, 0.9, 0.2, 1] }}
              className="absolute w-[46%] md:w-[52%] max-w-[260px] rounded-xl overflow-hidden border border-[#333] shadow-[0_24px_50px_rgba(0,0,0,.7)]"
              style={{ zIndex: i === 3 ? 2 : 1 }}
            >
              <img src={p.image} alt="" className="block w-full aspect-[4/5] object-cover" />
            </motion.div>
          );
        })}
      </div>

      {/* Info */}
      <div className="p-5 sm:p-7 md:p-9 flex flex-col">
        <span className="self-start text-[11px] font-semibold tracking-[0.15em] text-[#FF7A1A] bg-[#FF7A1A]/[0.12] px-3 py-1.5 rounded-full">BUNDLE DEAL</span>
        <h2 className="text-2xl md:text-[32px] font-extrabold tracking-tight leading-tight mt-3">{b.name}</h2>
        {b.tagline && <p className="text-zinc-500 text-sm mt-1">{b.tagline}</p>}

        <div className="mt-5 mb-4 border-t border-white/[0.07]">
          {items.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 + i * 0.08 }}
            >
              <Link to={`/products/${p.id}`} className="flex items-center gap-3 py-2.5 border-b border-white/[0.07] text-sm hover:text-white text-zinc-300">
                <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                <span className="flex-1 truncate">{p.name}</span>
                {owns(p.id) ? (
                  <span className="text-[#3DDC84] text-xs flex items-center gap-1"><Check size={12} /> Owned</span>
                ) : (
                  <s className="text-zinc-500 text-xs">₹{p.price.toLocaleString('en-IN')}</s>
                )}
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            {value > b.price && (
              <div className="text-xs text-zinc-500 mb-1">Separately <s>₹{value.toLocaleString('en-IN')}</s></div>
            )}
            <div className="text-[34px] md:text-[38px] font-extrabold leading-none">₹{b.price.toLocaleString('en-IN')}</div>
          </div>
          {savePct > 0 && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 14 }}
              className="text-xs font-extrabold text-black bg-[#FF7A1A] px-2.5 py-1.5 rounded-lg"
            >
              SAVE {savePct}%
            </motion.span>
          )}
        </div>

        {owned ? (
          <Link to="/my-library" className="h-[52px] rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 bg-[#3DDC84]/15 text-[#3DDC84] border border-[#3DDC84]/30">
            <Check size={16} /> In your library
          </Link>
        ) : (
          <button
            onClick={() => buy(b)}
            disabled={paying === b.id}
            className="yef-shine h-[52px] rounded-xl font-bold text-[15px] bg-[#FF7A1A] text-black hover:brightness-110 active:scale-[.98] transition disabled:opacity-60"
          >
            {paying === b.id ? 'Opening payment…' : isLoggedIn ? `Get all ${items.length} — ₹${b.price.toLocaleString('en-IN')}` : `Login & get all ${items.length}`}
          </button>
        )}
        <div className="text-center text-xs text-zinc-500 mt-2.5">One payment · Every file in My Library</div>
      </div>
    </motion.section>
  );
};
