import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, FileImage, ImagePlus, Layers as LayersIcon, Trash2, UploadCloud, X } from "lucide-react";
import type { PromptFilePublic, PromptLayerPublic } from "../lib/store";
import { imageFileToWebp, loadKitPrivate, loadKitPublic, newId, parsePsd, saveKit, uploadImageBlob } from "../lib/promptKit";
import { Button, useConfirm, useToast } from "./admin/ui";

type Prompts = Record<string, { prompt: string; params?: string }>;

const move = <T,>(arr: T[], i: number, d: number) => {
  const j = i + d; if (j < 0 || j >= arr.length) return arr;
  const n = [...arr]; [n[i], n[j]] = [n[j], n[i]]; return n;
};
const checker = "bg-[length:14px_14px] bg-[conic-gradient(#222_25%,#2c2c2c_0_50%,#222_0_75%,#2c2c2c_0)]";

// Admin editor for a prompt-kit product: one product = one video, built from
// several PSD files. Drop PSDs → every layer is extracted + uploaded; then
// type a prompt and add reference images per layer.
export function PromptKitEditor({ productId, isFree, onSaved }: {
  productId: string;
  isFree: boolean;
  onSaved: (summary: { files: number; layers: number } | null) => void;
}) {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [files, setFiles] = useState<PromptFilePublic[]>([]);
  const [prompts, setPrompts] = useState<Prompts>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const psdInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pub, priv] = await Promise.all([loadKitPublic(productId), loadKitPrivate(productId).catch(() => null)]);
        if (!alive) return;
        setFiles(pub?.files || []);
        setPrompts(priv?.prompts || {});
        setOpen(pub?.files?.[0]?.id || null);
      } catch (e) { console.error(e); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [productId]);

  const change = (fn: (f: PromptFilePublic[]) => PromptFilePublic[]) => { setFiles(fn); setDirty(true); };
  const upFile = (id: string, ch: Partial<PromptFilePublic>) => change(fs => fs.map(f => (f.id === id ? { ...f, ...ch } : f)));
  const upLayer = (fid: string, lid: string, ch: Partial<PromptLayerPublic>) =>
    change(fs => fs.map(f => (f.id === fid ? { ...f, layers: f.layers.map(l => (l.id === lid ? { ...l, ...ch } : l)) } : f)));
  const setPrompt = (lid: string, ch: Partial<{ prompt: string; params: string }>) => {
    setPrompts(p => ({ ...p, [lid]: { prompt: "", ...p[lid], ...ch } }));
    setDirty(true);
  };

  const addPsds = async (list: FileList | File[]) => {
    const psds = Array.from(list).filter(f => /\.psd$/i.test(f.name));
    if (!psds.length) { toast.error("Please drop .psd files"); return; }
    for (const file of psds) {
      try {
        setBusy(`Reading ${file.name}…`);
        const parsed = await parsePsd(file);
        const base = file.name.replace(/\.psd$/i, "");
        setBusy(`Uploading cover of ${file.name}…`);
        const cover = await uploadImageBlob(parsed.cover, `${base}-cover.webp`);
        const layers: PromptLayerPublic[] = [];
        for (let i = 0; i < parsed.layers.length; i++) {
          const L = parsed.layers[i];
          setBusy(`Uploading layer ${i + 1}/${parsed.layers.length} of ${file.name}…`);
          const image = await uploadImageBlob(L.blob, `${base}-${L.name}.webp`);
          layers.push({ id: newId("l"), name: L.name, image, refs: [], ...(L.blend ? { blend: L.blend } : {}) });
        }
        const pf: PromptFilePublic = {
          id: newId("f"),
          name: base.replace(/^\d+[_\-\s]*/, "").replace(/[-_]+/g, " ").trim() || base,
          fileName: file.name, cover, width: parsed.width, height: parsed.height, layers,
        };
        change(fs => [...fs, pf]);
        setOpen(pf.id);
        toast.success(`${file.name}: ${layers.length} layers added`);
      } catch (e: any) {
        console.error(e);
        toast.error(`${file.name}: ${e?.message || "could not read this PSD"}`);
      }
    }
    setBusy("");
  };

  const addRefs = async (fid: string, layer: PromptLayerPublic, list: FileList) => {
    try {
      const urls: string[] = [];
      for (const [i, f] of Array.from(list).entries()) {
        setBusy(`Uploading reference ${i + 1}/${list.length}…`);
        urls.push(await uploadImageBlob(await imageFileToWebp(f), `ref-${f.name.replace(/\.[^.]+$/, "")}.webp`));
      }
      upLayer(fid, layer.id, { refs: [...layer.refs, ...urls] });
    } catch (e: any) { toast.error(e?.message || "Upload failed"); }
    setBusy("");
  };

  const save = async () => {
    setSaving(true);
    try {
      const keep = new Set(files.flatMap(f => f.layers.map(l => l.id)));
      const cleanPrompts: Prompts = {};
      Object.entries(prompts).forEach(([k, v]) => { if (keep.has(k)) cleanPrompts[k] = { prompt: v.prompt || "", ...(v.params ? { params: v.params } : {}) }; });
      await saveKit(productId, { files }, { free: isFree, prompts: cleanPrompts });
      const layers = files.reduce((s, f) => s + f.layers.length, 0);
      onSaved(files.length ? { files: files.length, layers } : null);
      setDirty(false);
      toast.success("Prompt kit saved");
    } catch (e: any) {
      console.error(e);
      toast.error("Could not save the prompt kit: " + (e?.message || ""));
    } finally { setSaving(false); }
  };

  const totalLayers = files.reduce((s, f) => s + f.layers.length, 0);
  const missing = files.flatMap(f => f.layers).filter(l => !prompts[l.id]?.prompt?.trim()).length;

  return (
    <div className="space-y-4">
      {/* Head */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-base font-bold"><LayersIcon size={17} className="text-[#FF7A1A]" /> Prompt kit</div>
          <p className="text-xs text-zinc-500 mt-0.5 max-w-md">One product = one video. Drop every Photoshop file used in it — layers come out automatically. Then add a prompt and reference images per layer.</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-[11px] text-amber-400 font-semibold">Unsaved</span>}
          <Button variant="primary" size="sm" onClick={save} disabled={saving || !!busy}>{saving ? "Saving…" : "Save prompt kit"}</Button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10">{files.length} PSD files</span>
          <span className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10">{totalLayers} layers</span>
          <span className={`px-2.5 py-1 rounded-full border ${missing ? "border-amber-500/40 text-amber-400" : "border-[#25D366]/40 text-[#25D366]"}`}>
            {missing ? `${missing} layers need a prompt` : "All layers have prompts"}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-zinc-400">{isFree ? "Free — prompts visible to everyone" : "Paid — prompts only for buyers"}</span>
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={() => !busy && psdInput.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); if (!busy) addPsds(e.dataTransfer.files); }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          drag ? "border-[#FF7A1A] bg-[#FF7A1A]/[0.06]" : "border-white/15 hover:border-[#FF7A1A]/60"
        } ${busy ? "cursor-wait" : ""}`}
      >
        {busy ? (
          <div className="flex flex-col items-center gap-2 text-sm text-zinc-300">
            <span className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#FF7A1A] animate-spin" />
            {busy}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <UploadCloud size={26} className="text-[#FF7A1A]" />
            <div className="text-sm font-bold">Drop PSD files here</div>
            <div className="text-[11px] text-zinc-500">or click to choose · one PSD = one part of the video · save PSDs with “Maximize compatibility” on</div>
          </div>
        )}
        <input ref={psdInput} type="file" accept=".psd" multiple className="hidden"
          onChange={e => { if (e.target.files?.length) addPsds(e.target.files); e.target.value = ""; }} />
      </div>

      {loading && <div className="text-xs text-zinc-500">Loading kit…</div>}

      {/* Files */}
      <div className="space-y-3">
        {files.map((f, fi) => {
          const isOpen = open === f.id;
          const done = f.layers.filter(l => prompts[l.id]?.prompt?.trim()).length;
          return (
            <div key={f.id} className={`rounded-2xl border bg-zinc-950/60 overflow-hidden ${isOpen ? "border-[#FF7A1A]/50" : "border-white/[0.08]"}`}>
              <div className="flex items-center gap-3 p-3">
                <button onClick={() => setOpen(isOpen ? null : f.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer">
                  <img src={f.cover} alt="" className="w-16 h-12 rounded-lg object-cover border border-white/10 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-zinc-500 truncate">PSD {fi + 1} · {f.fileName}</div>
                    <div className="text-sm font-bold truncate">{f.name}</div>
                    <div className="text-[11px] text-zinc-500">{f.layers.length} layers · {done}/{f.layers.length} prompts</div>
                  </div>
                  <ChevronDown size={16} className={`ml-auto text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button title="Move up" onClick={() => change(fs => move(fs, fi, -1))} className="w-8 h-8 rounded-lg hover:bg-white/5 text-zinc-400 flex items-center justify-center cursor-pointer"><ArrowUp size={14} /></button>
                  <button title="Move down" onClick={() => change(fs => move(fs, fi, 1))} className="w-8 h-8 rounded-lg hover:bg-white/5 text-zinc-400 flex items-center justify-center cursor-pointer"><ArrowDown size={14} /></button>
                  <button title="Remove PSD" onClick={async () => { if (await confirmDialog({ title: `Remove ${f.fileName}?`, description: "Its layers and prompts are removed from this kit.", danger: true, confirmLabel: "Remove" })) change(fs => fs.filter(x => x.id !== f.id)); }}
                    className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 flex items-center justify-center cursor-pointer"><Trash2 size={14} /></button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-white/[0.06] p-3 space-y-3">
                  <label className="block">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Part name (shown to buyers)</span>
                    <input value={f.name} onChange={e => upFile(f.id, { name: e.target.value })}
                      className="mt-1 w-full h-10 bg-zinc-950 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-[#FF7A1A]" />
                  </label>

                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Layers · top first (like Photoshop)</div>
                  {[...f.layers].map((l, li) => ({ l, li })).reverse().map(({ l, li }) => (
                    <div key={l.id} className="rounded-xl border border-white/[0.08] bg-[#131313] p-3 grid grid-cols-[72px_1fr] sm:grid-cols-[96px_1fr] gap-3">
                      <div className={`relative aspect-[4/5] rounded-lg overflow-hidden border border-white/10 ${checker}`}>
                        <img src={l.image} alt="" className="absolute inset-0 w-full h-full object-contain" />
                        <span className="absolute left-1 top-1 text-[9px] font-bold bg-black/70 px-1.5 rounded">{li + 1}</span>
                      </div>
                      <div className="min-w-0 space-y-2">
                        <div className="flex gap-2">
                          <input value={l.name} onChange={e => upLayer(f.id, l.id, { name: e.target.value })}
                            className="flex-1 min-w-0 h-9 bg-zinc-950 border border-white/10 rounded-lg px-2.5 text-sm font-semibold outline-none focus:border-[#FF7A1A]" />
                          <button title="Move layer up" onClick={() => upFile(f.id, { layers: move(f.layers, li, 1) })} className="w-9 h-9 rounded-lg border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"><ArrowUp size={13} /></button>
                          <button title="Move layer down" onClick={() => upFile(f.id, { layers: move(f.layers, li, -1) })} className="w-9 h-9 rounded-lg border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"><ArrowDown size={13} /></button>
                          <button title="Delete layer" onClick={async () => { if (await confirmDialog({ title: `Delete layer "${l.name}"?`, danger: true, confirmLabel: "Delete" })) upFile(f.id, { layers: f.layers.filter(x => x.id !== l.id) }); }}
                            className="w-9 h-9 rounded-lg border border-white/10 text-zinc-500 hover:text-red-400 hover:border-red-500/30 flex items-center justify-center cursor-pointer"><Trash2 size={13} /></button>
                        </div>
                        <textarea value={prompts[l.id]?.prompt || ""} onChange={e => setPrompt(l.id, { prompt: e.target.value })} rows={3}
                          placeholder="Prompt for this layer…"
                          className={`w-full bg-zinc-950 border rounded-lg px-2.5 py-2 text-[13px] font-mono leading-relaxed outline-none focus:border-[#FF7A1A] ${prompts[l.id]?.prompt?.trim() ? "border-white/10" : "border-amber-500/40"}`} />
                        <input value={prompts[l.id]?.params || ""} onChange={e => setPrompt(l.id, { params: e.target.value })}
                          placeholder="Settings (optional), e.g. --ar 4:5 --style raw"
                          className="w-full h-9 bg-zinc-950 border border-white/10 rounded-lg px-2.5 text-xs font-mono outline-none focus:border-[#FF7A1A]" />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-1">References</span>
                          {l.refs.map((r, ri) => (
                            <span key={ri} className="relative w-11 h-11 rounded-lg overflow-hidden border border-white/10 group">
                              <img src={r} alt="" className="w-full h-full object-cover" />
                              <button onClick={() => upLayer(f.id, l.id, { refs: l.refs.filter((_, k) => k !== ri) })}
                                className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer" title="Remove"><X size={14} /></button>
                            </span>
                          ))}
                          <label className="w-11 h-11 rounded-lg border border-dashed border-white/20 hover:border-[#FF7A1A] text-zinc-500 hover:text-[#FF7A1A] flex items-center justify-center cursor-pointer" title="Add reference images">
                            <ImagePlus size={16} />
                            <input type="file" accept="image/*" multiple className="hidden" disabled={!!busy}
                              onChange={e => { if (e.target.files?.length) addRefs(f.id, l, e.target.files); e.target.value = ""; }} />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!loading && files.length === 0 && (
          <div className="text-xs text-zinc-500 flex items-center gap-2"><FileImage size={14} /> No PSD files yet — this product shows as a normal product until you add one.</div>
        )}
      </div>
    </div>
  );
}
