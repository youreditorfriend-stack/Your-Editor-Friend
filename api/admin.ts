// POST /api/admin  { idToken, action }
// One admin-only endpoint for small dashboard tools, so the project stays
// under Vercel Hobby's 12-function limit.
//   action "r2-usage" → total size + file count of the Cloudflare R2 bucket,
//                        and the 8 biggest files.
// NOTE: self-contained (no relative imports) — see create-order.ts.
import { AwsClient } from "aws4fetch";

const ADMIN_EMAILS = ["youreditorfriend@gmail.com"];
const FIREBASE_API_KEY = "AIzaSyBqgmzrNelS701uQ1ngLvcoatUkcBuiRic";

async function assertAdmin(idToken?: string) {
  if (!idToken) throw new Error("Not signed in");
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }),
  });
  if (!r.ok) throw new Error("Invalid sign-in");
  const user = (await r.json())?.users?.[0];
  const email = user?.email?.toLowerCase();
  if (!email || !user.emailVerified || !ADMIN_EMAILS.includes(email)) throw new Error("Not admin");
}

function json(res: any, status: number, body: any) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

const tag = (xml: string, name: string) => [...xml.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "g"))].map(m => m[1]);

async function r2Usage() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return { error: "R2 not configured" };
  const r2 = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
  let token = "", bytes = 0, count = 0, pages = 0, truncated = false;
  const files: { key: string; size: number }[] = [];
  const byFolder: Record<string, number> = {};
  do {
    const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}?list-type=2&max-keys=1000${token ? `&continuation-token=${encodeURIComponent(token)}` : ""}`;
    const r = await r2.fetch(url);
    if (!r.ok) return { error: `List failed (${r.status})` };
    const xml = await r.text();
    const keys = tag(xml, "Key"), sizes = tag(xml, "Size").map(Number);
    keys.forEach((k, i) => {
      const s = sizes[i] || 0; bytes += s; count++;
      const folder = k.split("/")[0] || "other"; byFolder[folder] = (byFolder[folder] || 0) + s;
      files.push({ key: k, size: s });
    });
    files.sort((a, b) => b.size - a.size).splice(8);
    truncated = tag(xml, "IsTruncated")[0] === "true";
    token = tag(xml, "NextContinuationToken")[0] || "";
    pages++;
  } while (truncated && token && pages < 30);
  const base = (R2_PUBLIC_URL || "").replace(/\/$/, "");
  return {
    bytes, count, byFolder, partial: truncated,
    biggest: files.map(f => ({ name: f.key.split("/").pop(), size: f.size, url: base ? `${base}/${f.key}` : "" })),
    freeLimitBytes: 10 * 1024 ** 3,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const { idToken, action } = req.body || {};
  try { await assertAdmin(idToken); } catch { return json(res, 401, { error: "Not authorised" }); }
  try {
    if (action === "r2-usage") return json(res, 200, await r2Usage());
    return json(res, 400, { error: "Unknown action" });
  } catch (e: any) {
    console.error("admin api failed:", e);
    return json(res, 500, { error: "Failed" });
  }
}
