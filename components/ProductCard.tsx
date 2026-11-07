import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../src/lib/store';
import { formatPrice } from '../src/lib/store';
import { usePurchase } from '../src/lib/purchase';

// Store v2 card: image first at its OWN aspect ratio (16:9, 1:1, 4:5…) so it
// stacks in a masonry column layout; then title, rating, price. The whole card
// opens the detail page, where the one-click Buy lives.
export const ProductCard: React.FC<{ product: Product; index?: number }> = ({ product: p, index = 0 }) => {
  const { owns } = usePurchase();
  const owned = owns(p.id);
  const hasDiscount = !!p.originalPrice && p.originalPrice > p.price;

  React.useEffect(() => {
    import('../src/lib/analytics').then(({ trackImpression }) => {
      trackImpression(p.id);
    }).catch(err => console.warn(err));
  }, [p.id]);

  const badge = p.bestSeller ? 'Best seller' : p.isNew ? 'New' : p.trending ? 'Trending' : p.badge && !/^free$/i.test(p.badge) ? p.badge : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
      className="break-inside-avoid mb-3 md:mb-4"
    >
      <Link
        to={`/products/${p.id}`}
        className="group block rounded-xl md:rounded-2xl border border-white/[0.07] bg-[#131313] overflow-hidden hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
      >
        <div className="relative overflow-hidden bg-[#1b1b1b]">
          <img
            src={p.image}
            alt={p.name}
            loading="lazy"
            decoding="async"
            className="block w-full h-auto group-hover:scale-[1.03] transition-transform duration-500"
          />
          {badge && (
            <span className="absolute top-2 left-2 md:top-2.5 md:left-2.5 bg-[#FF7A1A] text-black text-[9px] md:text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md">
              {badge}
            </span>
          )}
          {!badge && p.free && (
            <span className="absolute top-2 left-2 md:top-2.5 md:left-2.5 bg-[#3DDC84] text-black text-[9px] md:text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md">
              Free
            </span>
          )}
          {p.promptKit && !owned && (
            <span className="absolute top-2 right-2 md:top-2.5 md:right-2.5 bg-black/75 text-[#FF7A1A] text-[9px] md:text-[10px] font-extrabold px-2 py-0.5 rounded-md">
              ✦ {p.promptKit.layers} LAYERS
            </span>
          )}
          {owned && (
            <span className="absolute top-2 right-2 md:top-2.5 md:right-2.5 bg-black/75 text-[#3DDC84] text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
              <Check size={10} /> Owned
            </span>
          )}
        </div>

        <div className="px-2.5 pt-2.5 pb-3 md:px-3.5 md:pt-3 md:pb-3.5">
          <h3 className="text-[13px] md:text-sm font-semibold leading-snug line-clamp-2 md:line-clamp-1">{p.name}</h3>
          {typeof p.rating === 'number' && p.rating > 0 && (
            <div className="flex items-center gap-1 mt-1 text-[11px] md:text-xs text-zinc-500">
              <Star size={11} fill="#ffc35a" className="text-[#ffc35a]" />
              <span className="text-[#ffc35a] font-semibold">{p.rating.toFixed(1)}</span>
              {!!p.reviewCount && <span>({p.reviewCount.toLocaleString('en-IN')})</span>}
            </div>
          )}
          <div className="flex items-center justify-between mt-2 md:mt-2.5 gap-2">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className={`font-extrabold text-[15px] md:text-[17px] ${p.free ? 'text-[#3DDC84]' : 'text-white'}`}>
                {formatPrice(p.price)}
              </span>
              {hasDiscount && (
                <span className="hidden sm:inline text-zinc-500 line-through text-xs">₹{p.originalPrice!.toLocaleString('en-IN')}</span>
              )}
            </div>
            <span className="text-[#FF7A1A] text-xs md:text-[13px] font-bold whitespace-nowrap group-hover:translate-x-0.5 transition-transform">
              {p.free ? 'Get →' : 'View →'}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

// Masonry wrapper: CSS columns let every card keep its own image ratio and
// auto-pack — 2 columns on phones, up to 4 on desktop.
export const ProductMasonry: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4">{children}</div>
);
