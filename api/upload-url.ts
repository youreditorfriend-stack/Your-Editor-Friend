// POST /api/upload-url  { filename, contentType, adminPassword }
// Returns a short-lived presigned PUT URL for Cloudflare R2 plus the final
// public URL to store alongside the product/course.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   R2_ACCOUNT_ID         — Cloudflare dashboard → R2 → Account ID
//   R2_ACCESS_KEY_ID      — R2 → Manage API Tokens → Create (Object Read & Write)
//   R2_SECRET_ACCESS_KEY  — shown once when creating the token
//   R2_BUCKET             — your bucket name, e.g. yef-uploads
//   R2_PUBLIC_URL         — bucket's public URL, e.g. https://pub-xxxx.r2.dev
import { AwsClient } from "aws4fetch";
import { adminDb, json } from "./_lib";

const MAX_MB = 10;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

// "My Thumb (1).PNG" → "my-thumb-1.png"
function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const ext = (dot > 0 ? name.slice(dot + 1) : "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${base || "image"}.${ext || "jpg"}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
    return json(res, 503, { error: "R2 not configured" });
  }

  try {
    const { filename, contentType, adminPassword } = req.body || {};
    if (!filename || !contentType) return json(res, 400, { error: "filename and contentType are required" });
    if (!ALLOWED.includes(contentType)) return json(res, 400, { error: "Only JPG, PNG, WebP, GIF or AVIF images are allowed" });

    // Only the admin may request upload URLs
    const snap = await adminDb().doc("portfolio/data").get();
    const realPassword = snap.exists ? snap.data()?.adminPassword : null;
    if (!realPassword || adminPassword !== realPassword) {
      return json(res, 401, { error: "Not authorised" });
    }

    const key = `thumbnails/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(filename)}`;
    const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;

    const r2 = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      service: "s3",
      region: "auto",
    });

    // Presigned PUT, valid for 5 minutes
    const signed = await r2.sign(
      new Request(`${endpoint}?X-Amz-Expires=300`, { method: "PUT" }),
      { aws: { signQuery: true } }
    );

    return json(res, 200, {
      uploadUrl: signed.url,
      publicUrl: `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`,
      maxMB: MAX_MB,
    });
  } catch (e) {
    console.error("upload-url failed:", e);
    return json(res, 500, { error: "Failed to create upload URL" });
  }
}
