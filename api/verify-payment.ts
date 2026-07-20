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

const SITE_URL = process.env.SITE_URL || "https://www.youreditorfriend.in";

async function sendPurchaseEmail(
  db: FirebaseFirestore.Firestore,
  uid: string,
  itemId: string,
  amountPaise: number,
  userData: Record<string, any>
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const email = userData.email;
  if (!email) return;
  const name = (userData.name || "").split(" ")[0] || "there";

  // Resolve the item's display name + strike-through price from the catalog.
  const storeSnap = await db.doc("store/data").get();
  const storeData = storeSnap.exists ? storeSnap.data() || {} : {};
  const found =
    (storeData.products || []).find((p: any) => p.id === itemId) ||
    (storeData.courses || []).find((c: any) => c.id === itemId);
  const itemName = found?.name || found?.title || "your item";
  const isCourse = !!found?.title;

  const paid = Math.round(amountPaise / 100);
  const original = Number(found?.originalPrice) || 0;
  const saved = original > paid ? original - paid : 0;

  const libraryUrl = `${SITE_URL}/my-library`;
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#ffffff;border-radius:16px;overflow:hidden">
    <div style="padding:28px 28px 20px;border-bottom:1px solid #222">
      <div style="font-size:12px;letter-spacing:3px;color:#E50914;font-weight:bold">YOUR EDITOR FRIEND</div>
    </div>
    <div style="padding:28px">
      <h1 style="margin:0 0 6px;font-size:22px">Purchase successful 🎉</h1>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:14px;line-height:1.6">
        Hi ${name}, your payment went through and <strong style="color:#ffffff">${itemName}</strong> is now yours.
      </p>
      <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="padding:6px 0;color:#a1a1aa">Item</td><td style="padding:6px 0;text-align:right">${itemName}</td></tr>
        <tr><td style="padding:6px 0;color:#a1a1aa">Amount paid</td><td style="padding:6px 0;text-align:right;font-weight:bold">${inr(paid)}</td></tr>
        ${saved > 0 ? `<tr><td style="padding:6px 0;color:#a1a1aa">You saved</td><td style="padding:6px 0;text-align:right;color:#25D366;font-weight:bold">${inr(saved)} 🎉</td></tr>` : ""}
      </table>
      <a href="${libraryUrl}" style="display:block;background:#25D366;color:#000000;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:bold;font-size:15px">
        Open My Library &amp; ${isCourse ? "start watching" : "download"}
      </a>
      <p style="margin:16px 0 0;color:#71717a;font-size:12px;line-height:1.6">
        ${isCourse ? "Your course access link lives" : "Your download lives"} in <a href="${libraryUrl}" style="color:#25D366">My Library</a> — sign in with this same Google account (${email}) to grab it anytime.
      </p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #222;color:#52525b;font-size:11px">
      Your Editor Friend · <a href="${SITE_URL}" style="color:#71717a">${SITE_URL.replace("https://", "")}</a>
    </div>
  </div>`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Your Editor Friend <onboarding@resend.dev>",
      to: [email],
      subject: `Purchase successful — ${itemName} is in your library 🎉`,
      html,
    }),
  });
  if (!resp.ok) console.error("Resend error:", resp.status, await resp.text());
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
    const couponCode = ((order.notes as any)?.couponCode || "").toUpperCase();
    if (!itemId || !uid) return json(res, 400, { error: "Order missing item/user info" });

    const db = adminDb();

    // First verified paid purchase starts the 5-minute 25%-off window that
    // create-order honors server-side. Set once, never overwritten — and only
    // ever written here (Admin SDK), so the client can't restart the window.
    const userSnap = await db.doc(`users/${uid}`).get();
    const userData = userSnap.exists ? userSnap.data() || {} : {};
    const isFirstPayment = !userData.firstPurchaseAt && !(userData.payments || []).length;

    await db.doc(`users/${uid}`).set(
      {
        ...(isFirstPayment ? { firstPurchaseAt: new Date().toISOString() } : {}),
        purchases: FieldValue.arrayUnion(itemId),
        payments: FieldValue.arrayUnion({
          itemId,
          orderId,
          paymentId,
          amount: order.amount,
          couponCode: couponCode || null,
          at: new Date().toISOString(),
        }),
      },
      { merge: true }
    );

    // If a coupon was used, bump its uses counter transactionally so concurrent
    // purchases with a maxUses cap can't both slip through.
    if (couponCode) {
      const ref = db.doc("store/data");
      await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const list = (snap.data()?.coupons || []) as any[];
        const next = list.map(c =>
          (c.code || "").toUpperCase() === couponCode
            ? { ...c, uses: (c.uses || 0) + 1 }
            : c
        );
        tx.update(ref, { coupons: next });
      });
    }

    // Best-effort purchase confirmation email — never blocks the grant.
    // Needs RESEND_API_KEY (and optionally EMAIL_FROM) in the environment;
    // silently skipped when unconfigured.
    try {
      await sendPurchaseEmail(db, uid, itemId, Number(order.amount) || 0, userData);
    } catch (e) {
      console.error("purchase email failed:", e);
    }

    return json(res, 200, { ok: true, itemId });
  } catch (e: any) {
    console.error("verify-payment failed:", e);
    return json(res, 500, { error: "Verification failed" });
  }
}
