// POST /api/titlecard  { action, ... }
// Title card launch offer: done-for-you edit bookings (100 slots, batch prices).
//   Buyer actions (signed-in Google user):
//     upload-photo  { idToken, contentType, data }            → { url }
//     create-order  { idToken, top, big, pose, photos, name, phone, email, note, showOk } → Razorpay order
//     waitlist      { name, phone, email }                    → { ok, position }
//   Admin actions (owner account):
//     admin-list    { idToken }                               → { orders, waitlist }
//     admin-update  { idToken, id, patch }                    → { ok }
//     admin-config  { idToken, patch }                        → { ok }
// Payment is verified (and the slot is given out) in /api/verify-payment.
// NOTE: self-contained — no relative imports (see create-order.ts).
import Razorpay from "razorpay";
import { AwsClient } from "aws4fetch";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

const ADMIN_EMAILS = ["youreditorfriend@gmail.com"];
const FIREBASE_API_KEY = "AIzaSyBqgmzrNelS701uQ1ngLvcoatUkcBuiRic";
const OFFER_DOC = "store/titlecard";

// Keep in sync with src/lib/titlecard.ts (DEFAULT_OFFER)
const DEFAULTS = {
  open: true,
  total: 100,
  booked: 0,
  waitlist: 0,
  filePrice: 499,
  fileProductId: "",
  tiers: [{ upTo: 35, price: 1499 }, { upTo: 100, price: 1999 }],
};

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

async function lookupUser(idToken?: string) {
  if (!idToken) throw new Error("Not signed in");
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!r.ok) throw new Error("Invalid or expired sign-in");
  const u = (await r.json())?.users?.[0];
  if (!u?.localId) throw new Error("Invalid sign-in");
  return { uid: u.localId as string, email: (u.email || "").toLowerCase() as string, verified: !!u.emailVerified, name: (u.displayName || "") as string };
}

async function assertAdmin(idToken?: string) {
  const u = await lookupUser(idToken);
  if (!u.verified || !ADMIN_EMAILS.includes(u.email)) throw new Error("Not an admin account");
  return u;
}

async function loadOffer(db: FirebaseFirestore.Firestore) {
  const snap = await db.doc(OFFER_DOC).get();
  return { ...DEFAULTS, ...(snap.exists ? snap.data() : {}) } as any;
}

function priceForSlot(offer: any, slot: number) {
  const tiers = (Array.isArray(offer.tiers) && offer.tiers.length ? offer.tiers : DEFAULTS.tiers) as { upTo: number; price: number }[];
  const t = [...tiers].sort((a, b) => a.upTo - b.upTo).find(x => slot <= x.upTo) || tiers[tiers.length - 1];
  return Number(t.price) || 1999;
}

