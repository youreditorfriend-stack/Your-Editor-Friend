import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./titlecard.css";
import { useAuth } from "../src/lib/auth";
import { useStore } from "../src/lib/store";
import { usePurchase } from "../src/lib/purchase";
import { getWhatsAppLink } from "../src/lib/site";
import { useTestimonials } from "../src/lib/testimonials";
import { useTitleCardOffer } from "../src/lib/titlecard";
import { track } from "../src/lib/track";
import {
  EDIT_TIERS, EXAMPLES, PROJECT_FILE, SHOW_SOCIAL_PROOF, SOCIAL_PROOF_COUNT, waLink, type EditTier,
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

/** Plain <a target=_blank> — works in Instagram's in-app browser (Android + iOS). */
const WaButton: React.FC<{ tier: EditTier; className?: string; label?: string }> = ({ tier, className = "btn wa", label }) => (
  <a className={className} href={waLink(tier)} target="_blank" rel="noopener noreferrer"
    onClick={() => track("whatsapp_click", { tier: tier.id, price: tier.price })}>
    {label || `Book on WhatsApp · ₹${tier.price}`}
  </a>
);


const TitleCard: React.FC = () => {
  useAnton();
  const { offer } = useTitleCardOffer();
  const { profile } = useAuth();
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
  const fileBtn = owned
    ? <Link className="btn ghost" to="/my-library">✓ Owned · My Library</Link>
    : <button className="btn ghost" onClick={buyFile} disabled={!!paying}>{fileProduct ? `Buy file · ₹${PROJECT_FILE.price}` : "Coming soon"}</button>;

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
            <WaButton tier={EDIT} className="btn wa big" label={`I edit it for you · ₹${EDIT.price}`} />
            <a className="btn ghost big" href="#plans">Project file · ₹{PROJECT_FILE.price}</a>
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
            <div className="tier file">
              <div className="tier-h"><b>{PROJECT_FILE.name}</b><strong>₹{PROJECT_FILE.price}</strong></div>
              <p className="tier-sub">{PROJECT_FILE.subtext}</p>
              <ul>{PROJECT_FILE.features.map(f => <li key={f}><Check />{f}</li>)}</ul>
              {fileBtn}
              <div className="tier-foot">🔒 Razorpay secure · ⚡ Instant download</div>
            </div>
            {EDIT_TIERS.map(t => (
              <div key={t.id} className={`tier ${t.badge ? "hot" : ""}`}>
                {t.badge && <span className="pill">{t.badge}</span>}
                <div className="tier-h"><b>{t.name}</b><strong>₹{t.price}</strong></div>
                <ul>{t.features.map(f => <li key={f}><Check />{f}</li>)}</ul>
                <WaButton tier={t} className="btn wa big" />
                <div className="tier-foot">Pay by UPI on WhatsApp after you send your details</div>
              </div>
            ))}
          </div>

          <div className="how">
            <b>How the ₹{EDIT.price} edit works</b>
            <ol>
              <li>Tap <em>“Book on WhatsApp”</em></li>
              <li>Fill in your name and send 1–3 clear photos</li>
              <li>Pay by UPI on WhatsApp → get your MP4</li>
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
          <details><summary>How do I pay?</summary><p>Edit: pay by UPI on WhatsApp after you send your details. Project file: secure Razorpay checkout on this page.</p></details>
          <details><summary>I bought the file. Can I upgrade to the edit?</summary><p>Yes. Message me on WhatsApp and pay just the difference (₹{EDIT.price - PROJECT_FILE.price}).</p></details>
        </section>

        <div className="help">
          <div><b>Still have a question?</b><span>Message me before you order.</span></div>
          <a className="btn wa" href={helpWa} target="_blank" rel="noopener noreferrer">WhatsApp me</a>
        </div>
        <footer>© Your Editor Friend · youreditorfriend.in</footer>
      </div>

      {/* sticky CTA (phone) */}
      <div className={`sticky ${sticky ? "on" : ""}`}>
        <div className="info"><b>I edit it for you</b><small>Name + photo · {EDIT.delivery}</small></div>
        <WaButton tier={EDIT} label={`WhatsApp · ₹${EDIT.price}`} />
      </div>

      <div className={`toast ${toastMsg ? "on" : ""}`}>{toastMsg}</div>
    </div>
  );
};

export default TitleCard;
