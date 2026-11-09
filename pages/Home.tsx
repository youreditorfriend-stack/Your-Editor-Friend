import React, { useMemo, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { ArrowRight, Youtube, Briefcase, Film, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore, usePageEnabled, sortByPinned, getProductCategories, isCourseLive, formatPrice, sectionOn } from '../src/lib/store';
import { YOUTUBE, useYouTubeStats, getWhatsAppLink } from '../src/lib/site';
import { ProductCard, ProductMasonry } from '../components/ProductCard';
import { BundleShowcase } from '../components/BundleShowcase';
import { TestimonialsStrip } from '../components/TestimonialsStrip';
import { HomeOfferCard } from '../components/HomeOfferCard';
import { useTitleCardOffer, ORIGINAL_HERO } from '../src/lib/titlecard';

const EASE = [0.2, 0.8, 0.2, 1] as const;

// Hero text: each line rises in, one after another.
const rise: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.05 + i * 0.11, ease: EASE } }),
};

// Hero fan of real product art: flies up, settles in a fan, spreads on hover.
const FAN = [
  { r: -10, y: 30, s: 1, hx: -46 },
  { r: -5, y: 8, s: 1, hx: -22 },
  { r: 0, y: 0, s: 1.12, hx: 0 },
  { r: 5, y: 8, s: 1, hx: 22 },
  { r: 10, y: 30, s: 1, hx: 46 },
];
const fanCard: Variants = {
  hidden: { opacity: 0, y: 120, rotate: 0, scale: 0.8, x: 0 },
  rest: (i: number) => ({
    opacity: 1, x: 0, y: FAN[i].y, rotate: FAN[i].r, scale: FAN[i].s,
    transition: { duration: 1, delay: 0.55 + i * 0.09, ease: [0.2, 0.9, 0.2, 1] },
  }),
  spread: (i: number) => ({
    opacity: 1, x: FAN[i].hx, y: FAN[i].y - 10, rotate: FAN[i].r, scale: FAN[i].s,
    transition: { duration: 0.35, ease: EASE },
  }),
};

const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[11px] sm:text-[13px] text-zinc-400 border border-white/[0.08] px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full whitespace-nowrap">
    <span className="text-[#FF7A1A]">✓</span> {children}
  </span>
);

const SectionHead: React.FC<{ title: string; sub?: string; to?: string; cta?: string }> = ({ title, sub, to, cta }) => (
  <div className="flex items-end justify-between gap-4 mb-4 md:mb-6">
    <div>
      <h2 className="text-[22px] md:text-[28px] font-extrabold tracking-tight">{title}</h2>
      {sub && <p className="text-zinc-500 text-[13px] md:text-sm mt-0.5">{sub}</p>}
    </div>
    {to && (
      <Link to={to} className="shrink-0 text-[13px] md:text-sm text-zinc-400 hover:text-white flex items-center gap-1 whitespace-nowrap">
        {cta || 'View all'} <ArrowRight size={14} />
      </Link>
    )}
  </div>
);

