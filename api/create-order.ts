// POST /api/create-order  { itemId, uid, couponCode? }
// Creates a Razorpay order for the item. The final amount is computed
// server-side from Firestore, so a tampered client can't buy at a lower price.
// NOTE: self-contained — Vercel functions can't resolve extensionless
// relative TS imports at runtime, so helpers are inlined in each api file.
import Razorpay from "razorpay";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function adminDb() {
  if (!getApps().length) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
    initializeApp({ credential: cert(svc) });
  }
  return getFirestore();
}

function json(res: any, status: number, body: any) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

// Loads item + coupon list from Firestore in one round-trip so we can compute
// the discounted price without trusting anything sent by the client.
async function loadStore(itemId: string) {
  const snap = await adminDb().doc("store/data").get();
  if (!snap.exists) return { item: null, coupons: [] };
  const d = snap.data() || {};
  const items = [
    ...(d.products || []).map((p: any) => ({ id: p.id, price: p.price, name: p.name })),
    ...(d.courses || []).map((c: any) => ({ id: c.id, price: c.price, name: c.title })),
  ];
  const item = items.find((i: any) => i.id === itemId) || null;
  return { item, coupons: (d.coupons || []) as any[] };
}

// Same rules as src/lib/store.ts#applyCoupon — kept in sync manually because
// api/ functions cannot import from src/ (extensionless ESM resolution fails at
// runtime in the deployed bundle).
function pickCoupon(coupons: any[], code: string | undefined, itemId: string, now: Date) {
  if (!code) return { ok: true as const, coupon: null, discount: 0 };
  const wanted = code.trim().toUpperCase();
  const c = coupons.find((x: any) => (x.code || "").toUpperCase() === wanted);
  if (!c) return { ok: false as const, error: "Invalid coupon code" };
  if (!c.enabled) return { ok: false as const, error: "Coupon is not active" };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now.getTime()) {
    return { ok: false as const, error: "Coupon has expired" };
  }
  if (c.maxUses != null && (c.uses ?? 0) >= c.maxUses) {
    return { ok: false as const, error: "Coupon has already been fully used" };
  }
  if (Array.isArray(c.appliesTo) && c.appliesTo.length > 0 && !c.appliesTo.includes(itemId)) {
    return { ok: false as const, error: "Coupon doesn't apply to this item" };
  }
  if (!(c.percentOff > 0 && c.percentOff <= 100)) {
    return { ok: false as const, error: "Coupon is misconfigured" };
  }
  return { ok: true as const, coupon: c, discount: c.percentOff };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return json(res, 503, { error: "Razorpay not configured" });

  try {
    const { itemId, uid, couponCode } = req.body || {};
    if (!itemId || !uid) return json(res, 400, { error: "itemId and uid are required" });

    const { item, coupons } = await loadStore(itemId);
    if (!item) return json(res, 404, { error: "Item not found" });
    if (!item.price || item.price <= 0) return json(res, 400, { error: "Item is free — no payment needed" });

    const check = pickCoupon(coupons, couponCode, itemId, new Date());
    if (!check.ok) return json(res, 400, { error: check.error });

    const discountRupees = check.coupon ? Math.round(item.price * (check.discount / 100)) : 0;
    const finalPrice = Math.max(0, item.price - discountRupees);
    if (finalPrice <= 0) return json(res, 400, { error: "Coupon reduces the price to zero — grant this manually instead" });

    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({
      amount: Math.round(finalPrice * 100), // paise
      currency: "INR",
      receipt: `${itemId}`.slice(0, 40),
      notes: {
        itemId,
        uid,
        itemName: item.name,
        couponCode: check.coupon ? (check.coupon.code || "").toUpperCase() : "",
      },
    });

    return json(res, 200, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      itemName: item.name,
      couponCode: check.coupon ? (check.coupon.code || "").toUpperCase() : null,
      discount: discountRupees,
    });
  } catch (e: any) {
    console.error("create-order failed:", e);
    return json(res, 500, { error: "Failed to create order" });
  }
}
