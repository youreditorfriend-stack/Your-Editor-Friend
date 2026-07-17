import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Play, X } from "lucide-react";
import { useStore } from "../src/lib/store";
import type { Course, Product } from "../src/lib/store";
import { parseVideo } from "../src/lib/video";
import { renderMarkdown } from "../src/lib/markdown";
import { PurchaseCard } from "../components/PurchaseCard";
import { FaqAccordion } from "../components/FaqAccordion";
import { ProductCard } from "../components/ProductCard";
import { useDetailContext } from "../components/Layout";

type Kind = "product" | "course";

// Shared item detail page — one component, driven by `kind`.
// Renders left/right columns on desktop and a fixed bottom bar on mobile.
export const ItemDetail: React.FC<{ kind: Kind }> = ({ kind }) => {
  const { id = "" } = useParams<{ id: string }>();
  const { store, loading } = useStore();
  const navigate = useNavigate();
  const detail = useDetailContext();
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Ask the layout to hide its floating WhatsApp button — the mobile bottom
  // bar would sit on top of it otherwise.
  useEffect(() => {
    detail?.setDetailMode(true);
    return () => detail?.setDetailMode(false);
  }, [detail]);

  const list: (Product | Course)[] = (kind === "product" ? store?.products : store?.courses) || [];
  const item = list.find(x => x.id === id && x.enabled);

  // Similar items: same category first, then top up from the rest.
  // Computed here so the hook order stays stable across renders.
  const similar = useMemo(() => {
    if (!item) return [];
    if (kind === "product") {
      const p = item as Product;
      const same = (store?.products || []).filter(x => x.enabled && x.id !== p.id && x.category === p.category);
      const rest = (store?.products || []).filter(x => x.enabled && x.id !== p.id && x.category !== p.category);
      return [...same, ...rest].slice(0, 4);
    }
    return (store?.courses || []).filter(x => x.enabled && x.id !== item.id).slice(0, 4);
  }, [item, store, kind]);

  if (loading) {
    return <div className="text-center text-zinc-600 py-32">Loading…</div>;
  }
  if (!item) return <Navigate to={kind === "product" ? "/products" : "/courses"} replace />;

  const title = "name" in item ? item.name : item.title;
  const heroImage = "image" in item ? item.image : item.thumbnail;

  const aspect = kind === "product" ? "aspect-square" : "aspect-video";
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
            <div className={`relative w-full ${aspect} rounded-2xl overflow-hidden bg-zinc-950/60 border border-white/5`}>
              {preview.kind === "youtube" || preview.kind === "instagram" ? (
                <iframe
                  src={preview.embedUrl}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              ) : preview.kind === "file" ? (
                <video
                  src={preview.fileUrl}
                  poster={heroImage || undefined}
                  controls
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : heroImage ? (
                <img src={heroImage} alt={title} className="absolute inset-0 w-full h-full object-contain" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
                  <Play size={40} />
                </div>
              )}
              {item.badge && (
                <span className="absolute top-3 left-3 bg-[#E50914] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>

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
                      onClick={() => setLightbox(src)}
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
      {lightbox && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}
          className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
          >
            <X size={18} />
          </button>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      )}
    </div>
  );
};
