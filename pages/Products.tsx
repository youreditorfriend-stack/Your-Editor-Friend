import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useStore } from '../src/lib/store';
import { getWhatsAppLink } from '../src/lib/site';
import { ProductCard } from '../components/ProductCard';

export const Products: React.FC = () => {
  const { store, loading } = useStore();
  const [activeCat, setActiveCat] = useState('all');

  const categories = (store?.productCategories || []).filter(c => c.enabled);
  const products = (store?.products || []).filter(p => p.enabled);
  const filtered = activeCat === 'all' ? products : products.filter(p => p.category === activeCat);

  return (
    <div className="px-6 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="text-center py-8 md:py-20">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#E50914] font-bold mb-3">Digital Products</div>
          <h1 className="text-2xl md:text-5xl font-semibold tracking-tight mb-3 md:mb-4">Tools that level up your edits</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto font-light">
            Presets, templates &amp; packs — login once, buy once, download anytime from your library.
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8 md:mb-12">
          {[{ id: 'all', label: 'All' }, ...categories].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`px-4 md:px-6 py-1.5 md:py-2 rounded-full border transition-all text-[10px] md:text-xs font-medium uppercase tracking-widest ${
                activeCat === cat.id ? 'border-white text-white bg-white/5' : 'border-transparent text-zinc-500 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products grid — square thumbnails, pricing below */}
        {loading ? (
          <div className="text-center text-zinc-600 py-20">Loading products…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-zinc-600 py-20 border border-dashed border-white/10 rounded-3xl">
            No products in this category yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}

        {/* Help CTA */}
        <div className="mt-20 text-center rounded-3xl border border-white/5 bg-zinc-900/30 py-12 px-6">
          <h2 className="text-xl md:text-2xl font-semibold mb-3">Not sure which one fits you?</h2>
          <p className="text-zinc-500 font-light mb-6">Message me — I'll suggest the right pack for your editing style.</p>
          <a
            href={getWhatsAppLink("Hi Janish! I need help choosing a product from your store.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-green-600 text-white px-8 py-3 rounded-full text-sm font-semibold transition-all"
          >
            <MessageCircle size={16} fill="currentColor" /> Ask on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};
