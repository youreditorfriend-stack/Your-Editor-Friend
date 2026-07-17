import React from 'react';
import { motion } from 'framer-motion';
import { Check, CreditCard, Download, Lock, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore, formatPrice } from '../src/lib/store';
import { usePurchase } from '../src/lib/purchase';

export const Courses: React.FC = () => {
  const { store, loading } = useStore();
  const { owns, claimFree, buy, isLoggedIn, paying } = usePurchase();
  const courses = (store?.courses || []).filter(c => c.enabled);

  return (
    <div className="px-6 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="text-center py-8 md:py-20">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#E50914] font-bold mb-3">Courses</div>
          <h1 className="text-2xl md:text-5xl font-semibold tracking-tight mb-3 md:mb-4">Learn editing, the practical way</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto font-light">
            Structured courses in Tamil — buy once, watch anytime from your library.
          </p>
        </div>

        {loading ? (
          <div className="text-center text-zinc-600 py-20">Loading courses…</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {courses.map((c, i) => {
              const owned = owns(c.id);
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group rounded-3xl border border-white/5 bg-zinc-900/50 overflow-hidden hover:border-white/15 transition-all flex flex-col"
                >
                  {/* YouTube-style 16:9 (1920×1080) thumbnail — contained, never cropped */}
                  <div className="relative aspect-video overflow-hidden bg-zinc-950/60">
                    <img src={c.thumbnail} alt={c.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-[#E50914]/90 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                        <Play size={26} fill="white" className="text-white ml-1" />
                      </div>
                    </div>
                    {c.badge && (
                      <span className="absolute top-3 left-3 bg-[#E50914] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                        {c.badge}
                      </span>
                    )}
                    <span className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${c.free ? 'bg-[#25D366] text-black' : 'bg-black/70 text-white border border-white/20'}`}>
                      {c.free ? 'Free' : 'Paid'}
                    </span>
                  </div>

                  <div className="p-5 md:p-8 flex flex-col flex-1">
                    <h2 className="text-lg md:text-2xl font-semibold mb-2">{c.title}</h2>
                    <p className="text-zinc-500 text-xs md:text-sm font-light mb-4 md:mb-6">{c.tagline}</p>

                    {/* Features */}
                    <ul className="space-y-2 md:space-y-2.5 mb-6 md:mb-8 flex-1">
                      {c.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2.5 md:gap-3 text-xs md:text-sm text-zinc-300">
                          <Check size={15} className="text-[#25D366] mt-0.5 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-3 mb-4 md:mb-5">
                      <span className={`text-2xl md:text-3xl font-bold ${c.free ? 'text-[#25D366]' : 'text-white'}`}>{formatPrice(c.price)}</span>
                      {c.originalPrice ? (
                        <>
                          <span className="text-zinc-600 line-through">₹{c.originalPrice.toLocaleString('en-IN')}</span>
                          <span className="text-[#25D366] text-sm font-semibold">
                            {Math.round((1 - c.price / c.originalPrice) * 100)}% off
                          </span>
                        </>
                      ) : null}
                    </div>

                    {/* Action */}
                    {owned ? (
                      <Link
                        to="/my-library"
                        className="w-full py-3.5 rounded-2xl text-base font-bold bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 flex items-center justify-center gap-2 hover:bg-[#25D366]/25 transition-all"
                      >
                        <Check size={17} /> Enrolled — Open Library
                      </Link>
                    ) : c.free ? (
                      <button
                        onClick={() => claimFree(c)}
                        className="w-full py-3.5 rounded-2xl text-base font-bold bg-[#25D366] text-black flex items-center justify-center gap-2 hover:bg-green-400 transition-all"
                      >
                        {isLoggedIn ? <><Download size={17} /> Enroll Free</> : <><Lock size={16} /> Login to Enroll Free</>}
                      </button>
                    ) : (
                      <button
                        onClick={() => buy(c)}
                        disabled={paying === c.id}
                        className="w-full py-3 md:py-3.5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold bg-[#E50914] text-white flex items-center justify-center gap-2 hover:bg-red-700 transition-all disabled:opacity-60"
                      >
                        {paying === c.id ? 'Opening payment…' : isLoggedIn ? <><CreditCard size={17} /> Buy This Course</> : <><Lock size={16} /> Login to Buy</>}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
