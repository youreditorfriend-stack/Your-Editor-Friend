import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { adminAuthBody } from "./adminAuth";

// A review the admin adds by hand — e.g. a WhatsApp message, a client's voice
// note or a screenshot — shown on the home page as social proof.
export interface Testimonial {
  id: string;
  name: string;
  uid?: string;          // linked site user (optional)
  productId?: string;
  productName?: string;
  rating?: number;       // 1-5
  text?: string;
  audioUrl?: string;     // voice note
  imageUrl?: string;     // screenshot / photo
  source: "whatsapp" | "instagram" | "email" | "site" | "other";
  featured: boolean;     // shown on the website
  createdAt: string;
}

export function useTestimonials(featuredOnly = false) {
  const [list, setList] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "testimonials"), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Testimonial, "id">) }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setList(featuredOnly ? all.filter(t => t.featured) : all);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [featuredOnly]);
  return { list, loading };
}

export const addTestimonial = (t: Omit<Testimonial, "id">) => {
  // Firestore rejects undefined values — drop empty fields.
  const clean = Object.fromEntries(Object.entries(t).filter(([, v]) => v !== undefined && v !== ""));
  return addDoc(collection(db, "testimonials"), clean);
};
export const setFeatured = (id: string, featured: boolean) => updateDoc(doc(db, "testimonials", id), { featured });
export const removeTestimonial = (id: string) => deleteDoc(doc(db, "testimonials", id));

// Voice notes / any file: presigned upload straight to Cloudflare R2.
export async function uploadAnyFile(file: File): Promise<string> {
  const res = await fetch("/api/upload-file-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, ...(await adminAuthBody()) }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Upload failed (${res.status})`);
  const put = await fetch(body.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
  if (!put.ok) throw new Error(`Storage rejected the upload (${put.status})`);
  return body.publicUrl as string;
}
