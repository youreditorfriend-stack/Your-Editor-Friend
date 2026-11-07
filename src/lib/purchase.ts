import { useEffect, useState } from "react";
import { addDoc, arrayUnion, collection, doc, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { auth, db } from "../firebase";
import { useAuth } from "./auth";
import { getWhatsAppLink } from "./site";
import { FIRST_BUYER_DISCOUNT_PERCENT, firstBuyerWindowRemainingMs, getFreeAssetsClaimId } from "./store";
import type { Bundle, Course, Product } from "./store";

type Buyable = Product | Course | Bundle;

// ─── Checkout tracking ────────────────────────────────────────────────────────
// Every step of a purchase is written to `checkoutEvents` so the admin can see
// exactly where it went wrong (closed the window, card declined, verify failed…).
export type CheckoutStage =
  | "started" | "order_failed" | "opened" | "dismissed" | "payment_failed"
  | "verify_failed" | "paid" | "whatsapp_fallback" | "free_claimed" | "free_failed";

export function logCheckout(
  item: Buyable,
  stage: CheckoutStage,
  extra: { orderId?: string; paymentId?: string; amount?: number; reason?: string; coupon?: string } = {}
) {
  const u = auth.currentUser;
  if (!u) return;
  const name = "name" in item ? item.name : item.title;
  addDoc(collection(db, "checkoutEvents"), {
    uid: u.uid,
    email: (u.email || "").toLowerCase(),
    userName: u.displayName || "",
    itemId: item.id,
    itemName: (name || "").slice(0, 120),
    amount: extra.amount ?? item.price ?? 0,
    stage,
    reason: (extra.reason || "").slice(0, 300),
    orderId: extra.orderId || "",
    paymentId: extra.paymentId || "",
    coupon: (extra.coupon || "").slice(0, 40),
    device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
    at: new Date().toISOString(),
  }).catch(e => console.warn("checkout log skipped", e?.code || e));
}

// What a logged-out visitor clicked, so it continues right after login.
type IntentKind = "buy" | "claim";
const INTENT_KEY = "yef-intent";
function saveIntent(id: string, kind: IntentKind) {
  try { sessionStorage.setItem(INTENT_KEY, JSON.stringify({ id, kind, at: Date.now() })); } catch { /* private mode */ }
}
function clearIntent() { try { sessionStorage.removeItem(INTENT_KEY); } catch { /* ignore */ } }
function takeIntent(id: string): IntentKind | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(INTENT_KEY) || "null");
    if (!v || v.id !== id || Date.now() - v.at > 15 * 60 * 1000) return null;
    clearIntent();
    return v.kind;
  } catch { return null; }
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

// Loads Razorpay's checkout script once, on demand
let rzpScript: Promise<boolean> | null = null;
function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  if (!rzpScript) {
    rzpScript = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }
  return rzpScript;
}

// Kicks off the checkout.js fetch as soon as a paid item's purchase card
// mounts, instead of waiting for the Buy click — that network round-trip
// (independent of anything server-side) was sitting directly in the
// perceived "click Buy → payment sheet opens" delay.
export function preloadRazorpay() {
  loadRazorpay();
}

