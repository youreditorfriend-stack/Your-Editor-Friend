import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Upload } from "lucide-react";
import {
  PLACEHOLDERS, RESPECTA_PRESET, loadAssetGen, loadAssetPrompts, promptKey, saveAssetGen,
  type AgCard, type AgOption, type AgPrompts, type AssetGenPublic,
} from "../lib/assetGen";
import { imageFileToWebp, newId, uploadImageBlob } from "../lib/promptKit";
import { uploadAnyFile } from "../lib/testimonials";
import { useToast } from "./admin/ui";

const inp = "w-full h-10 rounded-lg bg-zinc-950 border border-white/10 px-3 text-sm text-white outline-none focus:border-[#FF7A1A]";
const area = "w-full rounded-lg bg-zinc-950 border border-white/10 px-3 py-2 text-[12.5px] text-white outline-none focus:border-[#FF7A1A] font-mono leading-relaxed";
const lbl = "block text-[11px] font-bold tracking-wider text-zinc-400 uppercase mb-1";
const UPLOADS = ["Your photo", "Nothing", "Your photo + the pose image", "The VIJAY brush video", "–"];

const EMPTY: AssetGenPublic = { min: 3, max: 15, allowTxt: true, promptsFor: "buyers", rules: [], ae: [], cards: [] };

async function uploadMedia(file: File): Promise<string> {
  if (file.type.startsWith("image/")) return uploadImageBlob(await imageFileToWebp(file), file.name.replace(/\.[^.]+$/, ".webp"));
  return uploadAnyFile(file);
}

