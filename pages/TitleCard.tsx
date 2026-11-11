import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./titlecard.css";
import { useAuth } from "../src/lib/auth";
import { useStore } from "../src/lib/store";
import { loadRazorpay, usePurchase } from "../src/lib/purchase";
import { getWhatsAppLink } from "../src/lib/site";
import { useTestimonials } from "../src/lib/testimonials";
import { TutorialVideo } from "../components/AssetGenerator";
import {
  REGULAR_PRICE, batchForSlot, createEditOrder, imageShortSide, isFull, joinWaitlist,
  nextSlot, priceForSlot, sortedTiers, uploadPhoto, useTitleCardOffer, type TitleCardOffer,
} from "../src/lib/titlecard";

const Check = () => (
  <span className="yes"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span>
);
const No = () => <span className="no">—</span>;
const MAXP = 5;
const STEPS = ["Text", "Photo", "Pose", "Details"];

function useAnton() {
  useEffect(() => {
    if (document.getElementById("font-anton")) return;
    const l = document.createElement("link");
    l.id = "font-anton"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Anton&display=swap";
    document.head.appendChild(l);
  }, []);
}

function useCountUp(target: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0, cur = 0;
    const step = () => { cur = Math.min(target, cur + Math.max(1, Math.ceil(target / 40))); setN(cur); if (cur < target) raf = requestAnimationFrame(step); };
    step();
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

/* rough live preview of the card */
const Preview: React.FC<{ top: string; big: string; photo?: string; note?: string }> = ({ top, big, photo, note = "Rough preview · final done in AE" }) => {
  const b = big.trim().toUpperCase() || "VIJAY";
  const k = Math.min(1, 7 / Math.max(b.length, 1));
  return (
    <div className="pv">
      {photo ? <div className="ph" style={{ backgroundImage: `url(${photo})` }} /> : <div className="ph empty">Your photo</div>}
      <div className="tx">
        <div className="t1">{top.trim().toUpperCase() || "THALAPATHY"}</div>
        <div className="t2" style={{ fontSize: `calc(clamp(30px,13vw,78px) * ${k.toFixed(3)})` }}>{b}</div>
      </div>
      <div className="note">{note}</div>
    </div>
  );
};

/* ₹1499 → ₹1999 → ₹1999, current batch glowing */
const Ladder: React.FC<{ offer: TitleCardOffer }> = ({ offer }) => {
  const batches = offer.batches?.length ? offer.batches : sortedTiers(offer).map((t, i, a) => ({ name: `Batch ${i + 1}`, from: i ? a[i - 1].upTo + 1 : 1, to: t.upTo, date: "" }));
  const slot = nextSlot(offer);
  return (
    <div className="ladder" aria-label="Price by batch">
      {batches.map((b, i) => {
        const done = offer.booked >= b.to;
        const now = !done && slot >= b.from && slot <= b.to && !isFull(offer);
        return (
          <div key={b.name} className={`step ${now ? "now" : ""} ${done ? "done" : ""}`}>
            <small>{b.name}</small>
            <b>₹{priceForSlot(offer, b.from)}</b>
            <em>{done ? "Sold out" : now ? `${b.to - offer.booked} left at this price` : `slots ${b.from}–${b.to}`}</em>
            {i < batches.length - 1 && <span className="arrow">›</span>}
          </div>
        );
      })}
    </div>
  );
};

const TitleCard: React.FC = () => {
  useAnton();
  const { offer, loaded } = useTitleCardOffer();
  const { user, profile, signIn } = useAuth();
  const { store } = useStore();
  const { buy, paying } = usePurchase();
  const { list: testimonials } = useTestimonials(true);

  const full = isFull(offer);
  const slot = nextSlot(offer);
  const price = priceForSlot(offer, slot);
  const owned = !!offer.fileProductId && !!profile?.purchases?.includes(offer.fileProductId);
  const payNow = owned ? price - offer.filePrice : price;
  const left = Math.max(0, offer.total - offer.booked);
  const nextTier = sortedTiers(offer).find(t => t.upTo >= slot && priceForSlot(offer, t.upTo + 1) > price && t.upTo < offer.total);
  const fileProduct = store?.products.find(p => p.id === offer.fileProductId);
  const booked = useCountUp(offer.booked);
  const reviews = testimonials.filter(t => t.text && (t.productId === "titlecard-edit" || (offer.fileProductId && t.productId === offer.fileProductId)));

  useEffect(() => { document.title = "Your Name, Cinematic Title Card | Your Editor Friend"; }, []);

  // ── toast
  const [toastMsg, setToastMsg] = useState("");
  const tRef = useRef<number | undefined>(undefined);
  const toast = (m: string) => { setToastMsg(m); clearTimeout(tRef.current); tRef.current = window.setTimeout(() => setToastMsg(""), 2600); };

  // ── sound + sticky
  const vidRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const cmpRef = useRef<HTMLDivElement>(null);
  const [sticky, setSticky] = useState(false);
  useEffect(() => {
    const el = cmpRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setSticky(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el); return () => io.disconnect();
  }, []);

  // ── booking sheet
  const [open, setOpen] = useState<null | "book" | "wait">(null);
  const [step, setStep] = useState(0);
  const [top, setTop] = useState("");
  const [big, setBig] = useState("");
  const [photos, setPhotos] = useState<{ url: string; local: string; busy: boolean }[]>([]);
  const [pose, setPose] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [ownPhoto, setOwnPhoto] = useState(true);
  const [showOk, setShowOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<null | { id: string; batch?: any }>(null);
  const [waitDone, setWaitDone] = useState<number | null>(null);

  useEffect(() => { if (user && !name) setName(user.displayName || ""); if (user && !email) setEmail(user.email || ""); }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  const openBook = async () => {
    setErr("");
    if (full) { setOpen("wait"); return; }
    const devPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has("preview");
    if (!user && !devPreview) { try { await signIn(); } catch { return; } }
    setDone(null); setStep(0); setOpen("book");
  };
  const close = () => { if (!busy) setOpen(null); };

  const onBig = (v: string) => {
    let s = v.toUpperCase().replace(/[^A-Z0-9 .&'!-]/g, "").replace(/\s{2,}/g, " ").replace(/^\s+/, "");
    // keep only 2 words (a pasted / auto-typed 3rd word is cut off)
    if (/^\S+ \S+ /.test(s)) { s = s.split(" ").filter(Boolean).slice(0, 2).join(" "); toast("Big name: max 2 words"); }
    setBig(s.slice(0, 15));
  };

  const addPhotos = async (files: File[]) => {
    const room = MAXP - photos.length;
    if (files.length > room) toast(`Only ${MAXP} photos allowed — added the first ${room}`);
    let small = 0;
    for (const f of files.slice(0, room)) {
      if ((await imageShortSide(f)) < 800) { small++; continue; }
      const local = URL.createObjectURL(f);
      setPhotos(p => [...p, { url: "", local, busy: true }]);
      try {
        const url = await uploadPhoto(f);
        setPhotos(p => p.map(x => x.local === local ? { ...x, url, busy: false } : x));
      } catch (e: any) {
        setPhotos(p => p.filter(x => x.local !== local));
        toast(e?.message || "Upload failed, try again");
      }
    }
    if (small) toast(`${small} photo${small > 1 ? "s were" : " was"} too small — please use a clearer one`);
  };

  const next = async () => {
    setErr("");
    if (step === 0 && !big.trim()) return toast("Type your big name first");
    if (step === 1) {
      if (photos.some(p => p.busy)) return toast("Photos still uploading…");
      if (!photos.length) return toast("Upload at least 1 photo");
    }
    if (step === 2 && !pose) return toast("Pick a pose");
    if (step < 3) { setStep(step + 1); return; }
    // pay
    if (!name.trim()) return toast("Type your full name");
    if (!/^[6-9]\d{9}$/.test(phone)) return toast("Enter a valid 10-digit WhatsApp number");
    if (phone !== phone2) return toast("WhatsApp numbers don't match");
    if (!ownPhoto) return toast("Please confirm these are your photos");
    setBusy(true);
    try {
      const order = await createEditOrder({ top, big, pose, photos: photos.map(p => p.url), name, phone, email, note, showOk });
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) throw new Error("Payment window didn't load. Check your internet and try again.");
      let finished = false;
      const rzp = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId,
        name: "Your Editor Friend", description: "Title card edit",
        prefill: { name, email: email || user?.email || "", contact: `+91${phone}` },
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
            if (r.ok && b?.titlecard?.id) setDone({ id: b.titlecard.id, batch: b.titlecard.batch });
            else setErr(b?.error || "Payment received but we couldn't confirm it. Message me on WhatsApp with your payment ID: " + resp.razorpay_payment_id);
          } catch {
            setErr("Payment received but the confirmation failed. Message me on WhatsApp with your payment ID: " + resp.razorpay_payment_id);
          } finally { setBusy(false); }
        },
      });
      rzp.on?.("payment.failed", (r: any) => setErr(r?.error?.description || "Payment failed. Try again or use another method."));
      rzp.open();
    } catch (e: any) {
      setErr(e?.message || "Couldn't start the payment. Try again.");
      if (e?.data?.full) setOpen("wait");
      setBusy(false);
    }
  };

  const submitWait = async () => {
    setErr("");
    if (!name.trim() || !/^[6-9]\d{9}$/.test(phone)) return toast("Name and a valid WhatsApp number needed");
    setBusy(true);
    try { const r = await joinWaitlist(name, phone, email); setWaitDone(r.position || 0); }
    catch (e: any) { setErr(e?.message || "Couldn't join, try again"); }
    finally { setBusy(false); }
  };

  const buyFile = () => {
    if (!fileProduct) return toast("Project file is coming soon");
    buy(fileProduct);
  };

  const waMsg = done ? `Hi! Title card booking ${done.id}\nTop text: ${top || "-"}\nBig name: ${big}\nPose: ${pose}\nPhotos: ${photos.length}\nName: ${name}` : "";
  const helpWa = getWhatsAppLink("Hi! I have a question about the title card edit.");

  // ── delivered stack
  const [stackOrder, setStackOrder] = useState<number[]>([]);
  const [outIdx, setOutIdx] = useState<number | null>(null);
  useEffect(() => { setStackOrder(offer.showcase.map((_, i) => i)); }, [offer.showcase.length]);
  const nextCard = () => {
    if (stackOrder.length < 2) return;
    setOutIdx(stackOrder[0]);
    setTimeout(() => { setStackOrder(o => [...o.slice(1), o[0]]); setOutIdx(null); }, 320);
  };
  useEffect(() => { if (offer.showcase.length < 2) return; const t = setInterval(nextCard, 4500); return () => clearInterval(t); }); // eslint-disable-line react-hooks/exhaustive-deps

  const batchRows = useMemo(() => (offer.batches || []).map(b => {
    const size = b.to - b.from + 1, filled = Math.max(0, Math.min(size, offer.booked - b.from + 1));
    return { ...b, size, filled, isFullB: filled >= size, isOpen: filled < size && offer.booked >= b.from - 1, price: priceForSlot(offer, b.from) };
  }), [offer]);

  const pct = Math.min(100, (offer.booked / Math.max(1, offer.total)) * 100);

  return (
    <div className={`tcp ${full ? "full" : ""}`}>
      {/* SLOT BAR + PRICE LADDER */}
      <div className="slotbar">
        <div className="in">
          <div className="row">
            <span className="live"><i />Edit slots</span>
            {full
              ? <span className="left">All <b>{offer.total}</b> slots booked · <b>{offer.waitlist}</b> on waiting list</span>
              : <span className="left"><b>{loaded ? booked : "–"}</b>/{offer.total} booked · only <b>{left}</b> left</span>}
          </div>
          <div className="bar"><span style={{ width: `${loaded ? pct : 0}%` }} /></div>
        </div>
      </div>

      <div className="wrap">
        <header className="tcp-top">
          <Link to="/" className="logo"><div className="mark">Y</div>Your Editor Friend</Link>
          <div className="tag">NEW DROP</div>
        </header>
        <Ladder offer={offer} />

        <div className="hero-grid" style={{ marginTop: 12 }}>
          <div className="hero-left">
            <div className="media">
              <span className="badge-new">TITLE CARD</span>
              <video ref={vidRef} src={offer.demoVideo} poster={offer.poster} autoPlay muted loop playsInline preload="metadata" />
              <button className="sound" onClick={() => { const v = vidRef.current; if (!v) return; v.muted = !v.muted; if (!v.muted) { v.currentTime = 0; v.play(); } setMuted(v.muted); }}>
                {muted ? "🔇 Tap for sound" : "🔊 Sound on"}
              </button>
            </div>
            <h1>Your name. <span className="o">This title card.</span></h1>
            <p className="sub">Edit it yourself for ₹{offer.filePrice} — or send your photos and I'll edit it for you.</p>
          </div>

          <div className="compare" ref={cmpRef}>
            <div className="cmp">
              <div className="h"><small style={{ alignSelf: "flex-start", fontSize: 11.5, color: "var(--text)" }}>What you get</small></div>
              <div className="h"><small>Project file</small><strong>₹{offer.filePrice}</strong><small>You edit</small></div>
              <div className="h best">
                <span className="pill">{full ? "SOLD OUT" : `ONLY ${left} LEFT`}</span>
                <small>I edit for you</small>
                <strong>
                  {owned ? <span className="was">₹{price}</span> : price < REGULAR_PRICE && <span className="was">₹{REGULAR_PRICE}</span>}
                  ₹{payNow}
                </strong>
                <small>{owned ? "Pay only the rest" : nextTier ? `₹${priceForSlot(offer, nextTier.upTo + 1)} after slot ${nextTier.upTo}` : "Ready to post"}</small>
              </div>

              <div className="lbl">After Effects project</div><div className="c"><Check /></div><div className="c best"><Check /></div>
              <div className="lbl">Easily customisable</div><div className="c"><Check /></div><div className="c best"><Check /></div>
              <div className="lbl">Step-by-step tutorial</div><div className="c"><Check /></div><div className="c best"><Check /></div>
              <div className="lbl">Name &amp; photo added</div><div className="c"><No /></div><div className="c best"><Check /></div>
              <div className="lbl">Pick your pose</div><div className="c"><No /></div><div className="c best"><Check /></div>
              <div className="lbl">1080p MP4 + 1 revision</div><div className="c"><No /></div><div className="c best"><Check /></div>

              <div className="btns" />
              <div className="btns">
                {owned ? <div className="owned">✓ You own it</div>
                  : <button className="btn ghost" onClick={buyFile} disabled={!!paying}>{fileProduct ? "Buy" : "Soon"}</button>}
              </div>
              <div className="btns best"><button className="btn main" onClick={openBook}>{full ? "Join waitlist" : owned ? "Upgrade" : "Book edit"}</button></div>
            </div>
            {owned && !full && <div className="owned-note">You already bought the project file — pay only the remaining <b>₹{payNow}</b> and I'll edit it for you.</div>}
            <div className="cmp-foot"><span>🔒 Razorpay secure</span><span>⚡ Instant file download</span></div>
          </div>
        </div>

        {/* Free "how to edit" video from the ₹499 file product — no purchase needed */}
        {fileProduct?.tutorialUrl && (
          <div className="agx" style={{ marginTop: 24 }}>
            <div className="eyebrow">Free tutorial</div>
            <TutorialVideo url={fileProduct.tutorialUrl} title="How to edit this title card" />
          </div>
        )}

        {offer.showcase.length > 0 && (
          <section>
            <div className="eyebrow">Already delivered</div>
            <h2>This is what you'll get</h2>
            <div className="stack" onClick={nextCard}>
              {stackOrder.map((ci, pos) => {
                const s = offer.showcase[ci]; if (!s) return null;
                return (
                  <div key={s.id} className={`card ${outIdx === ci ? "out" : ""}`}
                    style={{ zIndex: 10 - pos, opacity: pos > 3 ? 0 : 1, transform: `translateY(${pos * 14}px) scale(${1 - pos * 0.05})` }}>
                    <video src={s.video} muted loop playsInline autoPlay={pos === 0} preload={pos === 0 ? "metadata" : "none"} />
                    <div className="cap"><b>{s.id}</b><span>{s.name} · {s.top} {s.big}</span></div>
                  </div>
                );
              })}
            </div>
            {offer.showcase.length > 1 && <div className="stack-nav"><span>Tap to see the next one</span><button onClick={nextCard}>Next →</button></div>}
          </section>
        )}

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

        <div className="below">
          <section>
            <div className="eyebrow">Only {offer.total} edits · {offer.batches.length} batches</div>
            <h2>Book early, pay less</h2>
            <div className="batches">
              {batchRows.map(b => (
                <div key={b.name} className={`batch ${b.isFullB ? "is-full" : ""}`}>
                  <div><div className="t">{b.name} · ₹{b.price}</div><div className="d">Slots {b.from}–{b.to}{b.date ? ` · delivery by ${b.date}` : ""}</div></div>
                  {b.isFullB ? <span className="st full">FULL</span> : b.isOpen ? <span className="st open">{b.size - b.filled} left</span> : <span className="st soon">Opens next</span>}
                  <div className="mini"><i style={{ width: `${(b.filled / b.size) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <div className="eyebrow">How the edit works</div>
            <h2>3 steps. 2 minutes.</h2>
            <div className="steps3">
              <div className="s3"><div className="n">1</div><div><b>Type your text</b><span>Small top line + your big name. See a live preview.</span></div></div>
              <div className="s3"><div className="n">2</div><div><b>Upload photos &amp; pick a pose</b><span>Up to 5 clear photos, any background.</span></div></div>
              <div className="s3"><div className="n">3</div><div><b>Pay &amp; relax</b><span>Your 1080p MP4 comes on WhatsApp in your batch.</span></div></div>
            </div>
          </section>
        </div>

        <section className="faq">
          <div className="eyebrow">Questions</div>
          <h2>Before you book</h2>
          <details><summary>I bought the ₹{offer.filePrice} file. Can I upgrade later?</summary><p>Yes. Log in with the same account and pay only the rest (edit price minus ₹{offer.filePrice}) — as long as slots are left.</p></details>
          <details><summary>What quality will I get?</summary><p>Full HD 1080p MP4, ready to post. Sent on WhatsApp.</p></details>
          <details><summary>Which software do I need for the project file?</summary><p>After Effects 2022 or newer. No paid plugins.</p></details>
          <details><summary>What if I don't like the result?</summary><p>1 free revision is included (text, photo or pose change).</p></details>
          <details><summary>Why does the price go up?</summary><p>Batch 1 gets the launch price. After that it's the regular price, because the slots are limited.</p></details>
          <details><summary>What happens when {offer.total} slots are full?</summary><p>Join the waiting list. When new slots open, people on the list get a WhatsApp message first.</p></details>
        </section>

        <div className="help">
          <div><b>Still have a question?</b><span>Message me before you book.</span></div>
          <a className="btn wa" href={helpWa} target="_blank" rel="noopener noreferrer">WhatsApp me</a>
        </div>
        <footer>© Your Editor Friend · youreditorfriend.in</footer>
      </div>

      {/* sticky CTA (phone) */}
      <div className={`sticky ${sticky ? "on" : ""}`}>
        <div className="info">
          <b>{full ? `All ${offer.total} edit slots booked` : <>I edit it for you · {!owned && price < REGULAR_PRICE && <s style={{ color: "var(--dim)", fontWeight: 500 }}>₹{REGULAR_PRICE}</s>} ₹{payNow}</>}</b>
          <small>{full ? "Join the waiting list — first to know" : `Only ${left} of ${offer.total} slots left`}</small>
        </div>
        <button className="btn main" onClick={openBook}>{full ? "Join waitlist" : owned ? "Upgrade" : "Book edit"}</button>
      </div>

      {/* SHEET */}
      <div className={`sheet-bg ${open ? "on" : ""}`} onClick={close} />
      <div className={`sheet ${open ? "on" : ""}`} role="dialog" aria-label={open === "wait" ? "Waiting list" : "Book your edit"}>
        <div className="sh-head">
          <div className="grab" />
          <div className="sh-title"><b>{open === "wait" ? "Waiting list" : owned ? "Upgrade to edit" : "Book your edit"}</b><button onClick={close} aria-label="Close">×</button></div>
          {open === "book" && !done && (
            <>
              <div className="prog">{STEPS.map((_, i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>
              <div className="prog-l">{STEPS.map((s, i) => <span key={s} className={i === step ? "on" : ""}>{s}</span>)}</div>
            </>
          )}
        </div>

        <div className="sh-body">
          {open === "book" && !done && step === 0 && (
            <div className="pane">
              <Preview top={top} big={big} photo={photos[0]?.local} />
              <div className="field">
                <label>Small top text <span className="was-tag">was THALAPATHY</span><small>{top.length}/14</small></label>
                <input value={top} maxLength={14} autoComplete="off" onChange={e => setTop(e.target.value.toUpperCase().replace(/[^A-Z0-9 .&'!-]/g, ""))} placeholder="e.g. THE EDITOR" />
                <div className="hint">Max 14 letters.</div>
              </div>
              <div className="field">
                <label>Big name <span className="was-tag">was VIJAY</span><small>{big.length}/15</small></label>
                <input value={big} maxLength={15} autoComplete="off" onChange={e => onBig(e.target.value)} placeholder="e.g. JANISH" />
                <div className="hint">Max 2 words · up to 15 letters. English letters only.</div>
              </div>
            </div>
          )}

          {open === "book" && !done && step === 1 && (
            <div className="pane">
              <Preview top={top} big={big} photo={photos[0]?.local} note="Rough preview" />
              <label className={`upload ${photos.length >= MAXP ? "full" : ""}`}>
                <input type="file" accept="image/*" multiple onChange={e => { const f = Array.from(e.target.files || []); e.target.value = ""; addPhotos(f); }} />
                <div className="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></svg></div>
                <b>{photos.length ? `${photos.length}/${MAXP} photos added${photos.length < MAXP ? " · add more" : ""}` : "Upload your best photos"}</b>
                <small>Up to 5 photos · more photos = better result</small>
              </label>
              <div className="thumbs">
                {photos.map((p, i) => (
                  <div key={p.local} className={`th ${p.busy ? "busy" : ""}`} style={{ backgroundImage: `url(${p.local})` }}>
                    {!p.busy && <button onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))} aria-label="Remove photo">×</button>}
                    {i === 0 && <em>Main</em>}
                  </div>
                ))}
                {Array.from({ length: MAXP - photos.length }).map((_, i) => <div key={"e" + i} className="th empty" />)}
              </div>
              <div className="tips">
                <div><span className="ok">✓</span>Face clearly visible</div>
                <div><span className="ok">✓</span>Waist-up, good light</div>
                <div><span className="bad">✕</span>No group photos</div>
                <div><span className="bad">✕</span>No heavy filters</div>
                <div style={{ gridColumn: "1/-1" }}><span className="bad">✕</span>No small / blurry photos (we block them)</div>
              </div>
            </div>
          )}

          {open === "book" && !done && step === 2 && (
            <div className="pane">
              <b style={{ fontSize: 15 }}>Pick a pose</b>
              <p className="hint" style={{ marginTop: 3 }}>Your photo will be matched to this pose &amp; style.</p>
              {offer.poses.length > 0 && (
                <div className="poses">
                  {offer.poses.map(p => (
                    <button key={p.id} className={`pose ${pose === p.name ? "sel" : ""}`} onClick={() => setPose(p.name)}>
                      {p.img && <img src={p.img} alt="" loading="lazy" />}<span>{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <label className="opt"><input type="radio" name="pose" checked={pose === "My photo as it is"} onChange={() => setPose("My photo as it is")} /><div><b>Use my photo as it is</b><small>No pose change, just cut-out + grade</small></div></label>
            </div>
          )}

          {open === "book" && !done && step === 3 && (
            <div className="pane">
              <div className="field" style={{ marginTop: 0 }}><label>Your full name</label><input value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></div>
              <div className="field">
                <label>WhatsApp number <small>must · delivery comes here</small></label>
                <div className="phone"><span className="cc">+91</span><input value={phone} inputMode="numeric" maxLength={10} autoComplete="tel-national" onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} /></div>
              </div>
              <div className="field">
                <label>Type WhatsApp number again</label>
                <div className="phone"><span className="cc">+91</span><input value={phone2} inputMode="numeric" maxLength={10} autoComplete="off" onChange={e => setPhone2(e.target.value.replace(/\D/g, "").slice(0, 10))} /></div>
                {phone2.length === 10 && phone !== phone2 && <div className="hint" style={{ color: "#ff8a8a" }}>Numbers don't match</div>}
              </div>
              <div className="field"><label>Email <small>optional</small></label><input value={email} inputMode="email" autoComplete="email" onChange={e => setEmail(e.target.value)} /></div>
              <div className="field"><label>Anything else? <small>optional</small></label><textarea value={note} maxLength={500} onChange={e => setNote(e.target.value)} placeholder="Colour, mood, any special request…" /></div>
              <label className="opt"><input type="checkbox" checked={ownPhoto} onChange={e => setOwnPhoto(e.target.checked)} /><div><b>These are my own photos</b><small>I have the right to use them</small></div></label>
              <label className="opt"><input type="checkbox" checked={showOk} onChange={e => setShowOk(e.target.checked)} /><div><b>You can show my title card on your site</b><small>In "Already delivered". Untick to keep it private.</small></div></label>
              <div className="summary">
                {owned ? (<>
                  <div><span>Title card edit (slot {slot})</span><b>₹{price}</b></div>
                  <div><span>Project file (already paid)</span><b className="free">−₹{offer.filePrice}</b></div>
                  <div><span>Pay now</span><b>₹{payNow}</b></div>
                </>) : (<>
                  <div><span>Title card edit (slot {slot})</span><b>₹{price}</b></div>
                  <div><span>Project file</span><b className="free">FREE</b></div>
                  <div><span>Total</span><b>₹{payNow}</b></div>
                </>)}
              </div>
              {err && <div className="err">{err}</div>}
            </div>
          )}

          {open === "book" && done && (
            <div className="pane done">
              <div className="ok-ic">✓</div>
              <h3>Your slot is booked!</h3>
              <div style={{ marginTop: 12 }}><small style={{ color: "var(--muted)", fontSize: 12 }}>Your order ID</small><span className="slotno">{done.id}</span></div>
              <p>{done.batch ? `${done.batch.name}${done.batch.date ? ` · delivery by ${done.batch.date}` : ""}. ` : ""}Your details are saved under this ID.</p>
              <a className="btn wa big" style={{ marginTop: 18 }} href={getWhatsAppLink(waMsg)} target="_blank" rel="noopener noreferrer">Send my order on WhatsApp</a>
              <p className="hint" style={{ marginTop: 8 }}>Opens WhatsApp with your order ID filled in — just tap send.</p>
              <Link className="btn ghost" style={{ marginTop: 16 }} to="/my-library">⬇ Project file is in My Library</Link>
            </div>
          )}

          {open === "wait" && waitDone === null && (
            <div className="pane">
              <div style={{ textAlign: "center", padding: "6px 4px 4px" }}>
                <div style={{ fontSize: 34 }}>⏳</div>
                <b style={{ display: "block", fontSize: 18, marginTop: 6 }}>All {offer.total} slots are booked</b>
                <p className="hint" style={{ fontSize: 13 }}>Join the waiting list. When new slots open, you'll get a WhatsApp message before anyone else.</p>
              </div>
              <div className="field"><label>Your full name</label><input value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></div>
              <div className="field"><label>WhatsApp number</label><div className="phone"><span className="cc">+91</span><input value={phone} inputMode="numeric" maxLength={10} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} /></div></div>
              <div className="field"><label>Email <small>optional</small></label><input value={email} inputMode="email" onChange={e => setEmail(e.target.value)} /></div>
              <p className="hint" style={{ marginTop: 12 }}>No payment now. Want to edit it yourself meanwhile? The ₹{offer.filePrice} project file is still available.</p>
              {err && <div className="err">{err}</div>}
            </div>
          )}
          {open === "wait" && waitDone !== null && (
            <div className="pane done"><div className="ok-ic">✓</div><h3>You're on the list!</h3>{waitDone > 0 && <span className="slotno">#{waitDone}</span>}<p>We'll WhatsApp you as soon as slots open.</p></div>
          )}
        </div>

        {open === "book" && !done && (
          <div className="sh-foot">
            <button className="btn ghost" style={{ visibility: step === 0 ? "hidden" : "visible" }} onClick={() => setStep(s => Math.max(0, s - 1))} disabled={busy}>Back</button>
            <button className="btn main big" onClick={next} disabled={busy}>{busy ? "Please wait…" : step === 3 ? `Pay ₹${payNow}` : "Next"}</button>
          </div>
        )}
        {open === "wait" && waitDone === null && (
          <div className="sh-foot"><button className="btn main big" onClick={submitWait} disabled={busy}>{busy ? "Please wait…" : "Join waiting list"}</button></div>
        )}
      </div>

      <div className={`toast ${toastMsg ? "on" : ""}`}>{toastMsg}</div>
    </div>
  );
};

export default TitleCard;