// Shared buy/claim flow for products & courses.
// - Login is required for everything.
// - Free items: claimed instantly (added to user's purchases → available in My Library).
// - Paid items: Razorpay checkout → payment verified server-side → item granted
//   automatically. If Razorpay isn't configured, falls back to the WhatsApp flow
//   (admin grants access manually from Admin → Users after payment).
export function usePurchase() {
  const { user, profile, signIn } = useAuth();
  const [paying, setPaying] = useState<string | null>(null);
  // Item id whose checkout actually failed this session — drives the
  // "Checkout issues? GPay …" fallback note, which only appears after a
  // real failure rather than sitting under every buy button permanently.
  const [checkoutFailed, setCheckoutFailed] = useState<string | null>(null);

  const owns = (itemId: string) => !!profile?.purchases?.includes(itemId);

  // Not logged in → remember what they wanted, sign in, and carry on
  // automatically (popup: right here; redirect: useResumeIntent on return).
  const ensureLogin = async (item: Buyable, kind: IntentKind): Promise<User | null> => {
    if (auth.currentUser) return auth.currentUser;
    saveIntent(item.id, kind);
    try { await signIn(); } catch (e) { console.warn("Sign-in cancelled", e); return null; }
    const u = auth.currentUser;
    if (u) clearIntent();
    return u;
  };

  const claimFree = async (item: Product | Course) => {
    const u = user || (await ensureLogin(item, "claim"));
    if (!u) return;
    // Right after a first login the profile doc may still be being created —
    // retry briefly instead of failing.
    for (let i = 0; i < 4; i++) {
      try {
        await updateDoc(doc(db, "users", u.uid), { purchases: arrayUnion(item.id) });
        logCheckout(item, "free_claimed");
        return;
      } catch (e) {
        if (i === 3) {
          console.error("Failed to claim free item:", e);
          logCheckout(item, "free_failed", { reason: String((e as any)?.code || e) });
          alert("Couldn't claim this — please try again, or message me on WhatsApp and I'll unlock it for you.");
        } else await new Promise(r => setTimeout(r, 700));
      }
    }
  };

  // Records the bonus-free-assets grab under its own id (not the product's
  // own id — grabbing the bonus doesn't mean the paid product was bought) so
  // it reappears in My Library afterwards instead of only being a one-off
  // link open.
  const claimFreeAssets = async (product: Product) => {
    if (!user) {
      await signIn();
      return;
    }
    try {
      await updateDoc(doc(db, "users", user.uid), { purchases: arrayUnion(getFreeAssetsClaimId(product.id)) });
    } catch (e) {
      console.error("Failed to save free assets claim:", e);
      alert("Couldn't save this to your library — the download link still opened, but message me on WhatsApp if it's missing from My Library later.");
    }
  };

  const whatsAppFallback = (item: Buyable, email?: string | null) => {
    setCheckoutFailed(item.id);
    const name = "name" in item ? item.name : item.title;
    const msg = `Hi Janish! I want to buy *${name}* (₹${item.price}).\nMy login email: ${email || user?.email}\nPlease share the payment details!`;
    logCheckout(item, "whatsapp_fallback");
    window.open(getWhatsAppLink(msg), "_blank");
  };

  const buy = async (item: Buyable, couponCode?: string) => {
    const u = user || (await ensureLogin(item, "buy"));
    if (!u) return;

    setPaying(item.id);
    setCheckoutFailed(null); // a fresh attempt clears the previous failure note
    logCheckout(item, "started", { coupon: couponCode });
    try {
      // Create order server-side (price is looked up there, not trusted from client)
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, uid: u.uid, couponCode: couponCode || undefined }),
      });

      const isJson = (orderRes.headers.get("content-type") || "").includes("application/json");
      if (!orderRes.ok || !isJson) {
        const body = isJson ? await orderRes.json().catch(() => ({})) : {};
        logCheckout(item, "order_failed", { reason: `${orderRes.status} ${body?.error || ""}`.trim() });
        // Razorpay not configured (or server error) → WhatsApp flow
        whatsAppFallback(item, u.email);
        return;
      }

      const order = await orderRes.json();
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        logCheckout(item, "order_failed", { reason: "Razorpay script did not load", orderId: order.orderId });
        whatsAppFallback(item, u.email);
        return;
      }

      let finished = false; // payment completed → the later modal close isn't a cancel
      const amount = Math.round((order.amount || 0) / 100);
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Your Editor Friend",
        description: order.itemName,
        order_id: order.orderId,
        prefill: {
          name: u.displayName || "",
          email: u.email || "",
        },
        theme: { color: "#FF7A1A" },
        modal: {
          ondismiss: () => {
            if (!finished) logCheckout(item, "dismissed", { orderId: order.orderId, amount, reason: "Closed the payment window" });
          },
        },
        handler: async (resp: any) => {
          finished = true;
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: resp.razorpay_order_id,
                paymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
              }),
            });
            if (!verifyRes.ok) {
              const b = await verifyRes.json().catch(() => ({}));
              logCheckout(item, "verify_failed", { orderId: order.orderId, amount, paymentId: resp.razorpay_payment_id, reason: `${verifyRes.status} ${b?.error || ""}`.trim() });
              setCheckoutFailed(item.id);
              alert("Payment received but verification failed — message me on WhatsApp and I'll unlock it for you right away!");
            } else {
              logCheckout(item, "paid", { orderId: order.orderId, amount, paymentId: resp.razorpay_payment_id });
            }
            // On success the users/{uid} snapshot listener updates the UI automatically
          } catch (e: any) {
            logCheckout(item, "verify_failed", { orderId: order.orderId, amount, paymentId: resp.razorpay_payment_id, reason: `Network: ${e?.message || e}` });
            setCheckoutFailed(item.id);
            alert("Payment received but verification failed — message me on WhatsApp and I'll unlock it for you right away!");
          }
        },
      });
      // Card declined / UPI failed / bank error — Razorpay tells us why.
      rzp.on?.("payment.failed", (r: any) => {
        const er = r?.error || {};
        logCheckout(item, "payment_failed", {
          orderId: order.orderId, amount, paymentId: er.metadata?.payment_id,
          reason: [er.description, er.reason, er.source, er.step].filter(Boolean).join(" · "),
        });
      });
      rzp.open();
      logCheckout(item, "opened", { orderId: order.orderId, amount, coupon: order.couponCode || undefined });
    } catch (e: any) {
      console.error("Buy flow failed:", e);
      logCheckout(item, "order_failed", { reason: `Error: ${e?.message || e}` });
      whatsAppFallback(item, u.email);
    } finally {
      setPaying(null);
    }
  };

  return { owns, claimFree, claimFreeAssets, buy, isLoggedIn: !!user, paying, checkoutFailed };
}

// After a redirect-style Google login the page reloads; this picks up what
// the visitor was trying to do and finishes it (buy → payment sheet opens).
export function useResumeIntent(item: Buyable | null | undefined) {
  const { user } = useAuth();
  const { buy, claimFree, owns } = usePurchase();
  useEffect(() => {
    if (!user || !item) return;
    const kind = takeIntent(item.id);
    if (!kind || owns(item.id)) return;
    const t = setTimeout(() => {
      if (kind === "claim") claimFree(item as Product);
      else buy(item);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, item?.id]);
}

// Live view of the 5-minute first-time-buyer discount window. Purely for
// display — /api/create-order re-derives the same window from the user doc,
// so the countdown here can't change what actually gets charged.
export function useFirstBuyerDiscount() {
  const { profile } = useAuth();
  const firstPurchaseAt = profile?.firstPurchaseAt;
  const [remainingMs, setRemainingMs] = useState(() => firstBuyerWindowRemainingMs(firstPurchaseAt));

  useEffect(() => {
    setRemainingMs(firstBuyerWindowRemainingMs(firstPurchaseAt));
    if (!firstBuyerWindowRemainingMs(firstPurchaseAt)) return;
    const t = setInterval(() => {
      const left = firstBuyerWindowRemainingMs(firstPurchaseAt);
      setRemainingMs(left);
      if (!left) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [firstPurchaseAt]);

  return {
    active: remainingMs > 0,
    remainingMs,
    percent: FIRST_BUYER_DISCOUNT_PERCENT,
  };
}
