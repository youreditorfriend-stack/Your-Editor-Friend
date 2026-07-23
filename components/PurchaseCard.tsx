import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, CreditCard, Download, Link as LinkIcon, Lock, Tag, Timer, X, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { applyCoupon, DEFAULT_CHECKOUT_HELP, formatPrice, getFreeAssetsClaimId, getPostPurchaseRecommendations, hasFreeAssets, isCourseLive, useStore } from "../src/lib/store";
import type { Course, Product } from "../src/lib/store";
import { preloadRazorpay, useFirstBuyerDiscount, usePurchase } from "../src/lib/purchase";
import { useAuth } from "../src/lib/auth";
import { getWhatsAppLink } from "../src/lib/site";
import { fireSuccessConfetti } from "../src/lib/confetti";
import { PostPurchaseRecommendations } from "./PostPurchaseRecommendations";

// The purchase card lives on every item detail page.
// - Desktop: rendered sticky in the right column.
// - Mobile: a shorter version rendered as a fixed bottom bar (see `compact`).
// Terms sit directly above the buy button in both layouts — that's what the
// user asked for and it's also just good conversion hygiene.
export const PurchaseCard: React.FC<{
  item: (Product | Course) & { kind: "product" | "course" };
  compact?: boolean;
}> = ({ item, compact = false }) => {
  const { store } = useStore();
  const { profile, signIn } = useAuth();
  const { owns, claimFree, claimFreeAssets, buy, isLoggedIn, paying, checkoutFailed } = usePurchase();
  const firstBuyer = useFirstBuyerDiscount();
  const owned = owns(item.id);
  const freeAssetsClaimed = item.kind === "product" && owns(getFreeAssetsClaimId(item.id));

  // Start fetching Razorpay's checkout.js as soon as this card mounts for a
  // purchasable paid item, so it's already loaded by the time the buyer
  // actually clicks Buy — removes that network fetch from the click path.
  useEffect(() => {
    if (!owned && !item.free) preloadRazorpay();
  }, [owned, item.free]);

  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; final: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCoupon, setShowCoupon] = useState(!compact);
  const [termsCollapsed, setTermsCollapsed] = useState(true);
  const [showRecs, setShowRecs] = useState(false);

  // Detect a purchase completing (free claim writes instantly; a paid buy
  // flips `owned` once the live purchases listener catches the server-side
  // grant) and celebrate — confetti + a cross-sell popup, only from the full
  // (non-compact) card, since both the desktop and mobile variants of this
  // component are always mounted together on the item page.
  // Sequenced success flow: confetti fires immediately, then the cross-sell
  // popup slides in after a short beat so the celebration lands first.
  const wasOwnedRef = useRef(owned);
  const recsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const justPurchased = !wasOwnedRef.current && owned;
    wasOwnedRef.current = owned;
    if (justPurchased && !compact) {
      fireSuccessConfetti();
      recsTimerRef.current = setTimeout(() => setShowRecs(true), 2500);
    }
  }, [owned, compact]);
  useEffect(() => () => { if (recsTimerRef.current) clearTimeout(recsTimerRef.current); }, []);

  const recommendations = getPostPurchaseRecommendations(store, item.id, profile?.purchases || []);

  const title = "name" in item ? item.name : item.title;

  const price = item.price;
  // Mirrors /api/create-order: coupon vs the automatic first-buyer 25% —
  // whichever discount is larger wins, they never stack.
  const couponDiscount = applied ? applied.discount : 0;
  const firstBuyerDiscount =
    firstBuyer.active && !owned && !item.free
      ? Math.round(price * (firstBuyer.percent / 100))
      : 0;
  const activeDiscount = Math.max(couponDiscount, firstBuyerDiscount);
  const firstBuyerWins = firstBuyerDiscount > couponDiscount;
  const finalPrice = Math.max(0, price - activeDiscount);
  const saved =
    (item.originalPrice ? item.originalPrice - price : 0) + activeDiscount;

  const checkoutHelp = store?.checkoutHelp || DEFAULT_CHECKOUT_HELP;
  const helpText = checkoutHelp.message
    .replace(/\{price\}/g, finalPrice.toLocaleString("en-IN"))
    .replace(/\{phone\}/g, checkoutHelp.phone);
  // Only after this purchase attempt actually failed (Razorpay unconfigured,
  // script blocked, verification error) — never as a permanent block.
  const showCheckoutHelp = !owned && !item.free && checkoutFailed === item.id;

  const doApply = () => {
    setCouponError("");
    const result = applyCoupon(price, code, store?.coupons || [], item.id);
    if (!result.ok) {
      setCouponError(result.error || "That coupon can't be used");
      setApplied(null);
      return;
    }
    setApplied({ code: (result.coupon?.code || code).toUpperCase(), discount: result.discount, final: result.price });
  };

  const clearCoupon = () => {
    setApplied(null);
    setCode("");
    setCouponError("");
  };

  const share = async () => {
    const url = `${window.location.origin}/${item.kind === "product" ? "products" : "courses"}/${item.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch { /* user dismissed */ }
  };

  const defaultTerms =
    "By completing this purchase you agree that digital products are non-refundable, and that the file is for your personal use only.";

  // ── Compact (mobile bottom bar) ─────────────────────────────────────────────
  if (compact) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/10">
        <AnimatePresence>
          {showCoupon && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-white/5"
            >
              <div className="px-4 py-3">
                <CouponBox
                  code={code}
                  onCode={setCode}
                  applied={applied}
                  error={couponError}
                  onApply={doApply}
                  onClear={clearCoupon}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!owned && (
          <div className="px-4 py-1.5 border-b border-white/5 bg-zinc-950/20 text-[10px] text-zinc-500">
            <span className="leading-tight">
              By purchasing you agree to the{" "}
              <button
                type="button"
                onClick={() => setTermsCollapsed(!termsCollapsed)}
                className="text-[#E50914] hover:underline font-semibold inline-flex items-center gap-0.5"
              >
                Terms &amp; Conditions
                {termsCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              </button>
            </span>

            <AnimatePresence initial={false}>
              {!termsCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 6 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-lg border border-white/5 bg-black/20 p-2 text-[10px] text-zinc-500 leading-normal">
                    {item.terms || defaultTerms}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex items-center gap-3 p-3">
          <div className="min-w-0">
            <div className="text-lg font-bold text-white">
              {formatPrice(finalPrice)}
            </div>
            {item.originalPrice && item.originalPrice > finalPrice && (
              <div className="text-[11px] text-zinc-500 line-through">₹{item.originalPrice.toLocaleString("en-IN")}</div>
            )}
          </div>
          <button
            onClick={() => setShowCoupon(v => !v)}
            className="shrink-0 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
            aria-label="Toggle coupon"
          >
            <Tag size={16} />
          </button>
          <div className="flex-1">
            <BuyButton
              item={item}
              owned={owned}
              couponCode={applied?.code}
              paying={paying}
              isLoggedIn={isLoggedIn}
              onClaim={() => claimFree(item)}
              onBuy={() => buy(item, applied?.code)}
            />
            <FreeAssetsButton item={item} isLoggedIn={isLoggedIn} onLogin={signIn} claimed={freeAssetsClaimed} onClaim={claimFreeAssets} compact />
          </div>
        </div>
        {firstBuyerWins && (
          <div className="px-4 pb-2 text-[10px] font-bold text-amber-400 text-center flex items-center justify-center gap-1">
            <Timer size={11} /> {firstBuyer.percent}% first-purchase discount · {formatCountdown(firstBuyer.remainingMs)} left
          </div>
        )}
        {showCheckoutHelp && (
          <div className="px-4 pb-3 pt-1 border-t border-white/5 text-[10px] text-zinc-500 leading-normal text-center bg-black/20">
            💡 {helpText}{" "}
            <a href={getWhatsAppLink(`Hi Janish, I have GPayed ₹${finalPrice} for "${title}". Please grant me access. My registered email is: `)} target="_blank" rel="noopener noreferrer" className="text-[#25D366] hover:underline font-bold">Message on WhatsApp</a>
          </div>
        )}
      </div>
    );
  }

  // ── Full desktop card ───────────────────────────────────────────────────────
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl p-6 shadow-2xl">
      <div className="flex items-baseline justify-between mb-1">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">
            {formatPrice(finalPrice)}
          </span>
          {(item.originalPrice && item.originalPrice > finalPrice) && (
            <span className="text-zinc-600 line-through text-sm">
              ₹{item.originalPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>
        {saved > 0 && (
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#25D366]">
            Save ₹{saved.toLocaleString("en-IN")}
          </span>
        )}
      </div>

      {firstBuyerWins && (
        <div className="mt-2 mb-1 flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-400">
          <Timer size={13} />
          {firstBuyer.percent}% first-purchase discount applied automatically
          <span className="ml-auto font-mono">{formatCountdown(firstBuyer.remainingMs)}</span>
        </div>
      )}

      {applied && !firstBuyerWins && (
        <div className="mt-1 mb-4 flex items-center gap-2 text-xs text-[#25D366]">
          <Check size={13} />
          Coupon <span className="font-mono font-semibold">{applied.code}</span> applied · -₹{applied.discount.toLocaleString("en-IN")}
          <button onClick={clearCoupon} className="ml-auto text-zinc-500 hover:text-white">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="my-5">
        <CouponBox
          code={code}
          onCode={setCode}
          applied={applied}
          error={couponError}
          onApply={doApply}
          onClear={clearCoupon}
        />
      </div>

      {!owned && (
        <div className="mb-4">
          <div className="text-xs text-zinc-400 leading-tight">
            By purchasing you agree to the{" "}
            <button
              type="button"
              onClick={() => setTermsCollapsed(!termsCollapsed)}
              className="text-[#E50914] hover:underline font-semibold inline-flex items-center gap-0.5"
            >
              Terms &amp; Conditions
              {termsCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {!termsCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: "auto", opacity: 1, marginTop: 10 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-zinc-400 leading-snug">
                  {item.terms || defaultTerms}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <BuyButton
        item={item}
        owned={owned}
        couponCode={applied?.code}
        paying={paying}
        isLoggedIn={isLoggedIn}
        onClaim={() => claimFree(item)}
        onBuy={() => buy(item, applied?.code)}
      />
      <FreeAssetsButton item={item} isLoggedIn={isLoggedIn} onLogin={signIn} claimed={freeAssetsClaimed} onClaim={claimFreeAssets} />

      {showCheckoutHelp && (
        <div className="mt-4 p-4 rounded-2xl bg-zinc-950 border border-white/5 text-[11px] text-zinc-500 leading-normal">
          💡 {helpText}{" "}
          <a href={getWhatsAppLink(`Hi Janish, I GPayed ₹${finalPrice} for "${title}". Please grant me access. My registered email is: `)} target="_blank" rel="noopener noreferrer" className="text-[#25D366] hover:underline font-bold">Message on WhatsApp</a>
        </div>
      )}

      <button
        onClick={share}
        className="w-full mt-3 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
      >
        {copied ? <><Check size={15} className="text-[#25D366]" /> Link copied</> : <><LinkIcon size={15} /> Share this {item.kind}</>}
      </button>

      {/* Rendered via portal so it survives this card's "hidden lg:block"
          mobile wrapper and always appears full-viewport regardless of
          breakpoint. */}
      {typeof document !== "undefined" && createPortal(
        <PostPurchaseRecommendations
          open={showRecs}
          onClose={() => setShowRecs(false)}
          purchasedTitle={title}
          savedAmount={saved}
          recommendations={recommendations}
        />,
        document.body
      )}
    </div>
  );
};

// ─── internals ────────────────────────────────────────────────────────────────

export const formatCountdown = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const CouponBox: React.FC<{
  code: string;
  onCode: (v: string) => void;
  applied: { code: string; discount: number } | null;
  error: string;
  onApply: () => void;
  onClear: () => void;
}> = ({ code, onCode, applied, error, onApply, onClear }) => (
  <div>
    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 flex items-center gap-1.5">
      <Tag size={11} /> Have a coupon?
    </div>
    <div className="flex gap-2">
      <input
        value={code}
        onChange={(e) => onCode(e.target.value.toUpperCase())}
        placeholder="LAUNCH50"
        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white uppercase tracking-wider outline-none focus:border-[#E50914]"
      />
      {applied ? (
        <button
          onClick={onClear}
          className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white"
        >
          Remove
        </button>
      ) : (
        <button
          onClick={onApply}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold text-white"
        >
          Apply
        </button>
      )}
    </div>
    {error && <div className="mt-2 text-xs text-[#E50914]">{error}</div>}
  </div>
);

const BuyButton: React.FC<{
  item: (Product | Course) & { kind: "product" | "course" };
  owned: boolean;
  couponCode?: string;
  paying: string | null;
  isLoggedIn: boolean;
  onClaim: () => void;
  onBuy: () => void;
}> = ({ item, owned, paying, isLoggedIn, onClaim, onBuy }) => {
  const cls =
    "w-full py-3.5 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  if (owned) {
    return (
      <Link to="/my-library" className={`${cls} bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/25`}>
        <Check size={17} /> Owned — Open Library
      </Link>
    );
  }
  // A "Coming Soon" course is browsable but not purchasable — its detail page
  // is still reachable by URL, so the block has to live here, not just in the
  // catalogue grid.
  if (item.kind === "course" && !isCourseLive(item as Course)) {
    return (
      <button disabled className={`${cls} bg-white/5 text-zinc-400 border border-white/10`}>
        Coming Soon
      </button>
    );
  }
  // All purchase actions are green — free and paid alike; price text stays white.
  if (item.free) {
    return (
      <button
        onClick={onClaim}
        className={`${cls} bg-[#25D366] text-black hover:bg-green-400`}
      >
        {isLoggedIn ? <><Download size={17} /> Get it free</> : <><Lock size={16} /> Login to get free</>}
      </button>
    );
  }
  return (
    <button
      onClick={onBuy}
      disabled={paying === item.id}
      className={`${cls} bg-[#25D366] text-black hover:bg-green-400`}
    >
      {paying === item.id ? "Opening payment…" : isLoggedIn ? <><CreditCard size={17} /> Get it now</> : <><Lock size={16} /> Login to buy</>}
    </button>
  );
};

