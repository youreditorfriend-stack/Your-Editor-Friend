// Shared helpers for Vercel serverless functions.
// Required environment variables (set in Vercel → Project → Settings → Environment Variables):
//   RAZORPAY_KEY_ID          — from Razorpay Dashboard → Account & Settings → API Keys
//   RAZORPAY_KEY_SECRET      — same place (keep secret!)
//   FIREBASE_SERVICE_ACCOUNT — full JSON of a Firebase service account key
//                              (Firebase Console → Project Settings → Service accounts → Generate new private key)

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function adminDb() {
  if (!getApps().length) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
    initializeApp({ credential: cert(svc) });
  }
  return getFirestore();
}

export interface StoreItem {
  id: string;
  price: number;
  name: string;
}

// Server-side price lookup so the client can never tamper with amounts
export async function findItem(itemId: string): Promise<StoreItem | null> {
  const snap = await adminDb().doc("store/data").get();
  if (!snap.exists) return null;
  const d = snap.data() || {};
  const all = [
    ...(d.products || []).map((p: any) => ({ id: p.id, price: p.price, name: p.name })),
    ...(d.courses || []).map((c: any) => ({ id: c.id, price: c.price, name: c.title })),
  ];
  return all.find((i: StoreItem) => i.id === itemId) || null;
}

export function json(res: any, status: number, body: any) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}
