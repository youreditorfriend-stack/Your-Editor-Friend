import { useEffect, useState } from "react";
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";

export interface CheckoutEvent {
  id: string; uid: string; email: string; userName: string; itemId: string; itemName: string;
  amount: number; stage: string; reason: string; orderId: string; paymentId: string; coupon: string;
  device: string; at: string;
}

// Plain-English label + colour for each step.
export const STAGE: Record<string, { label: string; tone: "good" | "bad" | "warn" | "info" }> = {
  started: { label: "Clicked Buy", tone: "info" },
  opened: { label: "Payment window opened", tone: "info" },
  dismissed: { label: "Closed / cancelled", tone: "warn" },
  payment_failed: { label: "Payment failed", tone: "bad" },
  verify_failed: { label: "Paid but not unlocked", tone: "bad" },
  order_failed: { label: "Checkout error", tone: "bad" },
  whatsapp_fallback: { label: "Sent to WhatsApp", tone: "warn" },
  paid: { label: "Paid ✓", tone: "good" },
  free_claimed: { label: "Got free ✓", tone: "good" },
  free_failed: { label: "Free claim failed", tone: "bad" },
};
export const isProblem = (s: string) => ["payment_failed", "verify_failed", "order_failed", "free_failed"].includes(s);

export function useCheckoutEvents(max = 400) {
  const [events, setEvents] = useState<CheckoutEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false); // rules not published / not admin
  useEffect(() => {
    const q = query(collection(db, "checkoutEvents"), orderBy("at", "desc"), limit(max));
    return onSnapshot(q, s => { setEvents(s.docs.map(d => ({ id: d.id, ...(d.data() as any) }))); setLoading(false); setBlocked(false); },
      e => { setLoading(false); setBlocked((e as any)?.code === "permission-denied"); });
  }, [max]);
  return { events, loading, blocked };
}

export async function eventsForEmail(email: string): Promise<CheckoutEvent[]> {
  const s = await getDocs(query(collection(db, "checkoutEvents"), where("email", "==", email.toLowerCase()), limit(100)));
  return s.docs.map(d => ({ id: d.id, ...(d.data() as any) })).sort((a, b) => b.at.localeCompare(a.at));
}

// Group a buyer's steps for one product into "attempts" (one Buy click each).
export function groupAttempts(events: CheckoutEvent[]) {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  const attempts: { key: string; uid: string; email: string; userName: string; itemName: string; itemId: string; amount: number; steps: CheckoutEvent[]; last: CheckoutEvent }[] = [];
  const open = new Map<string, (typeof attempts)[number]>();
  for (const e of sorted) {
    const k = `${e.uid}|${e.itemId}`;
    let a = open.get(k);
    const gap = a ? new Date(e.at).getTime() - new Date(a.last.at).getTime() : Infinity;
    if (!a || e.stage === "started" || gap > 30 * 60 * 1000) {
      a = { key: e.id, uid: e.uid, email: e.email, userName: e.userName, itemName: e.itemName, itemId: e.itemId, amount: e.amount, steps: [], last: e };
      attempts.push(a); open.set(k, a);
    }
    a.steps.push(e); a.last = e;
    if (e.amount) a.amount = e.amount;
  }
  return attempts.reverse();
}

export const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
