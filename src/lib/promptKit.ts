import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { adminAuthBody } from "./adminAuth";
import type { PromptKitPrivate, PromptKitPublic } from "./store";

// ─── Firestore ────────────────────────────────────────────────────────────────

export async function loadKitPublic(productId: string): Promise<PromptKitPublic | null> {
  const s = await getDoc(doc(db, "promptKitsPublic", productId));
  return s.exists() ? (s.data() as PromptKitPublic) : null;
}

// Throws permission-denied for a paid kit the viewer hasn't bought.
export async function loadKitPrivate(productId: string): Promise<PromptKitPrivate | null> {
  const s = await getDoc(doc(db, "promptKitsPrivate", productId));
  return s.exists() ? (s.data() as PromptKitPrivate) : null;
}

export async function saveKit(productId: string, pub: PromptKitPublic, priv: PromptKitPrivate) {
  await Promise.all([
    setDoc(doc(db, "promptKitsPublic", productId), pub),
    setDoc(doc(db, "promptKitsPrivate", productId), priv),
  ]);
}

// "Done" ticks: signed-in buyers → Firestore (works across devices);
// everyone else → this browser only.
const lsKey = (pid: string) => `yef-kit-done-${pid}`;
export async function loadProgress(uid: string | undefined, productId: string): Promise<Record<string, boolean>> {
  if (uid) {
    try {
      const s = await getDoc(doc(db, "users", uid, "promptProgress", productId));
      if (s.exists()) return (s.data().done || {}) as Record<string, boolean>;
    } catch { /* fall back to local */ }
  }
  try { return JSON.parse(localStorage.getItem(lsKey(productId)) || "{}"); } catch { return {}; }
}
export async function saveProgress(uid: string | undefined, productId: string, done: Record<string, boolean>) {
  try { localStorage.setItem(lsKey(productId), JSON.stringify(done)); } catch { /* private mode */ }
  if (uid) {
    try { await setDoc(doc(db, "users", uid, "promptProgress", productId), { done }); } catch { /* local copy kept */ }
  }
}

// ─── Upload ───────────────────────────────────────────────────────────────────

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(b); });

export async function uploadImageBlob(blob: Blob, filename: string): Promise<string> {
  const res = await fetch("/api/upload-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: await blobToDataUrl(blob), contentType: blob.type || "image/webp", filename, ...(await adminAuthBody()) }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Upload failed (${res.status})`);
  return body.url as string;
}

// ─── PSD → layers ─────────────────────────────────────────────────────────────

export interface ParsedLayer { name: string; blob: Blob; blend?: string }
export interface ParsedPsd { width: number; height: number; cover: Blob; layers: ParsedLayer[] }

const MAX_SIDE = 1600; // keeps each layer upload small (API limit 8 MB)

// Photoshop blend names → CSS / canvas names
const BLEND: Record<string, string> = {
  multiply: "multiply", screen: "screen", overlay: "overlay", darken: "darken", lighten: "lighten",
  "color dodge": "color-dodge", "color burn": "color-burn", "hard light": "hard-light", "soft light": "soft-light",
  difference: "difference", exclusion: "exclusion", hue: "hue", saturation: "saturation", color: "color",
  luminosity: "luminosity", "linear dodge": "lighter",
};

// A PSD saved without "Maximize compatibility" stores a blank flattened
// image — one flat colour. Detect that on a tiny sample.
function isBlank(c: HTMLCanvasElement) {
  const s = document.createElement("canvas"); s.width = 24; s.height = 24;
  const g = s.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(c, 0, 0, 24, 24);
  const d = g.getImageData(0, 0, 24, 24).data;
  for (let i = 4; i < d.length; i += 4) {
    if (Math.abs(d[i] - d[0]) > 3 || Math.abs(d[i + 1] - d[1]) > 3 || Math.abs(d[i + 2] - d[2]) > 3 || Math.abs(d[i + 3] - d[3]) > 3) return false;
  }
  return true;
}

const toBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("Could not encode layer"))), "image/webp", 0.92));

// Reads a PSD in the browser. Every visible top-level layer (or group, merged)
// becomes one layer image drawn on the full canvas size, so the layers stack
// back exactly like in Photoshop.
export async function parsePsd(file: File): Promise<ParsedPsd> {
  // Loaded only when the admin drops a PSD. ag-psd is CommonJS, so depending on
  // the bundler its functions sit on the module or on `default`.
  const mod: any = await import("ag-psd");
  const readPsd: typeof import("ag-psd").readPsd = mod.readPsd || mod.default?.readPsd;
  if (!readPsd) throw new Error("PSD reader failed to load");
  const psd = readPsd(await file.arrayBuffer(), { skipThumbnail: true });
  const scale = Math.min(1, MAX_SIDE / Math.max(psd.width, psd.height));
  const W = Math.round(psd.width * scale), H = Math.round(psd.height * scale);

  const newCanvas = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
  const drawNode = (ctx: CanvasRenderingContext2D, node: any, useBlend: boolean) => {
    if (node.hidden) return;
    if (node.children) { node.children.forEach((ch: any) => drawNode(ctx, ch, true)); return; }
    if (!node.canvas) return;
    ctx.save();
    ctx.globalAlpha = node.opacity ?? 1;
    const b = useBlend ? BLEND[node.blendMode] : undefined;
    if (b) ctx.globalCompositeOperation = b as GlobalCompositeOperation;
    ctx.drawImage(node.canvas, (node.left || 0) * scale, (node.top || 0) * scale, node.canvas.width * scale, node.canvas.height * scale);
    ctx.restore();
  };

  const tops = (psd.children || []).filter((n: any) => !n.hidden);
  if (!tops.length) throw new Error("No visible layers found in this PSD");

  const layers: ParsedLayer[] = [];
  for (const node of tops) {
    const c = newCanvas();
    drawNode(c.getContext("2d")!, { ...node, blendMode: "normal" }, false);
    layers.push({ name: node.name || "Layer", blob: await toBlob(c), blend: BLEND[(node as any).blendMode] });
  }

  // Cover: Photoshop's own flattened image when saved with "Maximize
  // compatibility", otherwise our own merge of the layers.
  const cover = newCanvas();
  const cctx = cover.getContext("2d")!;
  const stored: HTMLCanvasElement | undefined = (psd as any).canvas;
  if (stored && !isBlank(stored)) cctx.drawImage(stored, 0, 0, W, H);
  else tops.forEach((n: any) => drawNode(cctx, n, true));

  return { width: W, height: H, cover: await toBlob(cover), layers };
}

// Reference images: shrink big photos before upload (API limit 8 MB).
export async function imageFileToWebp(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await toBlob(c);
  } finally { URL.revokeObjectURL(url); }
}

export const newId =(p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
