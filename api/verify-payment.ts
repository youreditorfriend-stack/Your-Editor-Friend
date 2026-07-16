// POST /api/verify-payment  { orderId, paymentId, signature }
// Verifies the Razorpay signature, then grants the item to the user
// recorded in the order's notes (set server-side at order creation).
// NOTE: self-contained — no relative imports (see create-order.ts).
import crypto from "crypto";
import Razorpay from "razorpay";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return json(res, 503, { error: "Razorpay not configured" });

  try {
    const { orderId, paymentId, signature } = req.body || {};
    if (!orderId || !paymentId || !signature) {
      return json(res, 400, { error: "orderId, paymentId and signature are required" });
    }

    // Verify signature: HMAC_SHA256(orderId|paymentId, key_secret)
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    if (expected !== signature) return json(res, 400, { error: "Invalid payment signature" });

    // Trust only the notes we wrote at order creation (client can't tamper)
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.fetch(orderId);
    const itemId = (order.notes as any)?.itemId;
    const uid = (order.notes as any)?.uid;
    if (!itemId || !uid) return json(res, 400, { error: "Order missing item/user info" });

    await adminDb().doc(`users/${uid}`).set(
      {
        purchases: FieldValue.arrayUnion(itemId),
        payments: FieldValue.arrayUnion({
          itemId,
          orderId,
          paymentId,
          amount: order.amount,
          at: new Date().toISOString(),
        }),
      },
      { merge: true }
    );

    return json(res, 200, { ok: true, itemId });
  } catch (e: any) {
    console.error("verify-payment failed:", e);
    return json(res, 500, { error: "Verification failed" });
  }
}
