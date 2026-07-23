import React from 'react';
import { ArrowRight, Youtube, ShoppingBag, Briefcase, ExternalLink } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore, formatPrice, usePageEnabled } from '../src/lib/store';
import { YOUTUBE, youtubeThumb, useYouTubeStats } from '../src/lib/site';
import { ProductCard } from '../components/ProductCard';
import { ServiceList } from '../components/ServiceList';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { store } = useStore();
  const yt = useYouTubeStats();
  const isEnabled = usePageEnabled();

  const showProducts = isEnabled('products');
  const showServices = isEnabled('services');
  const showYoutube = isEnabled('youtube');

  const products = showProducts ? (store?.products || []).filter(p => p.enabled) : [];
  // Duplicate list so the marquee loops seamlessly
  const marqueeItems = [...products, ...products];

  return (
    <div>
      {/* ── Scrolling products strip (replaces old hero) ── */}
      <section className="relative pt-6 pb-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#E50914]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 text-center mb-6 md:mb-8 px-6">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#E50914] font-bold mb-2">Your Editor Friend</div>
          <h1 className="text-lg md:text-3xl font-semibold tracking-tight">Editing products, courses &amp; services — all in one place</h1>
        </div>

        {/* Marquee */}
        {products.length > 0 && (
          <div className="relative">
            <div className="flex gap-3 md:gap-5 w-max animate-[marquee_35s_linear_infinite] hover:[animation-play-state:paused]">
              {marqueeItems.map((p, i) => (
                <Link
                  key={`${p.id}-${i}`}
                  to={`/products/${p.id}`}
                  className="group w-36 md:w-56 shrink-0 rounded-xl md:rounded-2xl border border-white/5 bg-zinc-900/60 overflow-hidden hover:border-white/20 transition-all"
                >
                  <div className="relative aspect-square overflow-hidden bg-zinc-950/60">
                    <img src={p.image} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                    <span className={`absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${p.free ? 'bg-[#25D366] text-black' : 'bg-black/70 text-white border border-white/20'}`}>
                      {p.free ? 'Free' : 'Paid'}
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="text-xs md:text-sm font-semibold truncate">{p.name}</div>
                    <div className={`text-xs font-bold mt-0.5 ${p.free ? 'text-[#25D366]' : 'text-[#E50914]'}`}>{formatPrice(p.price)}</div>
                  </div>
                </Link>
              ))}
            </div>
            {/* Edge fades */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-[#0A0A0A] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-[#0A0A0A] to-transparent" />
          </div>
        )}

        {/* CTA buttons */}
        <div className="relative z-10 flex flex-row items-center justify-center gap-2.5 md:gap-4 mt-8 md:mt-10 px-4">
          {showProducts && (
            <button
              onClick={() => navigate('/products')}
              className="bg-[#E50914] hover:bg-red-700 text-white px-5 md:px-10 py-3 md:py-4 rounded-full text-xs md:text-base font-medium flex items-center justify-center gap-1.5 md:gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-red-900/10"
            >
              <ShoppingBag size={16} /> Explore Products
            </button>
          )}
          {showServices && (
            <button
              onClick={() => navigate('/services')}
              className="bg-white text-black hover:bg-zinc-200 px-5 md:px-10 py-3 md:py-4 rounded-full text-xs md:text-base font-medium flex items-center justify-center gap-1.5 md:gap-2 transition-all transform hover:scale-105 active:scale-95"
            >
              <Briefcase size={16} /> Get My Services
            </button>
          )}
        </div>
      </section>

      {/* ── Products (top) ── */}
      {showProducts && (
      <section className="py-10 md:py-16 px-4 md:px-6 bg-[#080808]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-6 md:mb-10">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#E50914] font-bold mb-2">Digital Products</div>
              <h2 className="text-2xl md:text-4xl font-semibold tracking-tight">Featured Products</h2>
            </div>
            <Link to="/products" className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {products.filter(p => p.featured).slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ── Services (below products) ── */}
      {showServices && (
      <section className="py-10 md:py-16 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-6 md:mb-10">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#E50914] font-bold mb-2">Freelance Editing</div>
              <h2 className="text-2xl md:text-4xl font-semibold tracking-tight">My Services</h2>
            </div>
            <Link to="/services" className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap">
              All services <ArrowRight size={14} />
            </Link>
          </div>

          <ServiceList to="/services" />
        </div>
      </section>
      )}

      {/* ── YouTube Channel Banner ── */}
      {showYoutube && (
      <section className="py-10 md:py-16 px-4 md:px-6 bg-[#080808]">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900/80 to-[#1a0505] overflow-hidden">
            <div className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
              <img
                src={yt.avatar}
                alt="Your Editor Friend YouTube channel"
                referrerPolicy="no-referrer"
                className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#E50914]/30"
              />
              <div className="flex-1 text-center md:text-left">
                <div className="text-[10px] uppercase tracking-[0.25em] text-[#E50914] font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
                  <Youtube size={14} /> YouTube Channel
                </div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">Your Editor Friend</h2>
                <p className="text-zinc-400 font-light text-sm md:text-base mb-4">
                  {yt.subscribers} subscribers · {yt.videoCount} videos — Tamil video editing tutorials, tips &amp; breakdowns.
                </p>
                <a
                  href={`${YOUTUBE.url}?sub_confirmation=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#E50914] hover:bg-red-700 text-white px-8 py-3 rounded-full text-sm font-semibold transition-all"
                >
                  <Youtube size={16} /> Subscribe
                </a>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-px bg-white/5">
              {yt.latestVideoIds.slice(0, 3).map(id => (
                <a
                  key={id}
                  href={`https://www.youtube.com/watch?v=${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-video overflow-hidden bg-black"
                >
                  <img src={youtubeThumb(id)} alt="Latest video" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/60 rounded-full p-3"><ExternalLink size={18} /></div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
      )}
    </div>
  );
};
