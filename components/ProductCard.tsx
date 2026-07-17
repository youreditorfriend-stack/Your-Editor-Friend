import React from 'react';
import { motion } from 'framer-motion';
import { Check, CreditCard, Download, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../src/lib/store';
import { formatPrice } from '../src/lib/store';
import { usePurchase } from '../src/lib/purchase';

export const ProductCard: React.FC<{ product: Product; index?: number }> = ({ product: p, index = 0 }) => {
  const { owns, claimFree, buy, isLoggedIn, paying } = usePurchase();
  const owned = owns(p.id);
  const detailPath = `/products/${p.id}`;

  React.useEffect(() => {
    import('../src/lib/analytics').then(({ trackImpression }) => {
      trackImpression(p.id);
    }).catch(err => console.warn(err));
  }, [p.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      className="group rounded-2xl md:rounded-3xl border border-white/5 bg-zinc-900/50 overflow-hidden hover:border-white/15 transition-all flex flex-col"
    >
      {/* Square (1080×1080) thumbnail — contained so nothing is ever cropped,
          on a neutral panel that suits transparent PNGs */}
      <Link
        to={detailPath}
        className="relative aspect-square overflow-hidden bg-zinc-950/60 block"
      >
        <img src={p.image} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
        {p.badge && (
          <span className="absolute top-3 left-3 bg-[#E50914] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            {p.badge}
          </span>
        )}
        <span className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${p.free ? 'bg-[#25D366] text-black' : 'bg-black/70 text-white border border-white/20'}`}>
          {p.free ? 'Free' : 'Paid'}
        </span>
      </Link>

      {/* Pricing list below thumbnail */}
      <div className="p-3.5 md:p-5 flex flex-col flex-1">
        <Link to={detailPath} className="block hover:text-white transition-colors">
          <h3 className="font-semibold text-sm md:text-base mb-1 leading-snug">{p.name}</h3>
        </Link>
        <p className="text-zinc-500 text-[11px] md:text-xs font-light mb-3 md:mb-4 flex-1">{p.tagline}</p>

        <div className="border-t border-white/5 pt-2.5 md:pt-3 mb-3 md:mb-4 space-y-1 md:space-y-1.5 text-xs md:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Price</span>
            <span className={`font-bold ${p.free ? 'text-[#25D366]' : 'text-white'}`}>{formatPrice(p.price)}</span>
          </div>
          {p.originalPrice ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Original</span>
                <span className="text-zinc-600 line-through">₹{p.originalPrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">You save</span>
                <span className="text-[#25D366] font-semibold">₹{(p.originalPrice - p.price).toLocaleString('en-IN')}</span>
              </div>
            </>
          ) : null}
        </div>

        {/* Action */}
        {owned ? (
          <Link
            to="/my-library"
            className="w-full py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 flex items-center justify-center gap-1.5 md:gap-2 hover:bg-[#25D366]/25 transition-all"
          >
            <Check size={14} /> Owned — Library
          </Link>
        ) : p.free ? (
          <button
            onClick={() => claimFree(p)}
            className="w-full py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold bg-[#25D366] text-black flex items-center justify-center gap-1.5 md:gap-2 hover:bg-green-400 transition-all"
          >
            {isLoggedIn ? <><Download size={14} /> Get Free</> : <><Lock size={13} /> Login to Get Free</>}
          </button>
        ) : (
          <button
            onClick={() => buy(p)}
            disabled={paying === p.id}
            className="w-full py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold bg-[#E50914] text-white flex items-center justify-center gap-1.5 md:gap-2 hover:bg-red-700 transition-all disabled:opacity-60"
          >
            {paying === p.id ? 'Opening payment…' : isLoggedIn ? <><CreditCard size={14} /> Buy Now</> : <><Lock size={13} /> Login to Buy</>}
          </button>
        )}
      </div>
    </motion.div>
  );
};