export const Home: React.FC = () => {
  const { store, loading } = useStore();
  const yt = useYouTubeStats();
  const isEnabled = usePageEnabled();
  const [cat, setCat] = useState('all');

  const showProducts = isEnabled('products');
  const showCourses = isEnabled('courses');
  const showServices = isEnabled('services');
  const showPortfolio = isEnabled('portfolio');
  const showYoutube = isEnabled('youtube');

  const products = useMemo(
    () => (showProducts ? sortByPinned((store?.products || []).filter(p => p.enabled)) : []),
    [store, showProducts]
  );
  const categories = (store?.productCategories || []).filter(c => c.enabled && products.some(p => getProductCategories(p).includes(c.id)));
  const hasFree = products.some(p => p.free);
  const filtered = cat === 'all' ? products : cat === 'free' ? products.filter(p => p.free) : products.filter(p => getProductCategories(p).includes(cat));
  const shown = filtered.slice(0, 12);

  // Fan: featured/best-sellers first, 5 cards, centre card = strongest product.
  // Admin can hand-pick the 5 fan products (Show / hide → Home → fan);
  // otherwise featured/best-sellers first. Centre card = first pick.
  const layout = store?.layout;
  const on = (k: string) => sectionOn(layout, "home", k);
  const fanPicks = useMemo(() => {
    const picked = (layout?.fanIds || []).map(id => products.find(p => p.id === id)).filter((p): p is (typeof products)[number] => !!p);
    const ranked = picked.length >= 3 ? picked : [...products].sort((a, b) => Number(!!b.featured || !!b.bestSeller) - Number(!!a.featured || !!a.bestSeller));
    const top = ranked.slice(0, 5);
    return top.length === 5 ? [top[3], top[1], top[0], top[2], top[4]] : top;
  }, [products, layout]);

  const bundles = on("bundles") ? (store?.bundles || [])
    .filter(b => b.enabled && b.productIds?.length)
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured))
    .slice(0, 2) : [];

  const { offer: tc, loaded: tcLoaded } = useTitleCardOffer();
  const hero = tc.hero || ORIGINAL_HERO;

  const courses = showCourses && on("courses") ? (store?.courses || []).filter(c => c.enabled).slice(0, 2) : [];

  return (
    <div className="px-4 md:px-6 pb-20 overflow-x-clip">
      <div className="max-w-[1200px] mx-auto">

        {/* ── HERO ── */}
        <section className="text-center pt-8 md:pt-16 pb-6 md:pb-10">
          <motion.span custom={0} variants={rise} initial="hidden" animate="show"
            className="inline-block text-[11px] md:text-xs font-semibold tracking-[0.15em] text-[#FF7A1A] bg-[#FF7A1A]/[0.12] px-3.5 py-1.5 rounded-full">
            {hero.tag}
          </motion.span>
          <motion.h1 custom={1} variants={rise} initial="hidden" animate="show"
            className="text-[clamp(32px,8.5vw,60px)] leading-[1.05] font-extrabold tracking-[-0.03em] mt-4 md:mt-5 mb-3">
            {hero.l1}<br /><span className="text-[#FF7A1A]">{hero.l2}</span>
          </motion.h1>
          <motion.p custom={2} variants={rise} initial="hidden" animate="show"
            className="text-zinc-400 text-[15px] md:text-[17px] max-w-md mx-auto">
            {hero.sub}
          </motion.p>

          <motion.div custom={3} variants={rise} initial="hidden" animate="show"
            className="flex gap-2.5 justify-center mt-6 md:mt-7 max-w-sm sm:max-w-none mx-auto">
            <a href="#shop"
              className="yef-shine flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-12 px-4 sm:px-6 rounded-xl bg-[#FF7A1A] text-black font-bold text-sm sm:text-[15px] whitespace-nowrap hover:brightness-110 active:scale-[.98] transition">
              Browse templates <ArrowRight size={16} />
            </a>
            {hasFree && (
              <a href="#shop" onClick={() => setCat('free')}
                className="flex-1 sm:flex-none inline-flex items-center justify-center h-12 px-4 sm:px-6 rounded-xl border border-white/10 bg-[#131313] font-bold text-sm sm:text-[15px] whitespace-nowrap hover:border-white/25 transition">
                Free packs
              </a>
            )}
          </motion.div>

          {showYoutube && (
            <motion.div custom={4} variants={rise} initial="hidden" animate="show"
              className="flex justify-center items-center gap-2 mt-5 text-[13px] text-zinc-500">
              <img src={yt.avatar} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full" />
              <span>Trusted by <b className="text-white">{yt.subscribers}</b> editors on YouTube</span>
            </motion.div>
          )}

          {tcLoaded && tc.homeCard?.on && tc.open !== false && (
            <motion.div custom={5} variants={rise} initial="hidden" animate="show"><HomeOfferCard offer={tc} /></motion.div>
          )}

          {/* Fan */}
          {on("fan") && fanPicks.length >= 3 && (
            <motion.div initial="hidden" animate="rest" whileHover="spread"
              className="flex justify-center items-end h-[180px] sm:h-[220px] md:h-[250px] mt-8 md:mt-12 mx-auto max-w-[900px]">
              {fanPicks.map((p, i) => (
                <motion.div key={p.id} custom={fanPicks.length === 5 ? i : i + 1} variants={fanCard}
                  className={`shrink-0 w-[30vw] max-w-[200px] -mx-[5vw] sm:-mx-6 rounded-xl md:rounded-2xl overflow-hidden border shadow-[0_20px_40px_rgba(0,0,0,.6)] ${
                    (fanPicks.length === 5 ? i : i + 1) === 2 ? 'border-[#FF7A1A] z-10' : 'border-[#333]'
                  } ${fanPicks.length === 5 && (i === 0 || i === 4) ? 'hidden sm:block' : ''}`}>
                  <Link to={`/products/${p.id}`} className="block yef-float" style={{ animationDelay: `${i * -1.1}s` }}>
                    <img src={p.image} alt={p.name} className="block w-full aspect-[4/5] object-cover" />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}

          {on("pills") && <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.7 }}
            className="flex flex-wrap gap-1.5 sm:gap-2.5 justify-center mt-8 md:mt-10">
            <Pill>Instant download</Pill><Pill>UPI / Card</Pill><Pill>Lifetime access</Pill><Pill>Secure checkout</Pill>
          </motion.div>}
        </section>

        {/* ── SHOP ── */}
        {showProducts && on("shop") && (
          <section id="shop" className="scroll-mt-28 pt-8 md:pt-12">
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap mb-4 md:mb-6">
              {[{ id: 'all', label: 'All' }, ...categories, ...(hasFree ? [{ id: 'free', label: 'Free' }] : [])].map(c => (
                <button key={c.id} onClick={() => setCat(c.id)}
                  className={`shrink-0 whitespace-nowrap text-[13px] md:text-sm px-3.5 md:px-4 py-2 rounded-[10px] border transition ${
                    cat === c.id ? 'bg-white text-black border-white font-semibold' : 'border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/25'
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center text-zinc-600 py-16">Loading…</div>
            ) : shown.length === 0 ? (
              <div className="text-center text-zinc-600 py-16 border border-dashed border-white/10 rounded-2xl">Nothing here yet.</div>
            ) : (
              <ProductMasonry>
                {shown.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </ProductMasonry>
            )}

            {filtered.length > shown.length && (
              <div className="text-center mt-4">
                <Link to="/products" className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl border border-white/10 bg-[#131313] text-sm font-semibold hover:border-white/25">
                  See all {filtered.length} <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </section>
        )}

        {/* ── BUNDLES ── */}
        {store && bundles.length > 0 && (
          <div className="mt-16 md:mt-24 space-y-8">
            {bundles.map(b => <BundleShowcase key={b.id} bundle={b} store={store} />)}
          </div>
        )}

        {/* ── COURSES ── */}
        {courses.length > 0 && (
          <section className="mt-16 md:mt-24">
            <SectionHead title="Courses" sub="Learn the full workflow, in Tamil." to="/courses" />
            <div className="grid sm:grid-cols-2 gap-3 md:gap-5">
              {courses.map((c, i) => {
                const live = isCourseLive(c);
                return (
                  <motion.div key={c.id}
                    initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
                    className="flex items-center gap-3 md:gap-4 rounded-2xl border border-white/[0.08] bg-[#131313] p-3 md:p-4">
                    <img src={c.thumbnail} alt="" className="w-24 md:w-32 aspect-video object-cover rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0">
                      {!live && <span className="text-[10px] font-bold tracking-wide text-zinc-400 border border-zinc-600 px-1.5 py-0.5 rounded">COMING SOON</span>}
                      <h3 className="text-[15px] md:text-base font-bold leading-snug mt-1 line-clamp-2">{c.title}</h3>
                      {live && <div className="text-sm font-extrabold mt-0.5">{formatPrice(c.price)}</div>}
                    </div>
                    {live ? (
                      <Link to={`/courses/${c.id}`} className="shrink-0 text-[13px] font-bold text-[#FF7A1A] whitespace-nowrap">View →</Link>
                    ) : (
                      <a href={getWhatsAppLink(`Hi Janish! Notify me when "${c.title}" launches.`)} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 text-[12px] md:text-[13px] font-bold px-3 py-2 rounded-lg border border-[#FF7A1A] text-[#FF7A1A] whitespace-nowrap">
                        <Bell size={13} /> Notify me
                      </a>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── REVIEWS (text, voice notes, screenshots added from admin) ── */}
        {on("reviews") && <TestimonialsStrip />}

        {/* ── CREATOR STRIP (portfolio / YouTube / services live here, secondary) ── */}
        {on("creator") && <motion.section
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: EASE }}
          className="mt-16 md:mt-24 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 border-y border-white/[0.08] py-6 md:py-7">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <img src={yt.avatar} alt="Janish" referrerPolicy="no-referrer" className="w-14 h-14 md:w-16 md:h-16 rounded-full shrink-0" />
            <div className="min-w-0">
              <h3 className="text-base md:text-lg font-bold">Made by Janish — Your Editor Friend</h3>
              <p className="text-zinc-500 text-[13px] md:text-sm">{yt.subscribers} on YouTube · Tamil editing tutorials</p>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:flex gap-2">
            {showPortfolio && (
              <Link to="/portfolio" className="inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-3 md:px-4 rounded-xl border border-white/10 bg-[#131313] text-[13px] font-semibold whitespace-nowrap hover:border-white/25">
                <Film size={14} /> Portfolio
              </Link>
            )}
            <a href={YOUTUBE.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-3 md:px-4 rounded-xl border border-white/10 bg-[#131313] text-[13px] font-semibold whitespace-nowrap hover:border-white/25">
              <Youtube size={14} /> YouTube
            </a>
            {showServices && (
              <Link to="/services" className="inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-3 md:px-4 rounded-xl border border-white/10 bg-[#131313] text-[13px] font-semibold whitespace-nowrap hover:border-white/25">
                <Briefcase size={14} /> Hire me
              </Link>
            )}
          </div>
        </motion.section>}
      </div>
    </div>
  );
};