// Bonus free assets on selected paid products — an admin toggle per product.
// Shown even before purchase, but login is required to get the link. Clicking
// it also saves the claim to My Library (see getFreeAssetsClaimId) — the link
// opens synchronously (before the async save) so popup blockers don't eat it.
const FreeAssetsButton: React.FC<{
  item: (Product | Course) & { kind: "product" | "course" };
  isLoggedIn: boolean;
  onLogin: () => void;
  claimed?: boolean;
  onClaim: (product: Product) => void;
  compact?: boolean;
}> = ({ item, isLoggedIn, onLogin, claimed = false, onClaim, compact = false }) => {
  if (item.kind !== "product" || !hasFreeAssets(item as Product)) return null;
  const cls = `w-full ${compact ? "mt-2 py-2 text-sm" : "mt-3 py-3 text-base"} rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/25 cursor-pointer`;
  if (!isLoggedIn) {
    return (
      <button onClick={onLogin} className={cls}>
        <Lock size={15} /> Login for free assets
      </button>
    );
  }
  const product = item as Product;
  return (
    <button
      onClick={() => {
        window.open(product.freeAssetsUrl, "_blank", "noopener,noreferrer");
        onClaim(product);
      }}
      className={cls}
    >
      <Download size={15} /> {claimed ? "Free Assets — saved to Library" : "Free Assets"}
    </button>
  );
};

// Re-export for lightbox / share icon usage elsewhere
export { Copy };
