// POST /api/upload-image  { filename, contentType, data (base64), adminPassword }
// Uploads the image to Cloudflare R2 from the server, so the browser never
// talks to R2 directly and no bucket CORS setup is needed.
// The client resizes images before sending, keeping bodies well under
// Vercel's request size limit.
//
// Required env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//                    R2_BUCKET, R2_PUBLIC_URL, FIREBASE_SERVICE_ACCOUNT
import { AwsClient } from "aws4fetch";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

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
  const missing = Object.entries({
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_PUBLIC_URL,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) return json(res, 503, { error: "R2 not configured", missing });

  try {
    const { filename, contentType, data, adminPassword } = req.body || {};
    if (!filename || !contentType || !data) {
      return json(res, 400, { error: "filename, contentType and data are required" });
    }
    if (!ALLOWED.includes(contentType)) {
      return json(res, 400, { error: "Only JPG, PNG, WebP, GIF or AVIF images are allowed" });
    }

    // Only the admin may upload
    const snap = await adminDb().doc("portfolio/data").get();
    const realPassword = snap.exists ? snap.data()?.adminPassword : null;
    if (!realPassword || adminPassword !== realPassword) {
      return json(res, 401, { error: "Not authorised — log out of the admin panel and log in again" });
    }

    const bytes = Buffer.from(String(data).replace(/^data:[^;]+;base64,/, ""), "base64");
    if (!bytes.length) return json(res, 400, { error: "Image data was empty" });

    const key = `thumbnails/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(filename)}`;

    const r2 = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
      service: "s3",
      region: "auto",
    });

    const put = await r2.fetch(
      `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`,
      {
        method: "PUT",
        body: bytes,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(bytes.length),
        },
      }
    );

    if (!put.ok) {
      const detail = await put.text().catch(() => "");
      console.error("R2 PUT failed:", put.status, detail);
      return json(res, 502, { error: `Storage rejected the upload (${put.status})` });
    }

    return json(res, 200, { url: `${R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}` });
  } catch (e) {
    console.error("upload-image failed:", e);
    return json(res, 500, { error: "Upload failed on the server" });
  }
}
