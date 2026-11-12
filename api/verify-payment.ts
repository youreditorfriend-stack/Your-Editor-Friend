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
    (storeData.courses || []).find((c: any) => c.id === itemId) ||
    (storeData.bundles || []).find((b: any) => b.id === itemId);
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
      ${!isCourse && found?.downloadUrl ? `<a href="${found.downloadUrl}" style="display:block;background:#25D366;color:#000000;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:bold;font-size:15px;margin-bottom:10px">
        ⬇ Download now
      </a>` : ""}
      <a href="${libraryUrl}" style="display:block;background:${!isCourse && found?.downloadUrl ? "#1f1f1f" : "#25D366"};color:${!isCourse && found?.downloadUrl ? "#ffffff" : "#000000"};text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:bold;font-size:15px">
        Open My Library${isCourse ? " &amp; start watching" : ""}
      </a>
      ${!isCourse && (found?.assetGen || found?.tutorialUrl) ? `<p style="margin:14px 0 0;text-align:center"><a href="${SITE_URL}/products/${itemId}#ai-assets" style="color:#FF7A1A;font-weight:bold;font-size:14px">Free prompts &amp; how-to-edit video →</a></p>` : ""}
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

// Email the owner when a payment can't be unlocked, so nobody who paid is
// left waiting. Best-effort; silently skipped without RESEND_API_KEY.
async function alertOwner(subject: string, lines: string[]) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Your Editor Friend <onboarding@resend.dev>",
        to: [process.env.ALERT_EMAIL || "youreditorfriend@gmail.com"],
        subject: `⚠ ${subject}`,
        html: `<div style="font-family:Arial;font-size:14px;line-height:1.6">${lines.map(l => `<p>${String(l).replace(/</g, "&lt;")}</p>`).join("")}<p><a href="${SITE_URL}/admin">Open admin → Payments & alerts / Support helper</a></p></div>`,
      }),
    });
  } catch (e) { console.error("owner alert failed", e); }
}

// ── Title card edit booking ──────────────────────────────────────────────────
// Gives out the next slot number inside a transaction, so slot 101 can never
// be sold; if two people pay for the last slot, the second one is refunded.
const esc = (s: any) => String(s ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string));

async function sendMail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "Your Editor Friend <onboarding@resend.dev>", to: [to], subject, html }),
  });
  if (!r.ok) console.error("Resend error:", r.status, await r.text().catch(() => ""));
}

