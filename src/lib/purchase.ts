import { useEffect, useState } from "react";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./auth";
import { getWhatsAppLink } from "./site";
import { FIRST_BUYER_DISCOUNT_PERCENT, firstBuyerWindowRemainingMs, getFreeAssetsClaimId } from "./store";
import type { Course, Product } from "./store";

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

  const claimFree = async (item: Product | Course) => {
    if (!user) {
      await signIn();
      return; // profile listener will refresh; user clicks again after login
    }
    try {
      await updateDoc(doc(db, "users", user.uid), { purchases: arrayUnion(item.id) });
    } catch (e) {
      console.error("Failed to claim free item:", e);
      alert("Couldn't claim this — please try again, or message me on WhatsApp and I'll unlock it for you.");
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

  const whatsAppFallback = (item: Product | Course) => {
    setCheckoutFailed(item.id);
    const name = "name" in item ? item.name : item.title;
    const msg = `Hi Janish! I want to buy *${name}* (₹${item.price}).\nMy login email: ${user?.email}\nPlease share the payment details!`;
    window.open(getWhatsAppLink(msg), "_blank");
  };

  const buy = async (item: Product | Course, couponCode?: string) => {
    if (!user) {
      await signIn();
      return;
    }

    setPaying(item.id);
    setCheckoutFailed(null); // a fresh attempt clears the previous failure note
    try {
      // Create order server-side (price is looked up there, not trusted from client)
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, uid: user.uid, couponCode: couponCode || undefined }),
      });

      const isJson = (orderRes.headers.get("content-type") || "").includes("application/json");
      if (!orderRes.ok || !isJson) {
        // Razorpay not configured (or server error) → WhatsApp flow
        whatsAppFallback(item);
        return;
      }

      const order = await orderRes.json();
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        whatsAppFallback(item);
        return;
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Your Editor Friend",
        description: order.itemName,
        order_id: order.orderId,
        prefill: {
          name: user.displayName || "",
          email: user.email || "",
        },
        theme: { color: "#E50914" },
        handler: async (resp: any) => {
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
              setCheckoutFailed(item.id);
              alert("Payment received but verification failed — message me on WhatsApp and I'll unlock it for you right away!");
            }
            // On success the users/{uid} snapshot listener updates the UI automatically
          } catch {
            setCheckoutFailed(item.id);
            alert("Payment received but verification failed — message me on WhatsApp and I'll unlock it for you right away!");
          }
        },
      });
      rzp.open();
    } catch (e) {
      console.error("Buy flow failed:", e);
      whatsAppFallback(item);
    } finally {
      setPaying(null);
    }
  };

  return { owns, claimFree, claimFreeAssets, buy, isLoggedIn: !!user, paying, checkoutFailed };
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
