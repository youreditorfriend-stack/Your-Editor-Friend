// POST /api/upload-file-url  { filename, contentType, idToken }
// Returns a short-lived presigned PUT URL so the browser can send a product
// file (ZIP, presets, LUTs…) straight to Cloudflare R2. Product files are far
// too big to pass through a serverless function, so this is the one upload
// that talks to R2 directly — which is why the bucket needs a CORS rule.
import { AwsClient } from "aws4fetch";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Keep in sync with src/lib/adminAuth.ts
const ADMIN_EMAILS = ["youreditorfriend@gmail.com"];

function initAdmin() {
  if (!getApps().length) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
    initializeApp({ credential: cert(svc) });
  }
}

async function assertAdmin(idToken?: string) {
  if (!idToken) throw new Error("Not signed in");
  initAdmin();
  const decoded = await getAuth().verifyIdToken(idToken);
  const email = decoded.email?.toLowerCase();
  if (!email || !decoded.email_verified || !ADMIN_EMAILS.includes(email)) {
    throw new Error("Not an admin account");
  }
}

function json(res: any, status: number, body: any) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

// "Transitions Pack v2.ZIP" → "transitions-pack-v2.zip"
function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const ext = (dot > 0 ? name.slice(dot + 1) : "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext ? `${base || "file"}.${ext}` : base || "file";
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
    const { filename, contentType, idToken } = req.body || {};
    if (!filename) return json(res, 400, { error: "filename is required" });

    try {
      await assertAdmin(idToken);
    } catch {
      return json(res, 401, { error: "Not authorised — sign in with the owner's Google account" });
    }

    // Unguessable key, so a product file can't be found by walking the bucket
    const key = `files/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName(filename)}`;

    const r2 = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
      service: "s3",
      region: "auto",
    });

    // Presigned PUT, valid for 30 minutes (big files take a while)
    const signed = await r2.sign(
      new Request(`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}?X-Amz-Expires=1800`, {
        method: "PUT",
      }),
      { aws: { signQuery: true } }
    );

    return json(res, 200, {
      uploadUrl: signed.url,
      publicUrl: `${R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`,
      contentType: contentType || "application/octet-stream",
    });
  } catch (e) {
    console.error("upload-file-url failed:", e);
    return json(res, 500, { error: "Failed to create upload URL" });
  }
}