const clean = (v: any, max: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const body = req.body || {};
  const action = body.action;
  const db = adminDb();

  try {
    // ── Buyer: photo upload to R2 (resized in the browser first) ──
    if (action === "upload-photo") {
      const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
      if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return json(res, 503, { error: "Storage not configured" });
      let user;
      try { user = await lookupUser(body.idToken); } catch { return json(res, 401, { error: "Please log in again" }); }
      const type = body.contentType;
      if (!["image/jpeg", "image/png", "image/webp"].includes(type)) return json(res, 400, { error: "Only JPG, PNG or WebP photos" });
      const bytes = Buffer.from(String(body.data || "").replace(/^data:[^;]+;base64,/, ""), "base64");
      if (!bytes.length) return json(res, 400, { error: "Photo was empty" });
      if (bytes.length > 3.5 * 1024 * 1024) return json(res, 400, { error: "Photo too large" });
      const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
      const key = `edit-orders/${user.uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const r2 = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
      const put = await r2.fetch(`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`, {
        method: "PUT", body: bytes, headers: { "Content-Type": type, "Content-Length": String(bytes.length) },
      });
      if (!put.ok) { console.error("R2 PUT failed", put.status, await put.text().catch(() => "")); return json(res, 502, { error: "Upload failed, try again" }); }
      return json(res, 200, { url: `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}` });
    }

    // ── Buyer: create the Razorpay order for an edit booking ──
    if (action === "create-order") {
      const keyId = process.env.RAZORPAY_KEY_ID, keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) return json(res, 503, { error: "Payments not configured" });
      let user;
      try { user = await lookupUser(body.idToken); } catch { return json(res, 401, { error: "Please log in again" }); }

      const top = clean(body.top, 14).toUpperCase();
      const big = clean(body.big, 15).toUpperCase().replace(/\s+/g, " ");
      const pose = clean(body.pose, 60);
      const name = clean(body.name, 80);
      const phone = clean(body.phone, 10).replace(/\D/g, "");
      const email = clean(body.email, 120);
      const note = clean(body.note, 500);
      const showOk = body.showOk !== false;
      if (!big || big.split(" ").length > 2) return json(res, 400, { error: "Big name: 1–2 words, up to 15 letters" });
      if (!/^[A-Z0-9 .&'!-]*$/.test(top + big)) return json(res, 400, { error: "Use English letters only" });
      if (!pose) return json(res, 400, { error: "Pick a pose" });
      if (!name) return json(res, 400, { error: "Type your name" });
      if (!/^[6-9]\d{9}$/.test(phone)) return json(res, 400, { error: "Enter a valid 10-digit WhatsApp number" });
      const base = `${(process.env.R2_PUBLIC_URL || "").replace(/\/$/, "")}/edit-orders/${user.uid}/`;
      const photos = (Array.isArray(body.photos) ? body.photos : []).map((p: any) => String(p)).filter((p: string) => p.startsWith(base)).slice(0, 5);
      if (!photos.length) return json(res, 400, { error: "Upload at least 1 photo" });

      const offer = await loadOffer(db);
      if (offer.open === false) return json(res, 409, { error: "Booking is closed right now" });
      if (offer.booked >= offer.total) return json(res, 409, { error: "All slots are booked", full: true });

      const slotPrice = priceForSlot(offer, offer.booked + 1);
      let upgrade = false;
      if (offer.fileProductId) {
        const us = await db.doc(`users/${user.uid}`).get();
        upgrade = ((us.data()?.purchases || []) as string[]).includes(offer.fileProductId);
      }
      const amount = Math.max(1, upgrade ? slotPrice - (Number(offer.filePrice) || 0) : slotPrice);

      const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const order = await rzp.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `titlecard-${Date.now()}`.slice(0, 40),
        notes: { kind: "titlecard", uid: user.uid, itemId: "titlecard-edit", itemName: "Title card edit" },
      });
      await db.doc(`editDrafts/${order.id}`).set({
        uid: user.uid, userEmail: user.email, top, big, pose, photos, name, phone, email, note, showOk,
        amount, slotPrice, upgrade, createdAt: new Date().toISOString(),
      });
      return json(res, 200, { orderId: order.id, amount: order.amount, currency: order.currency, keyId, itemName: "Title card edit", upgrade, price: amount });
    }

    // ── Anyone: join the waiting list (no payment) ──
    if (action === "waitlist") {
      const name = clean(body.name, 80);
      const phone = clean(body.phone, 10).replace(/\D/g, "");
      const email = clean(body.email, 120);
      if (!name || !/^[6-9]\d{9}$/.test(phone)) return json(res, 400, { error: "Name and a valid WhatsApp number needed" });
      const dupe = await db.collection("editWaitlist").where("phone", "==", phone).limit(1).get();
      if (!dupe.empty) return json(res, 200, { ok: true, position: dupe.docs[0].data().position || null, already: true });
      const ref = db.doc(OFFER_DOC);
      const position = await db.runTransaction(async tx => {
        const s = await tx.get(ref);
        const n = (Number(s.data()?.waitlist) || 0) + 1;
        tx.set(ref, { waitlist: n }, { merge: true });
        tx.create(db.collection("editWaitlist").doc(), { name, phone, email, position: n, at: new Date().toISOString(), notified: false });
        return n;
      });
      return json(res, 200, { ok: true, position });
    }

    // ── Admin ──
    if (action === "admin-list" || action === "admin-update" || action === "admin-config") {
      try { await assertAdmin(body.idToken); } catch { return json(res, 401, { error: "Not authorised" }); }

      if (action === "admin-list") {
        const [o, w] = await Promise.all([
          db.collection("editOrders").orderBy("createdAt", "desc").limit(400).get(),
          db.collection("editWaitlist").orderBy("at", "desc").limit(400).get(),
        ]);
        return json(res, 200, {
          orders: o.docs.map(d => ({ id: d.id, ...d.data() })),
          waitlist: w.docs.map(d => ({ id: d.id, ...d.data() })),
        });
      }

      if (action === "admin-update") {
        const id = clean(body.id, 40);
        const p = body.patch || {};
        const isWait = id && !id.startsWith("TC-");
        if (isWait) {
          await db.doc(`editWaitlist/${id}`).set({ notified: !!p.notified }, { merge: true });
          return json(res, 200, { ok: true });
        }
        if (p.delete === true) { await db.doc(`editOrders/${id}`).delete(); return json(res, 200, { ok: true }); }
        const patch: Record<string, any> = { updatedAt: new Date().toISOString() };
        if (["new", "editing", "delivered"].includes(p.status)) {
          patch.status = p.status;
          if (p.status === "delivered") patch.deliveredAt = new Date().toISOString();
        }
        if (typeof p.shown === "boolean") patch.shown = p.shown;
        if (typeof p.finalUrl === "string") patch.finalUrl = clean(p.finalUrl, 600);
        if (typeof p.adminNote === "string") patch.adminNote = clean(p.adminNote, 500);
        if (typeof p.revisionsUsed === "number") patch.revisionsUsed = Math.max(0, Math.min(5, p.revisionsUsed));
        await db.doc(`editOrders/${id}`).set(patch, { merge: true });

        // Public showcase = delivered orders the client allowed and you switched on.
        // Only first name + title text + the final video go public — never number/email/photos.
        if ("shown" in patch || "finalUrl" in patch || "status" in patch) {
          const all = await db.collection("editOrders").get();
          const showcase = all.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
            .filter(x => x.shown && x.showOk && x.status === "delivered" && x.finalUrl)
            .sort((a, b) => String(b.deliveredAt || "").localeCompare(String(a.deliveredAt || "")))
            .slice(0, 20)
            .map(x => ({ id: x.id, name: String(x.name || "").split(" ")[0], top: x.top || "", big: x.big || "", video: x.finalUrl }));
          await db.doc(OFFER_DOC).set({ showcase }, { merge: true });
        }
        return json(res, 200, { ok: true });
      }

      if (action === "admin-config") {
        const p = body.patch || {};
        const allowed = ["open", "total", "booked", "tiers", "batches", "filePrice", "fileProductId", "poses", "demoVideo", "poster", "bar", "homeCard", "hero", "youtubeUrl"];
        const patch: Record<string, any> = {};
        for (const k of allowed) if (k in p) patch[k] = p[k];
        if ("total" in patch) patch.total = Math.max(1, Math.min(1000, Number(patch.total) || 100));
        if ("booked" in patch) patch.booked = Math.max(0, Math.min(1000, Math.floor(Number(patch.booked) || 0)));
        await db.doc(OFFER_DOC).set(patch, { merge: true });
        return json(res, 200, { ok: true });
      }
    }

    return json(res, 400, { error: "Unknown action" });
  } catch (e: any) {
    console.error("titlecard failed:", action, e);
    return json(res, 500, { error: "Something went wrong, please try again" });
  }
}
