import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./titlecard.css";
import { useAuth } from "../src/lib/auth";
import { useStore } from "../src/lib/store";
import { usePurchase } from "../src/lib/purchase";
import { getWhatsAppLink } from "../src/lib/site";
import { useTestimonials } from "../src/lib/testimonials";
import { createSimpleEditOrder, useTitleCardOffer } from "../src/lib/titlecard";
import { loadRazorpay } from "../src/lib/purchase";
import { track } from "../src/lib/track";
import {
  EDIT_TIERS, EXAMPLES, PROJECT_FILE, SEND_ON_WHATSAPP, SHOW_SOCIAL_PROOF, SOCIAL_PROOF_COUNT, paidMessage, waText,
} from "../src/config/titlecardPricing";

const Check = () => (
  <span className="yes"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span>
);

function useAnton() {
  useEffect(() => {
    if (document.getElementById("font-anton")) return;
    const l = document.createElement("link");
    l.id = "font-anton"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Anton&display=swap";
    document.head.appendChild(l);
  }, []);
}

const EDIT = EDIT_TIERS[0];



const TitleCard: React.FC = () => {
  useAnton();
  const { offer } = useTitleCardOffer();
  const { user, profile, signIn } = useAuth();
  const { store } = useStore();
  const { buy, paying, owns } = usePurchase();
  const { list: testimonials } = useTestimonials(true);

  const fileProduct = store?.products.find(p => p.id === offer.fileProductId);
  const owned = !!offer.fileProductId && (owns(offer.fileProductId) || !!profile?.purchases?.includes(offer.fileProductId));
  const reviews = testimonials.filter(t => t.text && (t.productId === "titlecard-edit" || (offer.fileProductId && t.productId === offer.fileProductId)));

  useEffect(() => { document.title = "Your Name, Cinematic Title Card | Your Editor Friend"; }, []);

  // project file success event (owned flips true after a buy started here)
  const started = useRef(false);
  useEffect(() => { if (owned && started.current) { started.current = false; track("project_file_payment_success", { price: PROJECT_FILE.price }); } }, [owned]);

  const [toastMsg, setToastMsg] = useState("");
  const toast = (m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(""), 2600); };
  const buyFile = () => {
    if (!fileProduct) return toast("Project file is coming soon");
    started.current = true;
    track("project_file_checkout_started", { price: PROJECT_FILE.price });
    buy(fileProduct);
  };

  const vidRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const heroCtaRef = useRef<HTMLDivElement>(null);
  const [sticky, setSticky] = useState(false);
  useEffect(() => {
    // show the phone sticky bar once the hero buttons have scrolled away
    const el = heroCtaRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setSticky(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el); return () => io.disconnect();
  }, []);

  const helpWa = getWhatsAppLink("Hi! I have a question about the SCENE title card.");
  const fileBtn = (cls = "btn wa big") => owned
    ? <Link className="btn ghost big" to="/my-library">✓ Owned · My Library</Link>
    : <button className={cls} onClick={buyFile} disabled={!!paying}>{fileProduct ? `Buy project file · ₹${PROJECT_FILE.price}` : "Coming soon"}</button>;

  // ── ₹599 edit: name on the site → Razorpay → WhatsApp (only after paying)
  const editPrice = owned ? EDIT.price - PROJECT_FILE.price : EDIT.price;
  const [sheet, setSheet] = useState(false);
  const [big, setBig] = useState("");
  const [top, setTop] = useState("");
  const [willSend, setWillSend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [doneId, setDoneId] = useState("");
  useEffect(() => { document.body.style.overflow = sheet ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [sheet]);
  const openEdit = () => { setErr(""); setSheet(true); track("edit_sheet_open", { price: editPrice }); };
  const onBig = (v: string) => {
    let s = v.toUpperCase().replace(/[^A-Z0-9 .&'!-]/g, "").replace(/\s{2,}/g, " ").replace(/^\s+/, "");
    if (/^\S+ \S+ /.test(s)) s = s.split(" ").filter(Boolean).slice(0, 2).join(" ");
    setBig(s.slice(0, 15));
  };
  const waAfterPay = doneId ? waText(paidMessage(doneId, big.trim(), top.trim())) : "";
  const payEdit = async () => {
    setErr("");
    if (!big.trim()) return setErr("Type the name to show on the card");
    if (!willSend) return setErr("Tick the box — you'll send your photos on WhatsApp after paying");
    if (!user) { try { await signIn(); } catch { return; } }
    setBusy(true);
    try {
      track("edit_checkout_started", { price: editPrice });
      const order = await createSimpleEditOrder(big.trim(), top.trim(), user?.displayName || "");
      const ok = await loadRazorpay();
      if (!ok || !(window as any).Razorpay) throw new Error("Payment window didn't load. Check your internet and try again.");
      let finished = false;
      const rzp = new (window as any).Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId,
        name: "Your Editor Friend", description: "Title card edit",
        prefill: { name: user?.displayName || "", email: user?.email || "" },
        theme: { color: "#FF7A1A" },
        modal: { ondismiss: () => { if (!finished) setBusy(false); } },
        handler: async (resp: any) => {
          finished = true;
          try {
            const r = await fetch("/api/verify-payment", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature }),
            });
            const b = await r.json().catch(() => ({}));
            if (r.ok && b?.titlecard?.id) {
              setDoneId(b.titlecard.id);
              track("edit_payment_success", { price: editPrice });
              // straight to WhatsApp (same tab — works in Instagram's in-app browser)
              window.location.href = waText(paidMessage(b.titlecard.id, big.trim(), top.trim()));
            } else setErr(b?.error || "Payment received but we couldn't confirm it. Message me on WhatsApp with your payment ID: " + resp.razorpay_payment_id);
          } catch {
            setErr("Payment received but the confirmation failed. Message me on WhatsApp with your payment ID: " + resp.razorpay_payment_id);
          } finally { setBusy(false); }
        },
      });
      rzp.on?.("payment.failed", (r: any) => setErr(r?.error?.description || "Payment failed. Try again or use another method."));
      rzp.open();
    } catch (e: any) {
      setErr(e?.message || "Couldn't start the payment. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="tcp">
      <div className="wrap">
        <header className="tcp-top">
          <Link to="/" className="logo"><div className="mark">Y</div>Your Editor Friend</Link>
          <div className="tag">NEW DROP</div>
        </header>

        <div className="hero-one">
          <div className="media">
            <span className="badge-new">TITLE CARD</span>
            <video ref={vidRef} src={offer.demoVideo} poster={offer.poster} autoPlay muted loop playsInline preload="metadata" />
            <button className="sound" onClick={() => { const v = vidRef.current; if (!v) return; v.muted = !v.muted; if (!v.muted) { v.currentTime = 0; v.play(); } setMuted(v.muted); }}>
              {muted ? "🔇 Tap for sound" : "🔊 Sound on"}
            </button>
          </div>
          <h1>Your name. <span className="o">This title card.</span></h1>
          <p className="sub">Edit it yourself for ₹{PROJECT_FILE.price} — or I'll edit it with your name &amp; photo for ₹{EDIT.price}.</p>
          {SHOW_SOCIAL_PROOF && SOCIAL_PROOF_COUNT > 0 && <p className="proof">🔥 {SOCIAL_PROOF_COUNT} people already got theirs</p>}
          <div className="hero-ctas" ref={heroCtaRef}>
            <a className="btn wa big" href="#plans">Project file · <s className="was-i">₹{PROJECT_FILE.oldPrice}</s> ₹{PROJECT_FILE.price}</a>
            <button className="btn ghost big" onClick={openEdit}>I edit it for you · ₹{editPrice}</button>
          </div>
        </div>

        {EXAMPLES.length > 0 && (
          <section>
            <div className="eyebrow">Made for them</div>
            <h2>Their name. Same cinematic look.</h2>
            <div className="ex-grid">
              {EXAMPLES.map(e => (
                <div className="ex" key={e.src}>
                  {e.type === "video"
                    ? <video src={e.src} muted loop playsInline autoPlay preload="metadata" />
                    : <img src={e.src} alt={`${e.name} title card`} loading="lazy" />}
                  <span>{e.name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PLANS — phone: stacked cards · desktop: comparison table */}
        <section id="plans">
          <div className="eyebrow">Pick yours</div>
          <h2>Do it yourself, or let me do it</h2>

          <div className="tiers">
            <div className="tier hot">
              <span className="pill">{PROJECT_FILE.badge}</span>
              <div className="tier-h"><b>{PROJECT_FILE.name}</b><strong><s className="was-i">₹{PROJECT_FILE.oldPrice}</s>₹{PROJECT_FILE.price}</strong></div>
              <p className="tier-sub">{PROJECT_FILE.subtext}</p>
              <ul>{PROJECT_FILE.features.map(f => <li key={f}><Check />{f}</li>)}</ul>
              {fileBtn()}
              <div className="tier-foot">🔒 Razorpay secure · ⚡ Instant download</div>
            </div>
            <div className="tier dim">
              <div className="tier-h"><b>{EDIT.name}</b><strong>₹{editPrice}</strong></div>
              <p className="tier-sub">Don't have After Effects? I'll do it for you.</p>
              <ul>{EDIT.features.map(f => <li key={f}><Check />{f}</li>)}</ul>
              <button className="btn ghost big" onClick={openEdit}>Book the edit · ₹{editPrice}</button>
              <div className="tier-foot">Pay securely → send your photos on WhatsApp</div>
            </div>
          </div>

          <div className="how">
            <b>How the ₹{editPrice} edit works</b>
            <ol>
              <li>Type the name for your card and pay ₹{editPrice}</li>
              <li>WhatsApp opens — send 1–3 clear photos</li>
              <li>Get your 1080p MP4 on WhatsApp in {EDIT.delivery}</li>
            </ol>
          </div>
        </section>

        {reviews.length > 0 && (
          <section style={{ paddingTop: 18 }}>
            <div className="marquee"><div className="track">
              {[...reviews, ...reviews].map((t, i) => (
                <div className="rv" key={t.id + i}>
                  <div className="hh"><div className="av">{t.name?.[0] || "★"}</div><div><b>{t.name}</b><div className="s">{"★".repeat(t.rating || 5)}</div></div></div>
                  <p>{t.text}</p>
                </div>
              ))}
            </div></div>
          </section>
        )}

        <section className="faq">
          <div className="eyebrow">Questions</div>
          <h2>Before you order</h2>
          <details><summary>What quality will I get?</summary><p>Full HD 1080p MP4, ready to post on Instagram, WhatsApp status or YouTube.</p></details>
          <details><summary>What's the difference between ₹{PROJECT_FILE.price} and ₹{EDIT.price}?</summary><p>₹{PROJECT_FILE.price} is only the After Effects project file — you add your name and photo yourself. ₹{EDIT.price} means I do the full edit with your name and photo and send you the MP4.</p></details>
          <details><summary>How many revisions?</summary><p>The ₹{EDIT.price} edit includes {EDIT.revisions} free revision (text, photo or pose).</p></details>
          <details><summary>Do I need After Effects?</summary><p>Only for the ₹{PROJECT_FILE.price} project file (After Effects 2022 or newer, no paid plugins). For the ₹{EDIT.price} edit, I do everything.</p></details>
          <details><summary>How fast will I get it?</summary><p>The ₹{EDIT.price} edit: {EDIT.delivery}. The project file downloads instantly.</p></details>
          <details><summary>Which sizes do I get?</summary><p>Horizontal 16:9, 1080p — the same format as the video above.</p></details>
          <details><summary>How do I pay?</summary><p>Both are paid securely on this page with Razorpay (UPI, cards, net banking). After paying for the edit, WhatsApp opens so you can send your photos.</p></details>
          <details><summary>I bought the file. Can I upgrade to the edit?</summary><p>Yes. Log in with the same account and the edit costs only the difference (₹{EDIT.price - PROJECT_FILE.price}).</p></details>
        </section>

        <div className="help">
          <div><b>Still have a question?</b><span>Message me before you order.</span></div>
          <a className="btn wa" href={helpWa} target="_blank" rel="noopener noreferrer">WhatsApp me</a>
        </div>
        <footer>© Your Editor Friend · youreditorfriend.in</footer>
      </div>

      {/* sticky CTA (phone) */}
      <div className={`sticky ${sticky ? "on" : ""}`}>
        <div className="info"><b>Project file · <s className="was-i">₹{PROJECT_FILE.oldPrice}</s> ₹{PROJECT_FILE.price}</b><small>Price drop · instant download</small></div>
        {owned ? <Link className="btn ghost" to="/my-library">My Library</Link>
          : <button className="btn wa" onClick={buyFile} disabled={!!paying}>Buy · ₹{PROJECT_FILE.price}</button>}
      </div>

      {/* ₹599 edit sheet: name → pay → WhatsApp */}
      <div className={`sheet-bg ${sheet ? "on" : ""}`} onClick={() => !busy && setSheet(false)} />
      <div className={`sheet ${sheet ? "on" : ""}`} role="dialog" aria-label="Book the edit">
        <div className="sh-head">
          <div className="grab" />
          <div className="sh-title"><b>{EDIT.name} · ₹{editPrice}</b><button onClick={() => !busy && setSheet(false)} aria-label="Close">×</button></div>
        </div>
        <div className="sh-body">
          {!doneId ? (
            <div className="pane">
              <div className="field" style={{ marginTop: 0 }}>
                <label>Name to show on the card <small>{big.length}/15</small></label>
                <input value={big} maxLength={15} autoComplete="off" onChange={e => onBig(e.target.value)} placeholder="e.g. JANISH" />
                <div className="hint">1–2 words · English letters only</div>
              </div>
              <div className="field">
                <label>Small top line <small>optional · {top.length}/14</small></label>
                <input value={top} maxLength={14} autoComplete="off" onChange={e => setTop(e.target.value.toUpperCase().replace(/[^A-Z0-9 .&'!-]/g, ""))} placeholder="e.g. THE EDITOR" />
              </div>
              <div className="sendlist">
                <b>After you pay, send these on WhatsApp</b>
                <ul>{SEND_ON_WHATSAPP.map(s => <li key={s}><span className="box">✓</span>{s}</li>)}</ul>
                <small>WhatsApp opens automatically right after payment.</small>
              </div>
              <label className="opt"><input type="checkbox" checked={willSend} onChange={e => setWillSend(e.target.checked)} /><div><b>I'll send my photos on WhatsApp after paying</b><small>The edit starts once I get your photos</small></div></label>
              {err && <div className="err">{err}</div>}
            </div>
          ) : (
            <div className="pane done">
              <div className="ok-ic">✓</div>
              <h3>Payment done!</h3>
              <span className="slotno">{doneId}</span>
              <p>Now send your photos on WhatsApp — your order ID is filled in.</p>
              <a className="btn wa big" style={{ marginTop: 16 }} href={waAfterPay}>Open WhatsApp &amp; send photos</a>
              {err && <div className="err">{err}</div>}
            </div>
          )}
        </div>
        {!doneId && (
          <div className="sh-foot">
            <button className="btn main big" onClick={payEdit} disabled={busy}>{busy ? "Please wait…" : `Pay now · ₹${editPrice}`}</button>
          </div>
        )}
      </div>

      <div className={`toast ${toastMsg ? "on" : ""}`}>{toastMsg}</div>
    </div>
  );
};

export default TitleCard;
