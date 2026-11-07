import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useStore, getProductCategories, sortByPinned } from '../src/lib/store';
import { getWhatsAppLink } from '../src/lib/site';
import { ProductCard, ProductMasonry } from '../components/ProductCard';
import { BundleShowcase } from '../components/BundleShowcase';

export const Products: React.FC = () => {
  const { store, loading } = useStore();
  const [activeCat, setActiveCat] = useState('all');

  const products = (store?.products || []).filter(p => p.enabled);
  const categories = (store?.productCategories || []).filter(c => c.enabled && products.some(p => getProductCategories(p).includes(c.id)));
  const hasFree = products.some(p => p.free);
  const filtered = sortByPinned(
    activeCat === 'all' ? products
      : activeCat === 'free' ? products.filter(p => p.free)
      : products.filter(p => getProductCategories(p).includes(activeCat))
  );
  const bundles = (store?.bundles || []).filter(b => b.enabled && b.productIds?.length);

  return (
    <div className="px-4 md:px-6 pb-24">
      <div className="max-w-[1200px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="text-center pt-6 pb-6 md:pt-14 md:pb-10">
          <span className="inline-block text-[11px] md:text-xs font-semibold tracking-[0.15em] text-[#FF7A1A] bg-[#FF7A1A]/[0.12] px-3.5 py-1.5 rounded-full">SHOP</span>
          <h1 className="text-[clamp(28px,7vw,48px)] font-extrabold tracking-tight leading-tight mt-3">Templates &amp; tools</h1>
          <p className="text-zinc-500 text-sm md:text-base mt-1">Buy once · download anytime from My Library</p>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:justify-center mb-5 md:mb-8">
          {[{ id: 'all', label: 'All' }, ...categories, ...(hasFree ? [{ id: 'free', label: 'Free' }] : [])].map(cat => (
            <button key={cat.id} onClick={() => setActiveCat(cat.id)}
              className={`shrink-0 whitespace-nowrap text-[13px] md:text-sm px-3.5 md:px-4 py-2 rounded-[10px] border transition ${
                activeCat === cat.id ? 'bg-white text-black border-white font-semibold' : 'border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/25'
              }`}>
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-zinc-600 py-20">Loading products…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-zinc-600 py-20 border border-dashed border-white/10 rounded-2xl">No products in this category yet.</div>
        ) : (
          <ProductMasonry>
            {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </ProductMasonry>
        )}

        {store && bundles.length > 0 && activeCat === 'all' && (
          <div className="mt-14 md:mt-20 space-y-8">
            {bundles.map(b => <BundleShowcase key={b.id} bundle={b} store={store} />)}
          </div>
        )}

        <div className="mt-14 md:mt-20 text-center rounded-2xl border border-white/[0.07] bg-[#131313] py-9 md:py-12 px-6">
          <h2 className="text-lg md:text-2xl font-bold mb-2">Not sure which one fits you?</h2>
          <p className="text-zinc-500 text-sm mb-5">Message me — I'll suggest the right pack.</p>
          <a href={getWhatsAppLink("Hi Janish! I need help choosing a product from your store.")} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:brightness-110 text-black px-6 h-11 rounded-xl text-sm font-bold transition">
            <MessageCircle size={16} fill="currentColor" /> Ask on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};
