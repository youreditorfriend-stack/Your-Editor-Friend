import { useRef, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { Eye, EyeOff, Image as ImageIcon, Mic, Star, Trash2, UploadCloud } from "lucide-react";
import { db } from "../firebase";
import { useStore } from "../lib/store";
import { addTestimonial, removeTestimonial, setFeatured, uploadAnyFile, useTestimonials, type Testimonial } from "../lib/testimonials";
import { imageFileToWebp, uploadImageBlob } from "../lib/promptKit";
import { Button, useConfirm, useToast } from "./admin/ui";

const SOURCES: Testimonial["source"][] = ["whatsapp", "instagram", "email", "site", "other"];
const inputCls = "w-full h-11 bg-zinc-950 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-[#FF7A1A]";

// Add a review you received anywhere (WhatsApp text, voice note, screenshot)
// in a few taps from the phone, and choose which ones show on the website.
export function AdminReviews() {
  const { store } = useStore();
  const { list, loading } = useTestimonials(false);
  const toast = useToast();
  const confirmDialog = useConfirm();
  const products = store?.products || [];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [uid, setUid] = useState<string | undefined>();
  const [productId, setProductId] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [source, setSource] = useState<Testimonial["source"]>("whatsapp");
  const [audioUrl, setAudioUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [featured, setFeat] = useState(true);
  const audioIn = useRef<HTMLInputElement>(null);
  const imgIn = useRef<HTMLInputElement>(null);

  const findUser = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    try {
      const s = await getDocs(query(collection(db, "users"), where("email", "==", e), limit(1)));
      if (s.empty) { toast.error("No site account with that email — the review is saved with just the name"); setUid(undefined); return; }
      const u = s.docs[0].data();
      setUid(s.docs[0].id);
      if (!name) setName(u.name || "");
      toast.success(`Linked to ${u.name || e}`);
    } catch { toast.error("Could not look up the email"); }
  };

  const upAudio = async (f: File) => {
    try { setBusy("Uploading voice note…"); setAudioUrl(await uploadAnyFile(f)); }
    catch (e: any) { toast.error(e?.message || "Upload failed"); }
    setBusy("");
  };
  const upImage = async (f: File) => {
    try { setBusy("Uploading screenshot…"); setImageUrl(await uploadImageBlob(await imageFileToWebp(f), `review-${f.name.replace(/\.[^.]+$/, "")}.webp`)); }
    catch (e: any) { toast.error(e?.message || "Upload failed"); }
    setBusy("");
  };

  const save = async () => {
    if (!name.trim()) { toast.error("Add the customer's name"); return; }
    if (!text.trim() && !audioUrl && !imageUrl) { toast.error("Add text, a voice note or a screenshot"); return; }
    const p = products.find(x => x.id === productId);
    try {
      await addTestimonial({
        name: name.trim(), uid, productId: p?.id, productName: p?.name, rating, text: text.trim(),
        audioUrl, imageUrl, source, featured, createdAt: new Date().toISOString(),
      });
      toast.success(featured ? "Saved — now on the website" : "Saved (hidden)");
      setName(""); setEmail(""); setUid(undefined); setText(""); setAudioUrl(""); setImageUrl(""); setRating(5);
    } catch (e: any) { toast.error("Could not save: " + (e?.message || "")); }
  };

  const shown = list.filter(t => t.featured).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">Reviews</h1>
        <p className="text-xs text-zinc-500 mt-1">Got feedback on WhatsApp? Add it here in 20 seconds. <b className="text-[#25D366]">{shown} showing</b> on the home page.</p>
      </div>

      {/* Add form */}
      <div className="rounded-2xl border border-white/10 bg-[#131313] p-4 space-y-3">
        <div className="text-sm font-bold">＋ Add a review</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Customer name *" value={name} onChange={e => setName(e.target.value)} />
          <div className="flex gap-2">
            <input className={inputCls} placeholder="Their email (optional, links account)" value={email} onChange={e => setEmail(e.target.value)} onBlur={findUser} />
            {uid && <span className="self-center text-[11px] text-[#25D366] font-bold whitespace-nowrap">✓ linked</span>}
          </div>
          <select className={inputCls} value={productId} onChange={e => setProductId(e.target.value)}>
            <option value="">Which product? (optional)</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex gap-1.5 flex-wrap">
            {SOURCES.map(s => (
              <button key={s} onClick={() => setSource(s)} className={`h-11 px-3 rounded-xl text-xs font-bold border capitalize cursor-pointer ${source === s ? "bg-white text-black border-white" : "border-white/10 text-zinc-400"}`}>{s}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setRating(n)} className="p-1 cursor-pointer" aria-label={`${n} stars`}>
              <Star size={24} fill={n <= rating ? "#ffc35a" : "none"} className={n <= rating ? "text-[#ffc35a]" : "text-zinc-600"} />
            </button>
          ))}
        </div>
        <textarea rows={3} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF7A1A]"
          placeholder="Paste what they said (Tanglish is fine)…" value={text} onChange={e => setText(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => audioIn.current?.click()} disabled={!!busy}
            className={`h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs font-bold cursor-pointer ${audioUrl ? "border-[#25D366] text-[#25D366]" : "border-white/15 text-zinc-400 hover:border-[#FF7A1A]"}`}>
            <Mic size={20} /> {audioUrl ? "Voice note added ✓" : "Add voice note"}
          </button>
          <button onClick={() => imgIn.current?.click()} disabled={!!busy}
            className={`h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs font-bold cursor-pointer ${imageUrl ? "border-[#25D366] text-[#25D366]" : "border-white/15 text-zinc-400 hover:border-[#FF7A1A]"}`}>
            <ImageIcon size={20} /> {imageUrl ? "Screenshot added ✓" : "Add screenshot"}
          </button>
          <input ref={audioIn} type="file" accept="audio/*,.opus,.ogg,.m4a,.mp3" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upAudio(f); e.target.value = ""; }} />
          <input ref={imgIn} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upImage(f); e.target.value = ""; }} />
        </div>
        {audioUrl && <audio src={audioUrl} controls className="w-full h-10" />}
        {busy && <div className="text-xs text-zinc-400 flex items-center gap-2"><UploadCloud size={14} className="text-[#FF7A1A]" /> {busy}</div>}
        <div className="flex items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={featured} onChange={e => setFeat(e.target.checked)} className="w-5 h-5 accent-[#FF7A1A]" /> Show on website
          </label>
          <Button variant="primary" onClick={save} disabled={!!busy}>Save review</Button>
        </div>
        <p className="text-[11px] text-zinc-600">Tip: on WhatsApp, long-press a voice note → Share → save to phone, then pick it here. Ask the customer before posting their voice or screenshot.</p>
      </div>

      {/* List */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {loading && <div className="text-xs text-zinc-500">Loading…</div>}
        {!loading && list.length === 0 && <div className="text-xs text-zinc-500">No reviews yet.</div>}
        {list.map(t => (
          <div key={t.id} className={`rounded-2xl border p-4 bg-[#131313] ${t.featured ? "border-[#25D366]/40" : "border-white/10 opacity-70"}`}>
            <div className="flex items-center gap-2">
              <b className="text-sm truncate">{t.name}</b>
              <span className="text-[10px] text-zinc-500 capitalize">{t.source}</span>
              {!!t.rating && <span className="text-[#ffc35a] text-xs ml-auto">{"★".repeat(t.rating)}</span>}
            </div>
            {t.productName && <div className="text-[11px] text-zinc-500 truncate mt-0.5">{t.productName}</div>}
            {t.text && <p className="text-sm text-zinc-200 mt-2 line-clamp-4">“{t.text}”</p>}
            {t.audioUrl && <audio src={t.audioUrl} controls preload="none" className="w-full h-9 mt-2" />}
            {t.imageUrl && <img src={t.imageUrl} alt="" className="mt-2 rounded-lg max-h-40 w-full object-cover object-top" />}
            <div className="flex gap-2 mt-3">
              <button onClick={() => setFeatured(t.id, !t.featured)} className={`flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${t.featured ? "bg-[#25D366] text-black" : "border border-white/15 text-zinc-300"}`}>
                {t.featured ? <><Eye size={13} /> On website</> : <><EyeOff size={13} /> Hidden</>}
              </button>
              <button onClick={async () => { if (await confirmDialog({ title: `Delete review from ${t.name}?`, danger: true, confirmLabel: "Delete" })) removeTestimonial(t.id); }}
                className="w-9 h-9 rounded-lg border border-white/10 text-zinc-500 hover:text-red-400 grid place-items-center cursor-pointer" title="Delete"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