/** Admin: "How to edit" link + AI asset generator for one product. */
export function AssetGenEditor({ productId, tutorialUrl, onTutorial, onSaved }: {
  productId: string;
  tutorialUrl: string;
  onTutorial: (url: string) => void;
  onSaved: (summary: { cards: number } | null) => void;
}) {
  const toast = useToast();
  const [kit, setKit] = useState<AssetGenPublic | null>(null);
  const [prompts, setPrompts] = useState<AgPrompts>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [pub, pr] = await Promise.all([loadAssetGen(productId), loadAssetPrompts(productId).catch(() => ({}))]);
        setKit(pub); setPrompts(pr || {});
      } finally { setLoading(false); }
    })();
  }, [productId]);

  const k = kit || EMPTY;
  const setK = (patch: Partial<AssetGenPublic>) => setKit({ ...k, ...patch });
  const setCard = (id: string, patch: Partial<AgCard>) => setK({ cards: k.cards.map(c => (c.id === id ? { ...c, ...patch } : c)) });
  const setOpt = (c: AgCard, oid: string, patch: Partial<AgOption>) => setCard(c.id, { options: (c.options || []).map(o => (o.id === oid ? { ...o, ...patch } : o)) });

  const save = async (next: AssetGenPublic | null = kit) => {
    setSaving(true);
    try {
      await saveAssetGen(productId, next && next.cards.length ? next : null, prompts);
      onSaved(next && next.cards.length ? { cards: next.cards.length } : null);
      toast.success("AI assets saved · live on the product page");
    } catch (e: any) { toast.error(e?.message || "Couldn't save"); }
    finally { setSaving(false); }
  };

  const upload = async (key: string, f: File | undefined, apply: (url: string) => void) => {
    if (!f) return;
    setBusy(key);
    try { apply(await uploadMedia(f)); toast.info("Uploaded — press Save"); }
    catch (e: any) { toast.error(e?.message || "Upload failed"); }
    finally { setBusy(""); }
  };

  const promptBox = (pk: string) => (
    <div>
      <label className={lbl}>Prompt</label>
      <textarea rows={6} className={area} value={prompts[pk] || ""} onChange={e => setPrompts(p => ({ ...p, [pk]: e.target.value }))} />
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {PLACEHOLDERS.map(ph => (
          <button key={ph} type="button" className="text-[11px] font-bold px-2 py-1 rounded-md bg-[#FF7A1A]/10 text-[#ff9a4d] border border-[#FF7A1A]/30"
            onClick={() => setPrompts(p => ({ ...p, [pk]: (p[pk] || "") + ph }))}>+ {ph}</button>
        ))}
      </div>
    </div>
  );

  if (loading) return <div className="text-sm text-zinc-500">Loading…</div>;

  return (
    <div className="space-y-4">
      {/* Free tutorial */}
      <div className="rounded-xl border border-[#25D366]/30 bg-[#25D366]/[0.05] p-3.5">
        <label className={lbl}>“How to edit” video — YouTube link <span className="text-[#25D366] normal-case tracking-normal">· free for everyone</span></label>
        <input className={inp} value={tutorialUrl} placeholder="https://youtu.be/…" onChange={e => onTutorial(e.target.value.trim())} />
        <p className="text-[11px] text-zinc-500 mt-1">Shows on the product page (and the title card offer page) even before buying. Saved with the main Save button.</p>
      </div>

      {!kit ? (
        <div className="rounded-xl border border-dashed border-white/15 p-4 text-center space-y-2">
          <p className="text-sm text-zinc-400">No AI asset generator on this product yet.</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button className="h-9 px-3 rounded-lg bg-[#FF7A1A] text-black text-xs font-bold" onClick={() => { setKit(RESPECTA_PRESET.pub); setPrompts(RESPECTA_PRESET.prompts); setOpen("portrait"); }}>Load “Respecta” preset</button>
            <button className="h-9 px-3 rounded-lg border border-white/15 text-xs font-bold" onClick={() => setKit({ ...EMPTY, cards: [{ id: "name", no: "1", title: "Your name (typed in AE)", replaces: "", upload: "–", kind: "name" }] })}>Start empty</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={lbl}>Min letters</label><input type="number" className={inp} value={k.min} onChange={e => setK({ min: +e.target.value || 1 })} /></div>
            <div><label className={lbl}>Max letters</label><input type="number" className={inp} value={k.max} onChange={e => setK({ max: +e.target.value || 15 })} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <div><label className={lbl}>Who can see the prompts?</label>
              <select className={inp} value={k.promptsFor} onChange={e => setK({ promptsFor: e.target.value as any })}>
                <option value="buyers">Only buyers</option><option value="everyone">Everyone (free)</option>
              </select></div>
            <label className="flex items-center gap-2 text-sm font-semibold mt-5"><input type="checkbox" className="accent-[#FF7A1A] w-4 h-4" checked={k.allowTxt} onChange={e => setK({ allowTxt: e.target.checked })} />Allow “Download prompts as .txt”</label>
          </div>
          <div><label className={lbl}>Rules box (one per line)</label><textarea rows={4} className={area + " font-sans"} value={k.rules.join("\n")} onChange={e => setK({ rules: e.target.value.split("\n") })} /></div>

          <div>
            <label className={lbl}>Asset cards</label>
            <div className="space-y-2">
              {k.cards.map((c, idx) => (
                <div key={c.id} className="rounded-xl border border-white/10 overflow-hidden">
                  <button type="button" className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#161616] text-left" onClick={() => setOpen(open === c.id ? null : c.id)}>
                    {c.ref ? <img src={c.ref} alt="" className="w-11 h-8 rounded object-cover bg-black" /> : <span className="w-11 h-8 rounded bg-zinc-800" />}
                    <b className="flex-1 text-[13.5px] truncate">{c.no} · {c.title}</b>
                    {c.beta && <span className="text-[10px] font-extrabold text-amber-300">BETA</span>}
                    {open === c.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {open === c.id && (
                    <div className="p-3 space-y-3">
                      <div className="grid grid-cols-[80px_1fr] gap-2">
                        <div><label className={lbl}>Step</label><input className={inp} value={c.no} onChange={e => setCard(c.id, { no: e.target.value })} /></div>
                        <div><label className={lbl}>Card title</label><input className={inp} value={c.title} onChange={e => setCard(c.id, { title: e.target.value })} /></div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        <div><label className={lbl}>Replaces in After Effects</label><input className={inp} value={c.replaces} onChange={e => setCard(c.id, { replaces: e.target.value })} /></div>
                        <div><label className={lbl}>Buyer uploads</label>
                          <select className={inp} value={c.upload} onChange={e => setCard(c.id, { upload: e.target.value })}>
                            {[...new Set([c.upload, ...UPLOADS])].map(u => <option key={u}>{u}</option>)}
                          </select></div>
                      </div>
                      {c.kind === "name" ? <p className="text-xs text-zinc-500">This card just shows the buyer's name + TITLE number.</p> : (
                        <>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <label className={lbl}>Example image</label>
                              <div className="flex items-center gap-2">
                                {c.ref && <img src={c.ref} alt="" className="w-20 h-14 rounded object-cover" />}
                                <label className="h-9 px-3 rounded-lg border border-white/15 text-xs font-bold grid place-items-center cursor-pointer relative">
                                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={e => upload(c.id + "ref", e.target.files?.[0], url => setCard(c.id, { ref: url }))} />
                                  {busy === c.id + "ref" ? "…" : <span className="flex items-center gap-1"><Upload size={12} />Upload</span>}
                                </label>
                              </div>
                            </div>
                            <div>
                              <label className={lbl}>Example video (optional)</label>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-zinc-500 truncate max-w-[140px]">{c.refVideo ? "✓ video set" : "none"}</span>
                                <label className="h-9 px-3 rounded-lg border border-white/15 text-xs font-bold grid place-items-center cursor-pointer relative">
                                  <input type="file" accept="video/mp4" className="absolute inset-0 opacity-0" onChange={e => upload(c.id + "vid", e.target.files?.[0], url => setCard(c.id, { refVideo: url }))} />
                                  {busy === c.id + "vid" ? "…" : "Upload"}
                                </label>
                                {c.refVideo && <button className="text-[11px] text-zinc-500" onClick={() => setCard(c.id, { refVideo: undefined })}>remove</button>}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs font-semibold">
                            <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#FF7A1A]" checked={!!c.videoEdit} onChange={e => setCard(c.id, { videoEdit: e.target.checked })} />Video edit (buyer downloads my file)</label>
                            <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#FF7A1A]" checked={!!c.beta} onChange={e => setCard(c.id, { beta: e.target.checked })} />Beta tag</label>
                            <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#FF7A1A]" checked={!!c.options} onChange={e => setCard(c.id, { options: e.target.checked ? [{ id: "ref", label: "Use this pose", upload: "Your photo + the pose image" }, { id: "own", label: "My own pose", upload: "Your photo" }] : undefined })} />Pose choice (this pose / my own)</label>
                          </div>
                          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
                            <div><label className={lbl}>Download file button (optional)</label>
                              <input className={inp} value={c.download?.label || ""} placeholder="⬇ Download …" onChange={e => setCard(c.id, { download: { label: e.target.value, file: c.download?.file || "" } })} /></div>
                            <label className="h-10 px-3 rounded-lg border border-white/15 text-xs font-bold grid place-items-center cursor-pointer relative">
                              <input type="file" className="absolute inset-0 opacity-0" onChange={e => upload(c.id + "dl", e.target.files?.[0], url => setCard(c.id, { download: { label: c.download?.label || "⬇ Download file", file: url } }))} />
                              {busy === c.id + "dl" ? "…" : c.download?.file ? "Replace file" : "Upload file"}
                            </label>
                          </div>
                          {c.options ? c.options.map(o => (
                            <div key={o.id} className="rounded-lg border border-white/10 p-2.5 space-y-2">
                              <div className="grid sm:grid-cols-2 gap-2">
                                <div><label className={lbl}>Option label</label><input className={inp} value={o.label} onChange={e => setOpt(c, o.id, { label: e.target.value })} /></div>
                                <div><label className={lbl}>Uploads</label><input className={inp} value={o.upload} onChange={e => setOpt(c, o.id, { upload: e.target.value })} /></div>
                              </div>
                              {o.id === "ref" && (
                                <div className="flex items-center gap-2">
                                  {o.poseImg && <img src={o.poseImg} alt="" className="w-14 h-14 rounded object-cover bg-white" />}
                                  <label className="h-9 px-3 rounded-lg border border-white/15 text-xs font-bold grid place-items-center cursor-pointer relative">
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={e => upload(c.id + "pose", e.target.files?.[0], url => setOpt(c, o.id, { poseImg: url, download: { label: "⬇ Download the pose image", file: url } }))} />
                                    {busy === c.id + "pose" ? "…" : "Upload face-free pose image"}
                                  </label>
                                </div>
                              )}
                              {promptBox(promptKey(c, o))}
                            </div>
                          )) : promptBox(c.id)}
                        </>
                      )}
                      <div className="flex justify-between pt-1">
                        <button className="text-xs font-semibold text-zinc-400" disabled={idx === 0} onClick={() => { const n = [...k.cards]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; setK({ cards: n }); }}>↑ Move up</button>
                        <button className="text-xs font-semibold text-red-400 flex items-center gap-1" onClick={() => { setK({ cards: k.cards.filter(x => x.id !== c.id) }); setOpen(null); }}><Trash2 size={12} />Delete card</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button className="w-full mt-2 h-10 rounded-xl border border-dashed border-white/20 text-xs font-bold text-zinc-400 flex items-center justify-center gap-1"
              onClick={() => { const id = newId("c"); setK({ cards: [...k.cards, { id, no: String(k.cards.length + 1), title: "New asset", replaces: "", upload: "Your photo" }] }); setOpen(id); }}>
              <Plus size={14} />Add asset card
            </button>
          </div>

          <div><label className={lbl}>After Effects steps (one per line)</label><textarea rows={4} className={area + " font-sans"} value={k.ae.join("\n")} onChange={e => setK({ ae: e.target.value.split("\n") })} /></div>

          <div className="flex justify-between items-center gap-2 pt-1">
            <button className="text-xs font-semibold text-red-400" onClick={() => { if (confirm("Remove the AI asset generator from this product?")) { setKit(null); save(null); } }}>Remove generator</button>
            <button disabled={saving} onClick={() => save({ ...k, rules: k.rules.filter(Boolean), ae: k.ae.filter(Boolean) })} className="h-10 px-5 rounded-xl bg-[#FF7A1A] text-black font-bold text-sm">{saving ? "Saving…" : "Save AI assets"}</button>
          </div>
        </>
      )}
    </div>
  );
}
