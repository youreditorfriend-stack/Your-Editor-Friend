import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Download, Flame, GraduationCap, Lock, Sparkles, Tag, Timer, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatPrice, getDiscountPercent, type Recommendation } from "../src/lib/store";
import { useFirstBuyerDiscount, usePurchase } from "../src/lib/purchase";
import { formatCountdown } from "./PurchaseCard";

const REASON_META: Record<Recommendation["reason"], { label: string; icon: React.ReactNode; toneClass: string }> = {
  free: { label: "Free download", icon: <Download size={11} />, toneClass: "bg-[#25D366]/15 text-[#25D366] border-[#25D366]/30" },
  "low-cost": { label: "Great add-on", icon: <Tag size={11} />, toneClass: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  course: { label: "Related course", icon: <GraduationCap size={11} />, toneClass: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  "best-seller": { label: "Best seller", icon: <Flame size={11} />, toneClass: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
};

// Post-purchase upsell popup — shown once, right after a purchase completes
// on the item detail page's PurchaseCard. Cards always wrap into a grid
// (never a horizontal scroller) and each carries its own quick buy/claim
// action so a second purchase is a single click, no navigation required.
export const PostPurchaseRecommendations: React.FC<{
  open: boolean;
  onClose: () => void;
  purchasedTitle: string;
  savedAmount?: number; // ₹ saved vs. strike-through price + discounts
  recommendations: Recommendation[];
}> = ({ open, onClose, purchasedTitle, savedAmount = 0, recommendations }) => {
  const navigate = useNavigate();
  const { owns, claimFree, buy, isLoggedIn, paying } = usePurchase();
  const firstBuyer = useFirstBuyerDiscount();

  // Still worth popping just for the savings flex when there is nothing
  // left to recommend.
  if (recommendations.length === 0 && savedAmount <= 0) return null;

  const goTo = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="w-full sm:max-w-2xl bg-zinc-950 border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-2xl shadow-black/60 max-h-[88vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur px-5 sm:px-7 pt-6 pb-4 border-b border-white/5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#25D366] mb-1.5">
                  <Sparkles size={11} /> Purchase complete
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                  {recommendations.length > 0 ? (
                    <>Nice pick! People who got <span className="text-[#E50914]">{purchasedTitle}</span> also grabbed these</>
                  ) : (
                    <>You now own <span className="text-[#E50914]">{purchasedTitle}</span> — find it in My Library</>
                  )}
                </h2>
                {savedAmount > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 px-3 py-1 text-xs font-bold text-[#25D366]">
                    🎉 You saved ₹{savedAmount.toLocaleString("en-IN")} on this purchase
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* First-time-buyer window: 25% off anything else for 5 minutes,
                applied automatically at checkout (server re-validates). */}
            {firstBuyer.active && (
              <div className="mx-5 sm:mx-7 mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-400">
                <Timer size={14} className="shrink-0" />
                <span>{firstBuyer.percent}% OFF everything below — first-purchase bonus</span>
                <span className="ml-auto font-mono text-sm">{formatCountdown(firstBuyer.remainingMs)}</span>
              </div>
            )}

            {/* Recommendations grid — always wraps, never a horizontal scroller */}
            <div className="p-5 sm:p-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recommendations.map((rec) => {
                const item = rec.item;
                const title = "name" in item ? item.name : item.title;
                const image = "image" in item ? item.image : item.thumbnail;
                const owned = owns(item.id);
                const detailPath = rec.kind === "product" ? `/products/${item.id}` : `/courses/${item.id}`;
                const reasonMeta = REASON_META[rec.reason];
                const originalPrice = rec.kind === "product" ? (item as any).originalPrice : undefined;
                const discountPercent = getDiscountPercent(item.price, originalPrice);

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden flex flex-col hover:border-white/15 transition-colors group"
                  >
                    <button onClick={() => goTo(detailPath)} className="relative aspect-[16/10] overflow-hidden bg-zinc-900 block w-full">
                      <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <span className={`absolute top-2 left-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${reasonMeta.toneClass}`}>
                        {reasonMeta.icon} {reasonMeta.label}
                      </span>
                      {discountPercent != null && (
                        <span className="absolute top-2 right-2 bg-[#E50914] text-white text-[9px] font-bold px-2 py-1 rounded-full">
                          -{discountPercent}%
                        </span>
                      )}
                    </button>
                    <div className="p-3.5 flex flex-col flex-1">
                      <button onClick={() => goTo(detailPath)} className="text-left">
                        <h3 className="font-semibold text-sm text-white line-clamp-1 hover:text-[#E50914] transition-colors">{title}</h3>
                      </button>
                      <p className="text-zinc-500 text-[11px] font-light mt-0.5 mb-3 line-clamp-2 flex-1">{item.tagline}</p>
                      <div className="flex items-center justify-between gap-2">
                        {firstBuyer.active && item.price > 0 && !owned ? (
                          <span className="flex items-baseline gap-1.5">
                            <span className="font-bold text-sm text-amber-400">
                              {formatPrice(Math.max(0, item.price - Math.round(item.price * (firstBuyer.percent / 100))))}
                            </span>
                            <span className="text-[10px] text-zinc-600 line-through">{formatPrice(item.price)}</span>
                          </span>
                        ) : (
                          <span className="font-bold text-sm text-white">
                            {formatPrice(item.price)}
                          </span>
                        )}
                        {owned ? (
                          <Link
                            to="/my-library"
                            onClick={onClose}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30"
                          >
                            Owned
                          </Link>
                        ) : item.price === 0 ? (
                          <button
                            onClick={() => claimFree(item)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#25D366] text-black hover:bg-green-400 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            {isLoggedIn ? <><Download size={12} /> Get free</> : <><Lock size={11} /> Login</>}
                          </button>
                        ) : (
                          <button
                            onClick={() => buy(item)}
                            disabled={paying === item.id}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#25D366] text-black hover:bg-green-400 transition-colors disabled:opacity-60 flex items-center gap-1 cursor-pointer"
                          >
                            {paying === item.id ? "…" : isLoggedIn ? <><CreditCard size={12} /> Buy now</> : <><Lock size={11} /> Login</>}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-7 pb-6 pt-1">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
