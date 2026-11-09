// Title card launch offer — shared config, live slot counter and API helpers.
// The offer lives in Firestore at store/titlecard (public read; only the
// server writes it — bookings via /api/verify-payment, settings via
// /api/titlecard admin-config).
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

export interface Tier { upTo: number; price: number }
export interface Batch { name: string; from: number; to: number; date: string }
export interface Pose { id: string; name: string; img: string }
export interface ShowcaseItem { id: string; name: string; top: string; big: string; video: string }
export interface TitleCardOffer {
  open: boolean;
  total: number;
  booked: number;
  waitlist: number;
  filePrice: number;
  fileProductId: string;
  tiers: Tier[];
  batches: Batch[];
  poses: Pose[];
  demoVideo: string;
  poster: string;
  youtubeUrl: string;
  showcase: ShowcaseItem[];
  bar: { on: boolean; text: string };
  homeCard: { on: boolean };
  hero: { tag: string; l1: string; l2: string; sub: string } | null;
}

// Keep tiers/total in sync with api/titlecard.ts (DEFAULTS)
export const DEFAULT_OFFER: TitleCardOffer = {
  open: true,
  total: 100,
  booked: 0,
  waitlist: 0,
  filePrice: 499,
  fileProductId: "",
  tiers: [{ upTo: 35, price: 1499 }, { upTo: 100, price: 1999 }],
  batches: [
    { name: "Batch 1", from: 1, to: 35, date: "" },
    { name: "Batch 2", from: 36, to: 70, date: "" },
    { name: "Batch 3", from: 71, to: 100, date: "" },
  ],
  poses: [],
  demoVideo: "/titlecard/preview.mp4",
  poster: "/titlecard/poster.jpg",
  youtubeUrl: "",
  showcase: [],
  bar: { on: true, text: "🔥 Title card offer · only {left} slots left" },
  homeCard: { on: true },
  hero: null,
};

// The home page hero as it is today — "Restore original" brings this back.
export const ORIGINAL_HERO = {
  tag: "MADE FOR TAMIL EDITORS",
  l1: "Mass title cards.",
  l2: "Ready in minutes.",
  sub: "Tamil cinema-style templates for After Effects & Premiere Pro.",
};

export const REGULAR_PRICE = 1999;

let cache: TitleCardOffer | null = null;
const listeners = new Set<(o: TitleCardOffer) => void>();
let unsub: (() => void) | null = null;

/** Live offer (slots update the moment someone books). */
export function useTitleCardOffer(): { offer: TitleCardOffer; loaded: boolean } {
  const [offer, setOffer] = useState<TitleCardOffer>(cache || DEFAULT_OFFER);
  const [loaded, setLoaded] = useState(!!cache);
  useEffect(() => {
    const fn = (o: TitleCardOffer) => { setOffer(o); setLoaded(true); };
    listeners.add(fn);
    if (!unsub) {
      unsub = onSnapshot(doc(db, "store", "titlecard"), snap => {
        const d = (snap.exists() ? snap.data() : {}) as Partial<TitleCardOffer>;
        cache = { ...DEFAULT_OFFER, ...d, bar: { ...DEFAULT_OFFER.bar, ...(d.bar || {}) }, homeCard: { ...DEFAULT_OFFER.homeCard, ...(d.homeCard || {}) } };
        listeners.forEach(l => l(cache!));
      }, () => { cache = cache || DEFAULT_OFFER; listeners.forEach(l => l(cache!)); });
    }
    return () => { listeners.delete(fn); };
  }, []);
  return { offer, loaded };
}

export function sortedTiers(o: TitleCardOffer) {
  return [...(o.tiers?.length ? o.tiers : DEFAULT_OFFER.tiers)].sort((a, b) => a.upTo - b.upTo);
}
export function priceForSlot(o: TitleCardOffer, slot: number) {
  const t = sortedTiers(o);
  return (t.find(x => slot <= x.upTo) || t[t.length - 1]).price;
}
export const nextSlot = (o: TitleCardOffer) => Math.min(o.booked + 1, o.total);
export const isFull = (o: TitleCardOffer) => o.booked >= o.total;
export function batchForSlot(o: TitleCardOffer, slot: number) {
  return (o.batches || []).find(b => slot >= b.from && slot <= b.to) || null;
}

async function call(body: Record<string, any>) {
  const r = await fetch("/api/titlecard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const isJson = (r.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await r.json().catch(() => ({})) : {};
  if (!r.ok) throw Object.assign(new Error(data?.error || `Request failed (${r.status})`), { data, status: r.status });
  return data;
}
async function token() {
  const u = auth.currentUser;
  if (!u) throw new Error("Please log in first");
  return u.getIdToken();
}

/** Shorter side of an image in pixels (used to block tiny photos). */
export function imageShortSide(file: File): Promise<number> {
  return new Promise(res => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => { res(Math.min(i.naturalWidth, i.naturalHeight)); URL.revokeObjectURL(url); };
    i.onerror = () => { res(0); URL.revokeObjectURL(url); };
    i.src = url;
  });
}

// Resize in the browser (max 2000px, JPEG) so uploads stay small and fast.
async function toJpeg(file: File, max = 2000): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.88);
  } finally { URL.revokeObjectURL(url); }
}

export async function uploadPhoto(file: File): Promise<string> {
  const data = await toJpeg(file);
  const d = await call({ action: "upload-photo", idToken: await token(), contentType: "image/jpeg", data });
  return d.url;
}

export interface BookingInput { top: string; big: string; pose: string; photos: string[]; name: string; phone: string; email: string; note: string; showOk: boolean }
export async function createEditOrder(input: BookingInput) {
  return call({ action: "create-order", idToken: await token(), ...input });
}
export async function joinWaitlist(name: string, phone: string, email: string) {
  return call({ action: "waitlist", name, phone, email });
}

// ── Admin ──
export async function adminList() { return call({ action: "admin-list", idToken: await token() }); }
export async function adminUpdate(id: string, patch: Record<string, any>) { return call({ action: "admin-update", idToken: await token(), id, patch }); }
export async function adminConfig(patch: Partial<TitleCardOffer>) { return call({ action: "admin-config", idToken: await token(), patch }); }
