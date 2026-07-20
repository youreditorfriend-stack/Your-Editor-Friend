import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Play, X } from "lucide-react";
import { useStore, getProductCategories, isCourseLive } from "../src/lib/store";
import type { Course, Product } from "../src/lib/store";
import { parseVideo } from "../src/lib/video";
import { renderMarkdown } from "../src/lib/markdown";
import { PurchaseCard } from "../components/PurchaseCard";
import { FaqAccordion } from "../components/FaqAccordion";
import { ProductCard } from "../components/ProductCard";
import { useDetailContext } from "../components/Layout";
import { CommentsSection } from "../src/components/CommentsSection";
import { ReviewsSection } from "../components/ReviewsSection";

type Kind = "product" | "course";

// Shared item detail page — one component, driven by `kind`.
// Renders left/right columns on desktop and a fixed bottom bar on mobile.
export const ItemDetail: React.FC<{ kind: Kind }> = ({ kind }) => {
  const { id = "" } = useParams<{ id: string }>();
  const { store, loading } = useStore();
  const navigate = useNavigate();
  const detail = useDetailContext();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mainImageOpen, setMainImageOpen] = useState(false);

  // Track product view and count unique visits
  useEffect(() => {
    if (id) {
      import("../src/lib/analytics").then(({ trackView }) => trackView(id)).catch(err => console.warn(err));
    }
  }, [id]);

  // Ask the layout to hide its floating WhatsApp button — the mobile bottom
  // bar would sit on top of it otherwise.
  useEffect(() => {
    detail?.setDetailMode(true);
    return () => detail?.setDetailMode(false);
  }, [detail]);

  const list: (Product | Course)[] = (kind === "product" ? store?.products : store?.courses) || [];
  const item = list.find(x => x.id === id && x.enabled);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null || !item?.gallery?.length) return;
      if (e.key === "ArrowLeft") {
        setLightboxIndex(prev => prev !== null && prev > 0 ? prev - 1 : item.gallery!.length - 1);
      } else if (e.key === "ArrowRight") {
        setLightboxIndex(prev => prev !== null && prev < item.gallery!.length - 1 ? prev + 1 : 0);
      } else if (e.key === "Escape") {
        setLightboxIndex(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, item]);

  // Similar items: same category first, then top up from the rest.
  // Computed here so the hook order stays stable across renders.
  const similar = useMemo(() => {
    if (!item) return [];
    if (kind === "product") {
      const p = item as Product;
      const pCats = getProductCategories(p);
      const same = (store?.products || []).filter(x => x.enabled && x.id !== p.id && getProductCategories(x).some(c => pCats.includes(c)));
      const rest = (store?.products || []).filter(x => x.enabled && x.id !== p.id && !getProductCategories(x).some(c => pCats.includes(c)));
      return [...same, ...rest].slice(0, 4);
    }
    return (store?.courses || []).filter(x => x.enabled && isCourseLive(x) && x.id !== item.id).slice(0, 4);
  }, [item, store, kind]);

  if (loading) {
    return <div className="text-center text-zinc-600 py-32">Loading…</div>;
  }
  if (!item) return <Navigate to={kind === "product" ? "/products" : "/courses"} replace />;

  const title = "name" in item ? item.name : item.title;
  const heroImage = "image" in item ? item.image : item.thumbnail;

  const aspect = "aspect-video";
  const preview = parseVideo(item.previewVideo);

  const backTo = kind === "product" ? "/products" : "/courses";
  const backLabel = kind === "product" ? "All products" : "All courses";

  return (
    <div className="px-4 md:px-6 pb-28 lg:pb-24">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(backTo)}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={15} /> {backLabel}
        </button>

        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-10 xl:gap-14">
          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="min-w-0">
            {/* Preview */}
            {preview.kind !== "none" ? (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-950/60 border border-white/5">
                {preview.kind === "youtube" || preview.kind === "instagram" ? (
                  <iframe
                    id="product-preview-video-iframe"
                    src={preview.embedUrl}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full border-0"
                  />
                ) : (
                  <video
                    id="product-preview-video"
                    src={preview.fileUrl}
                    poster={heroImage || undefined}
                    controls
                    playsInline
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                )}
              </div>
            ) : (
              <div
                onClick={() => setMainImageOpen(true)}
                className="relative w-full aspect-square max-w-lg mx-auto lg:mx-0 rounded-2xl overflow-hidden bg-zinc-950/60 border border-white/5 cursor-zoom-in group/mainimg"
              >
                {heroImage ? (
                  <img src={heroImage} alt={title} className="absolute inset-0 w-full h-full object-cover group-hover/mainimg:scale-[1.02] transition-transform duration-300" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
                    <Play size={40} />
                  </div>
                )}
                {item.badge && (
                  <span className="absolute top-3 left-3 bg-[#E50914] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full z-10 shadow-lg">
                    {item.badge}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/mainimg:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-2">
                  <span>Click to preview actual ratio</span>
                </div>
              </div>
            )}

            {/* Title + tagline */}
            <div className="mt-6">
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#E50914] font-bold mb-2">
                {kind === "product" ? "Digital product" : "Course"}
              </div>
              <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-white leading-tight">{title}</h1>
              {item.tagline && (
                <p className="text-zinc-400 mt-3 font-light md:text-lg">{item.tagline}</p>
              )}
            </div>

            {/* Gallery strip */}
            {item.gallery && item.gallery.length > 0 && (
              <div className="mt-6 -mx-4 md:mx-0 px-4 md:px-0 overflow-x-auto no-scrollbar">
                <div className="flex gap-3 md:gap-4 w-max">
                  {item.gallery.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxIndex(i)}
                      className="shrink-0 w-40 md:w-48 aspect-square rounded-xl overflow-hidden border border-white/5 bg-zinc-950/60 hover:border-white/20 transition-colors"
                    >
                      <img src={src} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Course features fallback — pre-existing field on courses */}
            {kind === "course" && (item as Course).features?.length > 0 && !item.description && (
              <div className="mt-8">
                <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">What's inside</h2>
                <ul className="space-y-2.5">
                  {(item as Course).features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-zinc-300">
                      <span className="text-[#25D366] shrink-0 mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Description (markdown) */}
            {item.description && (
              <div className="mt-8">
                {renderMarkdown(item.description)}
              </div>
            )}

            {/* FAQ */}
            {item.faq && item.faq.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">Questions &amp; answers</h2>
                <FaqAccordion items={item.faq} />
              </div>
            )}

            {/* Buyer star ratings + scrolling feedback strip */}
            {kind === "product" && <ReviewsSection itemId={item.id} itemTitle={title} />}

            {/* Public Discussion / Comments Section */}
            <CommentsSection itemId={item.id} itemTitle={title} />

            {/* Similar items */}
            {similar.length > 0 && kind === "product" && (
              <div className="mt-12">
                <div className="flex items-end justify-between mb-6">
                  <h2 className="text-xl md:text-2xl font-semibold text-white">You might also like</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                  {(similar as Product[]).map((s, i) => (
                    <ProductCard key={s.id} product={s} index={i} />
                  ))}
                </div>
              </div>
            )}

            {similar.length > 0 && kind === "course" && (
              <div className="mt-12">
                <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">More courses</h2>
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                  {(similar as Course[]).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/courses/${c.id}`)}
                      className="group text-left rounded-2xl border border-white/5 bg-zinc-900/50 overflow-hidden hover:border-white/15 transition-all flex"
                    >
                      <img src={c.thumbnail} alt={c.title} className="w-40 aspect-video object-contain bg-zinc-950/60 shrink-0" />
                      <div className="p-4 flex-1">
                        <div className="font-semibold text-white line-clamp-2">{c.title}</div>
                        <div className="text-xs text-zinc-500 mt-1 line-clamp-1">{c.tagline}</div>
                        <div className="text-sm font-bold text-white mt-2 flex items-center gap-2">
                          {c.free ? "FREE" : `₹${c.price.toLocaleString("en-IN")}`}
                          <ArrowRight size={13} className="text-[#E50914] group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right column (desktop sticky) ───────────────────────────── */}
          <aside className="hidden lg:block">
            <div className="lg:sticky lg:top-28">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <PurchaseCard item={{ ...item, kind } as any} />
              </motion.div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <PurchaseCard item={{ ...item, kind } as any} compact />

      {/* Gallery lightbox */}
      {lightboxIndex !== null && item.gallery && item.gallery[lightboxIndex] && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setLightboxIndex(null); }}
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xl flex items-center justify-between p-4 md:p-10 select-none"
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-105 z-50 cursor-pointer"
          >
            <X size={20} />
          </button>

          {/* Left Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(prev => prev !== null && prev > 0 ? prev - 1 : item.gallery!.length - 1);
            }}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-all hover:scale-105 cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>

          {/* Main Image Container */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl h-full p-4 relative">
            <motion.img
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              src={item.gallery[lightboxIndex]}
              alt={`Screenshot ${lightboxIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            {/* Slide counter */}
            <div className="absolute bottom-2 text-zinc-400 font-mono text-sm tracking-wider">
              {lightboxIndex + 1} / {item.gallery.length}
            </div>
          </div>

          {/* Right Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(prev => prev !== null && prev < item.gallery!.length - 1 ? prev + 1 : 0);
            }}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-all hover:scale-105 cursor-pointer"
          >
            <ArrowRight size={24} />
          </button>
        </div>
      )}

      {/* Main Image Lightbox (Actual Aspect Ratio Preview) */}
      {mainImageOpen && heroImage && (
        <div
          onClick={() => setMainImageOpen(false)}
          className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 select-none cursor-zoom-out"
        >
          {/* Close button */}
          <button
            onClick={() => setMainImageOpen(false)}
            className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-105 z-50 cursor-pointer"
          >
            <X size={20} />
          </button>

          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            src={heroImage}
            alt={title}
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
          />
        </div>
      )}
    </div>
  );
};
