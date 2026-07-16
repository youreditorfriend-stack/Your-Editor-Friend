// POST /api/create-order  { itemId, uid }
// Creates a Razorpay order for the item (price looked up server-side).
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

// Server-side price lookup so the client can never tamper with amounts
async function findItem(itemId: string): Promise<{ id: string; price: number; name: string } | null> {
  const snap = await adminDb().doc("store/data").get();
  if (!snap.exists) return null;
  const d = snap.data() || {};
  const all = [
    ...(d.products || []).map((p: any) => ({ id: p.id, price: p.price, name: p.name })),
    ...(d.courses || []).map((c: any) => ({ id: c.id, price: c.price, name: c.title })),
  ];
  return all.find((i: any) => i.id === itemId) || null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return json(res, 503, { error: "Razorpay not configured" });

  try {
    const { itemId, uid } = req.body || {};
    if (!itemId || !uid) return json(res, 400, { error: "itemId and uid are required" });

    const item = await findItem(itemId);
    if (!item) return json(res, 404, { error: "Item not found" });
    if (!item.price || item.price <= 0) return json(res, 400, { error: "Item is free — no payment needed" });

    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({
      amount: Math.round(item.price * 100), // paise
      currency: "INR",
      receipt: `${itemId}`.slice(0, 40),
      notes: { itemId, uid, itemName: item.name },
    });

    return json(res, 200, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      itemName: item.name,
    });
  } catch (e: any) {
    console.error("create-order failed:", e);
    return json(res, 500, { error: "Failed to create order" });
  }
}
