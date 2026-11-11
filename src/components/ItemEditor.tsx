import { useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, Flame, Gift, Home, Pin, Plus, Sparkles, Trash2, Trophy, X } from "lucide-react";
import type { Course, Product, ProductCategory } from "../lib/store";
import { getDiscountPercent, getProductCategories } from "../lib/store";
import { ImageField } from "./ImageField";
import { FileField } from "./FileField";
import { PromptKitEditor } from "./PromptKitEditor";
import { AssetGenEditor } from "./AssetGenEditor";
import { Button } from "./admin/ui";

type Kind = "product" | "course";
type Item = (Product & { title?: string; thumbnail?: string; accessUrl?: string }) | (Course & { name?: string; image?: string; downloadUrl?: string });

const inputCls = "w-full h-11 bg-zinc-950 border border-white/10 rounded-xl px-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#FF7A1A] transition-colors";
const areaCls = "w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#FF7A1A] transition-colors";

const Label: React.FC<{ children: ReactNode; hint?: string }> = ({ children, hint }) => (
  <div className="flex items-baseline justify-between gap-2 mb-1.5">
    <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">{children}</span>
    {hint && <span className="text-[11px] text-zinc-600">{hint}</span>}
  </div>
);

const Section: React.FC<{ title: string; sub?: string; children: ReactNode; action?: ReactNode }> = ({ title, sub, children, action }) => (
  <div className="rounded-2xl border border-white/[0.08] bg-[#131313] p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <div className="text-[15px] font-bold">{title}</div>
        {sub && <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>}
      </div>
      {action}
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

// Big tappable on/off card (instead of a row of tiny toggles).
const SwitchCard: React.FC<{ on: boolean; onClick: () => void; icon: ReactNode; title: string; sub: string; tone?: "green" | "orange" }> = ({ on, onClick, icon, title, sub, tone = "orange" }) => (
  <button type="button" onClick={onClick}
    className={`relative text-left rounded-2xl border p-4 transition-colors cursor-pointer ${on ? (tone === "green" ? "border-[#25D366]/60 bg-[#25D366]/[0.07]" : "border-[#FF7A1A]/60 bg-[#FF7A1A]/[0.07]") : "border-white/10 bg-zinc-950 hover:border-white/20"}`}>
    <span className={`absolute top-4 right-4 w-11 h-6 rounded-full transition-colors ${on ? (tone === "green" ? "bg-[#25D366]" : "bg-[#FF7A1A]") : "bg-zinc-700"}`}>
      <span className={`absolute top-1 w-4 h-4 rounded-full transition-all ${on ? "left-6 bg-black" : "left-1 bg-zinc-400"}`} />
    </span>
    <span className={`text-xl ${on ? "" : "opacity-60"}`}>{icon}</span>
    <b className="block mt-2 text-sm pr-12">{title}</b>
    <small className="text-xs text-zinc-500">{sub}</small>
  </button>
);

export function ItemEditor({
  kind, item, categories, dirty, saving, onChange, onSave, onPromptKitSaved, onAssetGenSaved,
}: {
  kind: Kind;
  item: Item;
  categories: ProductCategory[];
  dirty: boolean;
  saving: boolean;
  onChange: (patch: Record<string, any>) => void;
  onSave: () => void;
  onPromptKitSaved: (summary: { files: number; layers: number } | null) => void;
  onAssetGenSaved: (summary: { cards: number } | null) => void;
}) {
  const isProduct = kind === "product";
  const p = item as any;
  const name: string = isProduct ? p.name : p.title;
  const image: string = isProduct ? p.image : p.thumbnail;
  const fileUrl: string = isProduct ? p.downloadUrl : p.accessUrl;
  const cats = isProduct ? getProductCategories(p as Product) : [];
  const discount = getDiscountPercent(p.price || 0, p.originalPrice);

  const STEPS = [
    { id: "basics", title: "Basics", sub: "image, name, price" },
    { id: "files", title: "Files", sub: isProduct ? "what buyers get" : "course link" },
    { id: "page", title: "Page", sub: "video, text, FAQ" },
    ...(isProduct ? [{ id: "prompts", title: "Prompts", sub: "optional" }, { id: "aiassets", title: "AI assets", sub: "tutorial & generator" }] : []),
    { id: "show", title: "Show", sub: "live & badges" },
  ];
  const [step, setStep] = useState(0);
  const cur = STEPS[step].id;

  const checks: { ok: boolean; label: string; step: number }[] = [
    { ok: !!image, label: "Image", step: 0 },
    { ok: !!name?.trim(), label: "Name", step: 0 },
    { ok: typeof p.price === "number", label: p.price ? `Price ₹${p.price}` : "Free", step: 0 },
    ...(isProduct ? [{ ok: cats.length > 0, label: cats.length ? `Category: ${categories.find(c => c.id === cats[0])?.label || cats[0]}` : "Category", step: 0 }] : []),
    { ok: !!fileUrl, label: isProduct ? "Download file" : "Course link", step: 1 },
    { ok: !!(p.description || p.previewVideo), label: "Page text or video", step: 2 },
    { ok: !!p.enabled, label: p.enabled ? "Live on site" : "Hidden (draft)", step: STEPS.length - 1 },
  ];
  const ready = checks.filter(c => c.ok).length;

  const setName = (v: string) => onChange(isProduct ? { name: v } : { title: v });
  const setImage = (v: string) => onChange(isProduct ? { image: v } : { thumbnail: v });
  const setFile = (v: string) => onChange(isProduct ? { downloadUrl: v } : { accessUrl: v });
  const faq: { q: string; a: string }[] = p.faq || [];
  const gallery: string[] = p.gallery || [];

  return (
    <div className="pb-24">
      {/* Steps */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 mb-5">
        {STEPS.map((s, i) => (
          <button key={s.id} onClick={() => setStep(i)}
            className={`shrink-0 sm:flex-1 min-w-[132px] flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
              i === step ? "border-[#FF7A1A] bg-[#FF7A1A]/[0.08]" : "border-white/10 bg-[#131313] hover:border-white/20"}`}>
            <span className={`w-7 h-7 rounded-lg grid place-items-center text-xs font-extrabold shrink-0 ${i === step ? "bg-[#FF7A1A] text-black" : i < step ? "bg-[#25D366] text-black" : "bg-zinc-800 text-zinc-400"}`}>
              {i < step ? <Check size={14} strokeWidth={3} /> : i + 1}
            </span>
            <span className="min-w-0">
              <b className="block text-[13px]">{s.title}</b>
              <small className="block text-[11px] text-zinc-500 truncate">{s.sub}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          {/* ── 1 BASICS ── */}
          {cur === "basics" && (
            <>
              <Section title="Image" sub={isProduct ? "Square works best — it's cropped for you" : "16:9 thumbnail"}>
                <ImageField label="" aspect={isProduct ? "square" : "video"} value={image || ""} onChange={setImage} />
              </Section>
              <Section title="Name & price">
                <div>
                  <Label>Name</Label>
                  <input className={inputCls} value={name || ""} onChange={e => setName(e.target.value)} placeholder="e.g. Leo Title Card | After Effects" />
                </div>
                <div>
                  <Label hint="shown under the name">Short line</Label>
                  <input className={inputCls} value={p.tagline || ""} onChange={e => onChange({ tagline: e.target.value })} placeholder="e.g. Edit the title in 2 minutes" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label hint="0 = free">Price ₹</Label>
                    <input type="number" min={0} className={`${inputCls} font-bold`} value={p.price ?? 0}
                      onChange={e => { const v = Math.max(0, Number(e.target.value)); onChange({ price: v, free: v === 0 }); }} />
                  </div>
                  <div>
                    <Label hint={discount != null ? `-${discount}%` : "optional"}>Old price ₹</Label>
                    <input type="number" min={0} className={inputCls} value={p.originalPrice ?? ""} placeholder="strike-through"
                      onChange={e => onChange({ originalPrice: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[0, 99, 149, 199, 299, 499].map(v => (
                    <button key={v} type="button" onClick={() => onChange({ price: v, free: v === 0 })}
                      className={`h-8 px-3 rounded-full text-xs font-bold border cursor-pointer ${p.price === v ? "bg-white text-black border-white" : "border-white/10 text-zinc-400 hover:text-white"}`}>
                      {v ? `₹${v}` : "Free"}
                    </button>
                  ))}
                </div>
              </Section>
              {isProduct && (
                <Section title="Category" sub="Tap one or more">
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => {
                      const on = cats.includes(c.id);
                      return (
                        <button key={c.id} type="button"
                          onClick={() => { const next = on ? cats.filter(x => x !== c.id) : [...cats, c.id]; onChange({ categories: next, category: next[0] || "" }); }}
                          className={`h-10 px-4 rounded-full text-sm font-bold border cursor-pointer transition-colors ${on ? "bg-[#FF7A1A] text-black border-[#FF7A1A]" : "border-white/10 text-zinc-300 hover:border-white/25"}`}>
                          {on && "✓ "}{c.label}
                        </button>
                      );
                    })}
                    {categories.length === 0 && <span className="text-xs text-zinc-500">No categories yet — add them on the Products screen (Edit categories).</span>}
                  </div>
                </Section>
              )}
              {isProduct && (
                <Section title="Rating on the card" sub="Optional — shown as ★ 4.8 (206)">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Stars (0–5)</Label>
                      <input type="number" min={0} max={5} step={0.1} className={inputCls} value={p.rating ?? ""}
                        onChange={e => onChange({ rating: e.target.value ? Math.max(0, Math.min(5, Number(e.target.value))) : null })} />
                    </div>
                    <div>
                      <Label>Review count</Label>
                      <input type="number" min={0} className={inputCls} value={p.reviewCount ?? ""}
                        onChange={e => onChange({ reviewCount: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                  </div>
                </Section>
              )}
            </>
          )}

          {/* ── 2 FILES ── */}
          {cur === "files" && (
            <>
              <Section title={isProduct ? "Main download" : "Course link"} sub={isProduct ? "What the buyer gets in My Library" : "Playlist / course hosting link buyers open"}>
                <FileField label="" hint="Drop a file, upload, or paste a Google Drive / link" value={fileUrl || ""} onChange={setFile} />
              </Section>
              {isProduct && (
                <Section title="Bonus free files" sub="An extra free download on a paid product">
                  <SwitchCard on={!!p.freeAssetsEnabled} onClick={() => onChange({ freeAssetsEnabled: !p.freeAssetsEnabled })}
                    icon={<Gift className="text-[#25D366]" />} title="Show a free-files button" sub="Logged-in visitors get this even before buying" tone="green" />
                  {p.freeAssetsEnabled && (
                    <FileField label="" hint="The free file" value={p.freeAssetsUrl ?? ""} onChange={url => onChange({ freeAssetsUrl: url })} />
                  )}
                </Section>
              )}
            </>
          )}

          {/* ── 3 PAGE ── */}
          {cur === "page" && (
            <>
              <Section title="Preview video" sub="YouTube / Instagram link or an mp4 link">
                <input className={inputCls} value={p.previewVideo || ""} onChange={e => onChange({ previewVideo: e.target.value })} placeholder="https://youtube.com/watch?v=…" />
              </Section>
              <Section title="Description" sub="Use ## for headings, - for bullet points">
                <textarea rows={8} className={`${areaCls} font-mono`} value={p.description || ""} onChange={e => onChange({ description: e.target.value })}
                  placeholder={"## What's inside\n- After Effects project\n- Fonts\n- Tutorial video"} />
              </Section>
              <Section title={`Screenshots (${gallery.length})`} sub="Shown as a strip on the product page"
                action={<Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={() => onChange({ gallery: [...gallery, ""] })}>Add</Button>}>
                {gallery.length === 0 ? (
                  <button type="button" onClick={() => onChange({ gallery: [""] })}
                    className="w-full h-24 rounded-xl border-2 border-dashed border-white/15 text-zinc-500 hover:border-[#FF7A1A] hover:text-[#FF7A1A] text-sm font-bold cursor-pointer">+ Add a screenshot</button>
                ) : (
                  <div className="space-y-3">
                    {gallery.map((g, i) => (
                      <div key={i} className="relative rounded-xl border border-white/[0.06] p-2">
                        <button type="button" onClick={() => onChange({ gallery: gallery.filter((_, j) => j !== i) })}
                          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-black/60 text-zinc-400 hover:text-red-400 grid place-items-center cursor-pointer" title="Remove"><Trash2 size={14} /></button>
                        <ImageField label={`Screenshot ${i + 1}`} aspect="any" value={g} onChange={url => { const n = [...gallery]; n[i] = url; onChange({ gallery: n }); }} />
                      </div>
                    ))}
                  </div>
                )}
              </Section>
              <Section title={`Questions & answers (${faq.length})`}
                action={<Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={() => onChange({ faq: [...faq, { q: "", a: "" }] })}>Add</Button>}>
                {faq.length === 0 && <div className="text-xs text-zinc-500">e.g. “Which After Effects version?” — add common questions here.</div>}
                {faq.map((f, i) => (
                  <div key={i} className="relative rounded-xl border border-white/[0.06] bg-zinc-950/50 p-3 space-y-2">
                    <button type="button" onClick={() => onChange({ faq: faq.filter((_, j) => j !== i) })}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg text-zinc-500 hover:text-red-400 grid place-items-center cursor-pointer"><X size={14} /></button>
                    <input className={`${inputCls} font-semibold pr-10`} value={f.q} placeholder="Question"
                      onChange={e => { const n = [...faq]; n[i] = { ...n[i], q: e.target.value }; onChange({ faq: n }); }} />
                    <textarea rows={2} className={areaCls} value={f.a} placeholder="Answer"
                      onChange={e => { const n = [...faq]; n[i] = { ...n[i], a: e.target.value }; onChange({ faq: n }); }} />
                  </div>
                ))}
              </Section>
            </>
          )}

          {/* ── 4 PROMPTS ── */}
          {cur === "prompts" && isProduct && (
            <Section title="Prompts (optional)" sub="Upload PSD files — layers and prompt boxes appear automatically. Saved separately with its own button.">
              <PromptKitEditor productId={p.id} isFree={(p.price ?? 0) === 0} onSaved={onPromptKitSaved} />
            </Section>
          )}

          {/* ── AI ASSETS: free tutorial + name → prompts generator ── */}
          {cur === "aiassets" && isProduct && (
            <Section title="AI assets (optional)" sub="Free “how to edit” video for everyone + a name-to-prompts generator for buyers. Generator has its own Save button.">
              <AssetGenEditor productId={p.id} tutorialUrl={p.tutorialUrl || ""} onTutorial={url => onChange({ tutorialUrl: url })} onSaved={onAssetGenSaved} />
            </Section>
          )}

          {/* ── 5 SHOW ── */}
          {cur === "show" && (
            <Section title="Where it shows" sub="Tap a card to switch it on or off">
              <div className="grid sm:grid-cols-2 gap-3">
                <SwitchCard on={!!p.enabled} onClick={() => onChange({ enabled: !p.enabled })} icon={<Eye className="text-[#25D366]" />}
                  title="Live on the site" sub={p.enabled ? "Customers can see and buy it" : "Hidden — a draft only you see"} tone="green" />
                {!isProduct && (
                  <SwitchCard on={p.live !== false} onClick={() => onChange({ live: p.live === false })} icon={<Sparkles className="text-[#FF7A1A]" />}
                    title="Open for sale" sub={p.live === false ? "Shows as “Coming soon”" : "People can buy it"} />
                )}
                {isProduct && (
                  <>
                    <SwitchCard on={!!p.featured} onClick={() => onChange({ featured: !p.featured })} icon={<Home className="text-[#FF7A1A]" />} title="Show on home" sub="Goes into the home page hero fan first" />
                    <SwitchCard on={!!p.pinned} onClick={() => onChange({ pinned: !p.pinned })} icon={<Pin className="text-amber-400" />} title="Pin to top" sub="First in the shop grid" />
                    <SwitchCard on={!!p.bestSeller} onClick={() => onChange({ bestSeller: !p.bestSeller })} icon={<Trophy className="text-amber-400" />} title="Best seller badge" sub="Orange label on the card" />
                    <SwitchCard on={!!p.isNew} onClick={() => onChange({ isNew: !p.isNew })} icon={<Sparkles className="text-sky-400" />} title="New badge" sub="Shows “NEW” on the card" />
                    <SwitchCard on={!!p.trending} onClick={() => onChange({ trending: !p.trending })} icon={<Flame className="text-orange-400" />} title="Trending badge" sub="Shows “TRENDING”" />
                  </>
                )}
              </div>
            </Section>
          )}

          {/* Back / Next */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)} className="h-11 px-4 rounded-xl border border-white/10 text-sm font-bold flex items-center gap-1 hover:border-white/25 cursor-pointer"><ChevronLeft size={16} /> Back</button>
            ) : <span />}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="h-11 px-5 rounded-xl bg-[#FF7A1A] text-black text-sm font-extrabold flex items-center gap-1 cursor-pointer">Next: {STEPS[step + 1].title} <ChevronRight size={16} /></button>
            ) : (
              <button onClick={onSave} disabled={saving} className="h-11 px-5 rounded-xl bg-[#FF7A1A] text-black text-sm font-extrabold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"><Check size={16} strokeWidth={3} /> {saving ? "Saving…" : "Save product"}</button>
            )}
          </div>
        </div>

        {/* Right: live preview + checklist */}
        <div className="lg:sticky lg:top-20 space-y-4 order-first lg:order-none">
          <div className="hidden lg:block text-[11px] font-bold tracking-wider text-zinc-500">LIVE CARD PREVIEW</div>
          <div className="hidden lg:block rounded-2xl border border-white/[0.08] bg-[#131313] overflow-hidden">
            <div className="relative bg-zinc-900" style={{ aspectRatio: isProduct ? "1" : "16/9" }}>
              {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-zinc-600 text-xs">No image yet</div>}
              {isProduct && (p.bestSeller || p.isNew || p.trending) && (
                <span className="absolute top-2.5 left-2.5 bg-[#FF7A1A] text-black text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md">{p.bestSeller ? "Best seller" : p.isNew ? "New" : "Trending"}</span>
              )}
              {!p.enabled && <span className="absolute top-2.5 right-2.5 bg-black/80 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/20">DRAFT</span>}
            </div>
            <div className="p-3.5">
              <b className="block text-sm leading-snug line-clamp-2">{name || "Product name"}</b>
              {isProduct && p.rating > 0 && <div className="text-xs text-[#ffc35a] mt-1">★ {Number(p.rating).toFixed(1)} {p.reviewCount ? <span className="text-zinc-500">({p.reviewCount})</span> : null}</div>}
              <div className="flex items-baseline gap-2 mt-2">
                <span className={`text-lg font-extrabold ${p.price ? "" : "text-[#25D366]"}`}>{p.price ? `₹${p.price}` : "FREE"}</span>
                {p.originalPrice > p.price && <s className="text-xs text-zinc-500">₹{p.originalPrice}</s>}
                <span className="ml-auto text-[#FF7A1A] text-xs font-bold">View →</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#131313] p-4">
            <div className="flex items-center justify-between mb-2">
              <b className="text-sm">Ready to sell?</b>
              <span className={`text-xs font-bold ${ready === checks.length ? "text-[#25D366]" : "text-zinc-500"}`}>{ready}/{checks.length}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden mb-3"><i className="block h-full bg-[#25D366] transition-all" style={{ width: `${(ready / checks.length) * 100}%` }} /></div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1">
              {checks.map((c, i) => (
                <button key={i} onClick={() => setStep(c.step)} className="flex items-center gap-2 text-left text-xs py-1 hover:text-white text-zinc-300 cursor-pointer">
                  <span className={`w-4 h-4 rounded grid place-items-center shrink-0 ${c.ok ? "bg-[#25D366] text-black" : "border border-zinc-600"}`}>{c.ok && <Check size={11} strokeWidth={3.5} />}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className={`fixed left-1/2 -translate-x-1/2 bottom-4 z-[80] flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl border border-[#FF7A1A]/50 bg-[#1d1208] shadow-[0_20px_50px_rgba(0,0,0,.6)] transition-all duration-300 whitespace-nowrap ${dirty ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"}`}>
        <span className="w-2 h-2 rounded-full bg-[#FF7A1A] animate-pulse" />
        <span className="text-sm font-bold">Unsaved changes</span>
        <button onClick={onSave} disabled={saving} className="h-9 px-4 rounded-xl bg-[#FF7A1A] text-black text-sm font-extrabold disabled:opacity-60 cursor-pointer">{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}
