import React, { useEffect, useMemo, useState } from "react";
import "./assetgen.css";
import type { Product } from "../src/lib/store";
import { usePurchase } from "../src/lib/purchase";
import {
  fillPrompt, howTo, loadAssetGen, loadAssetPrompts, nameVars, promptKey, youtubeId,
  type AgCard, type AgPrompts, type AssetGenPublic,
} from "../src/lib/assetGen";

const LS = "yef-asset-name";
const esc = (s: string) => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

/** Free "How to edit" video — shown to everyone, no purchase needed. */
export const TutorialVideo: React.FC<{ url?: string; title?: string }> = ({ url, title = "How to edit this template" }) => {
  const id = youtubeId(url);
  if (!id) return null;
  return (
    <div className="tut">
      <div className="tut-h"><b>▶ {title}</b><span className="free">FREE · NO PURCHASE NEEDED</span></div>
      <div className="tut-v"><iframe src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`} title={title} allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" /></div>
    </div>
  );
};

export const AssetGenerator: React.FC<{ product: Product }> = ({ product }) => {
  const { owns } = usePurchase();
  const owned = owns(product.id) || !product.price;
  const [kit, setKit] = useState<AssetGenPublic | null>(null);
  const [prompts, setPrompts] = useState<AgPrompts | null>(null);
  const [name, setName] = useState(() => { try { return localStorage.getItem(LS) || ""; } catch { return ""; } });
  const [gender, setGender] = useState<"man" | "woman">("man");
  const [tool, setTool] = useState<"gemini" | "chatgpt">("gemini");
  const [opt, setOpt] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");

  // dev only: ?agdemo shows the Respecta preset on any product
  const demo = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("agdemo");
  useEffect(() => {
    if (demo) { import("../src/lib/assetGen").then(m => { setKit(m.RESPECTA_PRESET.pub); setPrompts(m.RESPECTA_PRESET.prompts); }); return; }
    if (!product.assetGen) return;
    loadAssetGen(product.id).then(setKit).catch(() => setKit(null));
  }, [product.id, product.assetGen, demo]);
  useEffect(() => {
    if (!kit || demo) return;
    if (kit.promptsFor === "everyone" && kit.prompts && Object.keys(kit.prompts).length) { setPrompts(kit.prompts); return; }
    if (!owned) { setPrompts(null); return; }
    loadAssetPrompts(product.id).then(setPrompts).catch(() => setPrompts(null));
  }, [kit, owned, product.id]);

  const v = useMemo(() => nameVars(name), [name]);
  const ok = !!kit && v.n >= kit.min && v.n <= kit.max;
  const cur = (c: AgCard) => (c.options ? c.options.find(o => o.id === opt[c.id]) || c.options[0] : null);
  const textOf = (c: AgCard) => (prompts ? prompts[promptKey(c, cur(c))] || "" : "");

  const copy = async (t: string, key: string) => {
    try { await navigator.clipboard.writeText(t); } catch {
      const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); document.execCommand("copy"); a.remove();
    }
    setCopied(key); setTimeout(() => setCopied(""), 1600);
  };
  const allText = () => kit ? `${product.name} — AI asset prompts for ${v.NAME} (${v.n} letters, TITLE_${v.TITLE_NO})\n\n` +
    kit.cards.filter(c => c.kind !== "name" && textOf(c)).map(c => { const o = cur(c); return `=== Step ${c.no} · ${c.title}${o ? ` (${o.label})` : ""} (upload: ${o ? o.upload : c.upload}) ===\n${fillPrompt(textOf(c), v, gender)}\n`; }).join("\n") : "";

  if (!product.tutorialUrl && !product.assetGen && !demo) return null;

  return (
    <section className="agx" id="ai-assets">
      <div className="eyebrow">Make it yours</div>
      <h2>{product.assetGen ? "AI Asset Generator" : "How to edit this template"}</h2>
      {product.assetGen && <p className="sub">Type your name once — every prompt below fills itself. Copy, paste in Gemini or ChatGPT, done.</p>}

      <TutorialVideo url={product.tutorialUrl} />

      {kit && (
        <>
          <div className="inputs">
            <div className="namebox">
              <input value={name} maxLength={24} placeholder="TYPE YOUR NAME" autoComplete="off"
                onChange={e => { const n = e.target.value.toUpperCase().replace(/[^A-Z ]/g, ""); setName(n); try { localStorage.setItem(LS, n); } catch { /* ignore */ } }} />
              <span className={`cnt ${v.n && !ok ? "bad" : ""}`}>{v.n ? `Letters: ${v.n} → TITLE_${v.TITLE_NO}` : "Letters: 0"}</span>
            </div>
            {!!v.n && !ok && <div className="warn">Use {kit.min} to {kit.max} letters (spaces not counted)</div>}
            <div className="toggles">
              <div className="seg">{(["man", "woman"] as const).map(g => <button key={g} className={gender === g ? "on" : ""} onClick={() => setGender(g)}>{g === "man" ? "Man" : "Woman"}</button>)}</div>
              <div className="seg">{(["gemini", "chatgpt"] as const).map(t => <button key={t} className={tool === t ? "on" : ""} onClick={() => setTool(t)}>{t === "gemini" ? "Gemini" : "ChatGPT"}</button>)}</div>
              {prompts && (
                <div className="allbtns">
                  <button className="sbtn" disabled={!ok} onClick={() => copy(allText(), "all")}>{copied === "all" ? "Copied ✓" : "Copy all"}</button>
                  {kit.allowTxt && <button className="sbtn o" disabled={!ok} onClick={() => {
                    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([allText()], { type: "text/plain" }));
                    a.download = `prompts-${v.NAME.replace(/\s+/g, "-").toLowerCase() || "name"}.txt`; a.click();
                  }}>⬇ .txt</button>}
                </div>
              )}
            </div>
          </div>

          {!!kit.rules?.length && <div className="rules"><b>Before you start</b><ul>{kit.rules.map((r, i) => <li key={i}>{r}</li>)}</ul></div>}

          <div className="cards">
            {kit.cards.map(c => {
              if (c.kind === "name") return (
                <div className="ac" key={c.id}>
                  <div className="ac-h"><div className="n">{c.no}</div><div><b>{c.title}</b><small>Replaces: {c.replaces}</small></div></div>
                  <div className="ac-b" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="namehero"><div>{v.NAME || "YOUR NAME"}</div><small>{v.n ? `Use TITLE_${v.TITLE_NO}` : "Type your name above"}</small></div>
                  </div>
                </div>
              );
              const o = cur(c);
              const upload = o ? o.upload : c.upload;
              const text = textOf(c);
              const marked = text ? esc(fillPrompt(text, v, gender, true)).replace(/\u0001/g, "<mark>").replace(/\u0002/g, "</mark>") : "";
              return (
                <div className="ac" key={c.id}>
                  <div className="ac-h"><div className="n">{c.no}</div><div><b>{c.title}{c.beta && <span className="beta">BETA</span>}</b><small>Replaces: {c.replaces}</small></div></div>
                  <div className="ac-b">
                    {c.refVideo
                      ? (c.videoEdit && c.download
                        ? <a className="ref" href={c.download.file} download><video src={c.refVideo} poster={c.ref} autoPlay muted loop playsInline /><span className="go">Your starting file — tap to download</span></a>
                        : <div className="ref"><video src={c.refVideo} poster={c.ref} autoPlay muted loop playsInline /><span>Example result — do NOT upload this</span></div>)
                      : c.ref ? <div className="ref"><img src={c.ref} alt="" loading="lazy" /><span>Example result — do NOT upload this image</span></div> : <div />}
                    <div>
                      {c.options && (
                        <>
                          <div className="seg" style={{ marginBottom: 10 }}>{c.options.map(x => <button key={x.id} className={x.id === o!.id ? "on" : ""} onClick={() => setOpt(s => ({ ...s, [c.id]: x.id }))}>{x.label}</button>)}</div>
                          {o!.poseImg && o!.download
                            ? <a className="posefile" href={o!.download.file} download><img src={o!.poseImg} alt="" loading="lazy" /><div><b>Pose image</b><small>Face-free pose guide · upload it with your photo</small><span>{o!.download.label}</span></div></a>
                            : <p className="tiny" style={{ margin: "0 0 10px" }}>Your photo's own pose is kept — pick a photo you like the pose of.</p>}
                        </>
                      )}
                      <div className="meta"><span className="chip up">Upload: {upload}</span><span className="chip">{c.videoEdit ? "Omni 1.1 Flash" : tool === "gemini" ? "Gemini" : "ChatGPT"}</span></div>
                      {c.videoEdit && c.download && <a className="dl" href={c.download.file} download>{c.download.label}</a>}
                      {!c.videoEdit && c.download && <a className="dl" href={c.download.file} download>{c.download.label}</a>}
                      {prompts ? (
                        <>
                          <div className="prompt" dangerouslySetInnerHTML={{ __html: marked || "—" }} />
                          <button className="cp" disabled={!ok || !text} onClick={() => copy(fillPrompt(text, v, gender), c.id)}>
                            {!ok ? `Type a ${kit.min}–${kit.max} letter name first` : copied === c.id ? "Copied ✓" : "Copy prompt"}
                          </button>
                        </>
                      ) : (
                        <div className="locked"><b>🔒 Prompt unlocks after purchase</b>Buy the template (or book the edit) and your ready-made prompts appear here.</div>
                      )}
                      <div className="how"><b>How to use</b><ol>{howTo(c, upload, tool).map((s, i) => <li key={i}>{s}</li>)}</ol></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!!kit.ae?.length && <div className="final"><b>Then in After Effects</b><ol>{kit.ae.map((s, i) => <li key={i}>{s}</li>)}</ol></div>}
        </>
      )}
    </section>
  );
};
