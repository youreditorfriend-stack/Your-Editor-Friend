// GET /api/item-page?kind=product|course&id=<id>
// Fetches the SPA's index.html and injects og:* / twitter:* tags for this
// specific product or course, so WhatsApp / Instagram / Twitter show a real
// preview card instead of the site's generic one.
//
// A vercel.json rewrite points /products/:id and /courses/:id here BEFORE the
// SPA catch-all — so every visitor (human or bot) gets the enriched HTML.
// NOTE: self-contained — no imports from src/, no firebase-admin/auth.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function adminDb() {
  if (!getApps().length) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
    initializeApp({ credential: cert(svc) });
  }
  return getFirestore();
}

// HTML-escape untrusted strings before dropping them into an attribute
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Trim to a single-line summary for og:description
function summarise(text: string, max = 200): string {
  const clean = text.replace(/[#*_`>\-]+/g, "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

async function loadItem(kind: string, id: string) {
  const snap = await adminDb().doc("store/data").get();
  if (!snap.exists) return null;
  const d = snap.data() || {};
  const list = kind === "course" ? d.courses : d.products;
  const raw = (list || []).find((x: any) => x.id === id && x.enabled !== false);
  if (!raw) return null;
  return kind === "course"
    ? { title: raw.title, image: raw.thumbnail, price: raw.price, tagline: raw.tagline, description: raw.description }
    : { title: raw.name, image: raw.image, price: raw.price, tagline: raw.tagline, description: raw.description };
}

export default async function handler(req: any, res: any) {
  const kind = String(req.query?.kind || "product");
  const id = String(req.query?.id || "");
  if (!id || (kind !== "product" && kind !== "course")) {
    res.status(400).send("Bad request");
    return;
  }

  try {
    const item = await loadItem(kind, id);

    // Always fall through to the SPA — even for unknown ids, so the React
    // router's redirect can run and the user isn't stranded on a bare error.
    const host = (req.headers["x-forwarded-host"] || req.headers.host) as string;
    const proto = ((req.headers["x-forwarded-proto"] as string) || "https").split(",")[0];
    const origin = `${proto}://${host}`;
    const canonical = `${origin}/${kind === "course" ? "courses" : "products"}/${id}`;

    const shellRes = await fetch(`${origin}/index.html`);
    let html = await shellRes.text();

    if (item) {
      const title = `${item.title} · Your Editor Friend`;
      const desc =
        summarise(item.description || item.tagline || `${item.title} — buy on Your Editor Friend`, 200);
      const image = item.image || "";

      const tags = [
        `<meta property="og:type" content="product">`,
        `<meta property="og:url" content="${esc(canonical)}">`,
        `<meta property="og:title" content="${esc(title)}">`,
        `<meta property="og:description" content="${esc(desc)}">`,
        image ? `<meta property="og:image" content="${esc(image)}">` : "",
        image ? `<meta property="og:image:width" content="1080">` : "",
        image ? `<meta property="og:image:height" content="${kind === "course" ? 608 : 1080}">` : "",
        item.price
          ? `<meta property="product:price:amount" content="${Number(item.price).toFixed(2)}">`
          : "",
        `<meta property="product:price:currency" content="INR">`,
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${esc(title)}">`,
        `<meta name="twitter:description" content="${esc(desc)}">`,
        image ? `<meta name="twitter:image" content="${esc(image)}">` : "",
        `<link rel="canonical" href="${esc(canonical)}">`,
        `<title>${esc(title)}</title>`,
      ]
        .filter(Boolean)
        .join("\n    ");

      // Drop the shell's own <title> — our injected one replaces it.
      html = html.replace(/<title>[^<]*<\/title>/i, "");
      html = html.replace(/<\/head>/i, `    ${tags}\n  </head>`);
    }

    res
      .status(200)
      .setHeader("Content-Type", "text/html; charset=utf-8")
      // Public cache: a few minutes fresh, then serve stale while revalidating.
      .setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600")
      .send(html);
  } catch (e) {
    console.error("item-page failed:", e);
    // On failure, forward to the plain SPA so the page still loads.
    res.status(302).setHeader("Location", `/`).send("");
  }
}