async function confirmTitleCard(rzp: any, order: any, orderId: string, paymentId: string, res: any) {
  const db = adminDb();
  const offerRef = db.doc("store/titlecard");
  const draftRef = db.doc(`editDrafts/${orderId}`);

  const result = await db.runTransaction(async tx => {
    const [offerSnap, draftSnap] = await Promise.all([tx.get(offerRef), tx.get(draftRef)]);
    if (!draftSnap.exists) throw new Error("Booking details not found for " + orderId);
    const draft = draftSnap.data() as any;
    if (draft.doneId) return { id: draft.doneId as string, draft, already: true, full: false, slot: draft.slot };
    const offer = { total: 100, booked: 0, batches: [], ...(offerSnap.data() || {}) } as any;
    if (!draft.simple && offer.booked >= offer.total) {  // simple (₹599) bookings have no slot limit
      tx.set(draftRef, { full: true, paymentId }, { merge: true });
      return { id: "", draft, already: false, full: true, slot: 0 };
    }
    const slot = offer.booked + 1;
    let id = `TC-${String(slot).padStart(3, "0")}`;
    // never overwrite an order (e.g. after the booked count was reset following a test)
    if ((await tx.get(db.doc(`editOrders/${id}`))).exists) id = `${id}-${Date.now().toString(36).slice(-4)}`;
    const batch = (offer.batches || []).find((b: any) => slot >= b.from && slot <= b.to) || null;
    tx.set(offerRef, { booked: slot }, { merge: true });
    tx.set(db.doc(`editOrders/${id}`), {
      slot, uid: draft.uid, userEmail: draft.userEmail || "",
      name: draft.name, phone: draft.phone, email: draft.email || "",
      top: draft.top, big: draft.big, pose: draft.pose, photos: draft.photos || [], note: draft.note || "",
      showOk: !!draft.showOk, shown: false, upgrade: !!draft.upgrade,
      paid: Math.round(Number(order.amount) / 100), orderId, paymentId,
      batch: batch ? batch.name : "", deliverBy: batch ? batch.date : "",
      status: "new", revisionsUsed: 0, createdAt: new Date().toISOString(),
    });
    tx.set(draftRef, { doneId: id, slot, paymentId }, { merge: true });
    return { id, draft, already: false, full: false, slot, batch, fileProductId: offer.fileProductId || "" };
  });

  if (result.full) {
    let refunded = false;
    try { await rzp.payments.refund(paymentId, { notes: { reason: "All title card slots booked" } }); refunded = true; } catch (e) { console.error("refund failed", e); }
    await alertOwner("Title card: paid after slots were full", [`Order ${orderId}, payment ${paymentId}.`, refunded ? "Refund started automatically." : "AUTO-REFUND FAILED — refund it from the Razorpay dashboard."]);
    return json(res, 409, { error: "All slots got booked just before your payment. Your money is being refunded automatically.", full: true, refunded });
  }
  if (result.already) return json(res, 200, { ok: true, titlecard: { id: result.id, slot: result.slot } });

  const d = result.draft;
  // Count the promo code use (transaction, so a "max 25 uses" cap holds)
  if (d.couponCode) {
    try {
      const ref = db.doc("store/data");
      await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        const list = (snap.data()?.coupons || []) as any[];
        tx.update(ref, { coupons: list.map(c => (String(c.code || "").toUpperCase() === d.couponCode ? { ...c, uses: (c.uses || 0) + 1 } : c)) });
      });
    } catch (e) { console.error("titlecard coupon bump failed", e); }
  }
  // Edit includes the project file → it appears in My Library.
  const grant: any = {
    payments: FieldValue.arrayUnion({ itemId: "titlecard-edit", orderId, paymentId, amount: order.amount, couponCode: null, at: new Date().toISOString() }),
  };
  if ((result as any).fileProductId) grant.purchases = FieldValue.arrayUnion((result as any).fileProductId);
  try { await db.doc(`users/${d.uid}`).set(grant, { merge: true }); } catch (e) { console.error("titlecard grant failed", e); }

  const paid = Math.round(Number(order.amount) / 100);
  const batchTxt = (result as any).batch ? `${(result as any).batch.name} · delivery by ${(result as any).batch.date}` : "";
  const photos = (d.photos || []).map((u: string, i: number) => `<a href="${esc(u)}" style="color:#FF7A1A">Photo ${i + 1}</a>`).join(" · ");
  const ownerTo = process.env.ALERT_EMAIL || "youreditorfriend@gmail.com";
  try {
    await sendMail(ownerTo, `🎬 New title card booking ${result.id} · ${d.big} · ₹${paid}`, `
      <div style="font-family:Arial;font-size:14px;line-height:1.7;max-width:520px">
        <h2 style="margin:0 0 8px">New booking ${result.id}</h2>
        <table style="border-collapse:collapse">
          <tr><td style="color:#777;padding-right:14px">Top text</td><td><b>${esc(d.top || "—")}</b></td></tr>
          <tr><td style="color:#777;padding-right:14px">Big name</td><td><b>${esc(d.big)}</b></td></tr>
          <tr><td style="color:#777;padding-right:14px">Pose</td><td>${esc(d.pose)}</td></tr>
          <tr><td style="color:#777;padding-right:14px">Name</td><td>${esc(d.name)}</td></tr>
          <tr><td style="color:#777;padding-right:14px">WhatsApp</td><td><a href="https://wa.me/91${esc(d.phone)}">+91 ${esc(d.phone)}</a></td></tr>
          <tr><td style="color:#777;padding-right:14px">Email</td><td>${esc(d.email || d.userEmail || "—")}</td></tr>
          <tr><td style="color:#777;padding-right:14px">Note</td><td>${esc(d.note || "—")}</td></tr>
          <tr><td style="color:#777;padding-right:14px">Paid</td><td>₹${paid}${d.upgrade ? " (upgrade from file)" : ""}</td></tr>
          <tr><td style="color:#777;padding-right:14px">Batch</td><td>${esc(batchTxt || "—")}</td></tr>
        </table>
        <p>${photos}</p>
        <p><a href="${SITE_URL}/admin" style="color:#FF7A1A">Open admin → Edit orders</a></p>
      </div>`);
  } catch (e) { console.error("owner booking email failed", e); }
  try {
    const to = d.email || d.userEmail;
    await sendMail(to, `Your title card slot ${result.id} is booked 🎬`, `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:16px;overflow:hidden">
        <div style="padding:26px">
          <div style="font-size:12px;letter-spacing:3px;color:#FF7A1A;font-weight:bold">YOUR EDITOR FRIEND</div>
          <h1 style="margin:14px 0 6px;font-size:22px">Slot ${result.id} is yours 🎉</h1>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6">Hi ${esc(String(d.name).split(" ")[0])}, I've got your details: <b style="color:#fff">${esc(d.top)} ${esc(d.big)}</b> · ${esc(d.pose)}.${batchTxt ? `<br>${esc(batchTxt)}.` : ""}<br>Your 1080p MP4 comes on WhatsApp. The project file is already in My Library.</p>
          <a href="${SITE_URL}/my-library" style="display:block;background:#FF7A1A;color:#000;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:bold">Open My Library</a>
        </div>
      </div>`);
  } catch (e) { console.error("customer booking email failed", e); }

  return json(res, 200, { ok: true, titlecard: { id: result.id, slot: result.slot, batch: (result as any).batch || null } });
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
    if (expected !== signature) {
      await alertOwner("Payment could not be verified", [`Order ${orderId}, payment ${paymentId}: signature did not match.`, "If the customer messages you, check Razorpay and use “Give product” in Support helper."]);
      return json(res, 400, { error: "Invalid payment signature" });
    }

    // Trust only the notes we wrote at order creation (client can't tamper)
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.fetch(orderId);
    if ((order.notes as any)?.kind === "titlecard") {
      return await confirmTitleCard(rzp, order, orderId, paymentId, res);
    }
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

    // A bundle grants itself plus every product inside it, so each product
    // appears in My Library on its own.
    const storeSnapForGrant = await db.doc("store/data").get();
    const bundle = ((storeSnapForGrant.data() || {}).bundles || []).find((b: any) => b.id === itemId);
    const grantIds: string[] = [itemId, ...(Array.isArray(bundle?.productIds) ? bundle.productIds : [])];

    await db.doc(`users/${uid}`).set(
      {
        ...(isFirstPayment ? { firstPurchaseAt: new Date().toISOString() } : {}),
        purchases: FieldValue.arrayUnion(...grantIds),
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
    await alertOwner("Paid but product not unlocked", [
      `Order ${req.body?.orderId || "?"}, payment ${req.body?.paymentId || "?"}.`,
      `Error: ${e?.message || e}`,
      "The customer was charged. Find them in Payments & alerts and press “Give product”.",
    ]);
    return json(res, 500, { error: "Verification failed" });
  }
}
