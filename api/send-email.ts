// POST /api/send-email  { idToken, to: string[], subject, heading?, body, ctaLabel?, ctaUrl? }
// Admin-only. Sends a branded HTML email (via Resend) to one or many
// recipients — used by the admin Users panel to, e.g., apologise to buyers
// hit by a checkout outage and tell them purchases work again.
// NOTE: self-contained — Vercel functions can't resolve extensionless
// relative TS imports at runtime, so helpers are inlined (see create-order.ts).

// Keep in sync with src/lib/adminAuth.ts
const ADMIN_EMAILS = ["youreditorfriend@gmail.com"];

// Public web API key (identifies the project, does not grant access).
const FIREBASE_API_KEY = "AIzaSyBqgmzrNelS701uQ1ngLvcoatUkcBuiRic";

const SITE_URL = process.env.SITE_URL || "https://www.youreditorfriend.in";

// Verify the caller is a signed-in owner account via Google's REST endpoint
// (keeps firebase-admin/auth's ESM-only jose dependency out of the bundle).
async function assertAdmin(idToken?: string) {
  if (!idToken) throw new Error("Not signed in");
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!r.ok) throw new Error("Invalid or expired sign-in");
  const user = (await r.json())?.users?.[0];
  const email = user?.email?.toLowerCase();
  if (!email || !user.emailVerified || !ADMIN_EMAILS.includes(email)) {
    throw new Error("Not an admin account");
  }
  return email;
}

function json(res: any, status: number, body: any) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

function esc(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Plain text → HTML paragraphs (blank line = new paragraph, single newline = <br>).
function bodyToHtml(body: string) {
  return esc(body)
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px;color:#d4d4d8;font-size:14px;line-height:1.7">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function renderEmail(opts: { heading?: string; body: string; ctaLabel?: string; ctaUrl?: string }) {
  const { heading, body, ctaLabel, ctaUrl } = opts;
  const cta = ctaLabel && ctaUrl
    ? `<a href="${esc(ctaUrl)}" style="display:block;background:#25D366;color:#000000;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:bold;font-size:15px;margin-top:8px">${esc(ctaLabel)}</a>`
    : "";
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#ffffff;border-radius:16px;overflow:hidden">
    <div style="padding:28px 28px 20px;border-bottom:1px solid #222">
      <div style="font-size:12px;letter-spacing:3px;color:#E50914;font-weight:bold">YOUR EDITOR FRIEND</div>
    </div>
    <div style="padding:28px">
      ${heading ? `<h1 style="margin:0 0 16px;font-size:22px">${esc(heading)}</h1>` : ""}
      ${bodyToHtml(body)}
      ${cta}
    </div>
    <div style="padding:16px 28px;border-top:1px solid #222;color:#52525b;font-size:11px">
      Your Editor Friend · <a href="${SITE_URL}" style="color:#71717a">${SITE_URL.replace("https://", "")}</a>
    </div>
  </div>`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return json(res, 503, { error: "Email not configured (RESEND_API_KEY missing)" });

  try {
    const { idToken, to, subject, heading, body, ctaLabel, ctaUrl } = req.body || {};

    try {
      await assertAdmin(idToken);
    } catch {
      return json(res, 401, { error: "Not authorised — sign in with the owner's Google account" });
    }

    const recipients: string[] = Array.isArray(to)
      ? [...new Set(to.map((e: any) => String(e || "").trim().toLowerCase()).filter((e: string) => e.includes("@")))]
      : [];
    if (recipients.length === 0) return json(res, 400, { error: "No valid recipient emails" });
    if (!subject || !body) return json(res, 400, { error: "subject and body are required" });
    if (recipients.length > 500) return json(res, 400, { error: "Too many recipients (max 500 per send)" });

    const html = renderEmail({ heading, body, ctaLabel, ctaUrl });
    const from = process.env.EMAIL_FROM || "Your Editor Friend <onboarding@resend.dev>";

    // Send individually so recipients never see each other's addresses (BCC on
    // a single message would still be one API call, but Resend caps `bcc`; a
    // per-recipient loop keeps each mail private and returns an accurate
    // sent/failed tally). Bounded by the 500 cap above.
    let sent = 0;
    const failed: string[] = [];
    for (const email of recipients) {
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [email], subject, html }),
        });
        if (resp.ok) sent++;
        else { failed.push(email); console.error("Resend error:", email, resp.status, await resp.text()); }
      } catch (e) {
        failed.push(email);
        console.error("Resend send failed:", email, e);
      }
    }

    return json(res, 200, { ok: true, sent, failed });
  } catch (e) {
    console.error("send-email failed:", e);
    return json(res, 500, { error: "Failed to send email" });
  }
}
