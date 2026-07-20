import { useEffect, useState } from "react";
import { db } from "../firebase";
import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { DEFAULT_CHECKOUT_HELP, SEED_STORE, StoreData, Product, Course, ProductCategory, PageConfig, Coupon, mergePages } from "../lib/store";
import { ImageField } from "./ImageField";
import { FileField } from "./FileField";
import {
  Button,
  Card,
  CardHeader,
  Badge,
  Field,
  FieldLabel,
  Input,
  Textarea,
  Select,
  Toggle,
  EmptyState,
  SkeletonRow,
  useToast,
  useConfirm,
  usePrompt,
} from "./admin/ui";
import { Eye, Home, FileQuestion, Puzzle, Plus, Trash2, Search, RefreshCw, UserCircle2, Tag, Package, GraduationCap } from "lucide-react";

const toId = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `item-${Date.now()}`;

// ─── store data hook (admin: load once, edit locally, explicit save) ──────────
function useAdminStore() {
  const [data, setData] = useState<StoreData | null>(null);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "store", "data"));
        if (snap.exists()) {
          const d = snap.data() as Partial<StoreData>;
          setData({
            products: d.products || SEED_STORE.products,
            courses: d.courses || SEED_STORE.courses,
            productCategories: d.productCategories || SEED_STORE.productCategories,
            pages: mergePages(d.pages),
            coupons: Array.isArray(d.coupons) ? d.coupons : [],
            checkoutHelp: { ...DEFAULT_CHECKOUT_HELP, ...(d.checkoutHelp || {}) },
          });
        } else {
          setData(SEED_STORE);
        }
      } catch (e) {
        console.error(e);
        setData(SEED_STORE);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!data) return;
    try {
      await setDoc(doc(db, "store", "data"), data);
      toast.success("Store changes saved live");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save store data.");
    }
  };

  return { data, setData, save };
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Button variant="primary" onClick={onSave}>Save Store Changes</Button>
      <span className="text-zinc-500 text-xs">Changes go live only after saving.</span>
    </div>
  );
}

function PanelLoading() {
  return (
    <div className="space-y-1">
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}

function PageTitle({ children, accent }: { children: React.ReactNode; accent: React.ReactNode }) {
  return (
    <h1 className="text-2xl font-bold tracking-tight mb-1">
      {children} <span className="text-[#E50914]">{accent}</span>
    </h1>
  );
}

// ═══ PAGES / SECTIONS VISIBILITY PANEL ═════════════════════════════════════════
export function AdminPagesPanel() {
  const { data, setData, save } = useAdminStore();
  if (!data) return <PanelLoading />;

  const setPages = (pages: PageConfig[]) => setData({ ...data, pages });
  const toggle = (id: string, v: boolean) =>
    setPages(data.pages.map(p => (p.id === id ? { ...p, enabled: v } : p)));
  const setAll = (v: boolean) => setPages(data.pages.map(p => ({ ...p, enabled: v })));

  const onCount = data.pages.filter(p => p.enabled).length;

  return (
    <div className="space-y-5">
      <div>
        <PageTitle accent="Sections">Pages &amp;</PageTitle>
        <p className="text-zinc-500 text-xs max-w-xl leading-relaxed">
          Switch any page off and it disappears from the menu, from the home page, and its link stops working — visitors get sent back home.
        </p>
      </div>
      <SaveBar onSave={save} />

      <Card>
        <CardHeader
          title={`Visible on site (${onCount}/${data.pages.length})`}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="success" onClick={() => setAll(true)}>Show all</Button>
              <Button size="sm" variant="danger" onClick={() => setAll(false)}>Hide all</Button>
            </div>
          }
        />

        <div className="space-y-2.5">
          {/* Home is the landing page — always on */}
          <div className="flex items-center gap-3 bg-white/[0.015] border border-dashed border-white/10 rounded-xl px-4 py-3 opacity-70">
            <Home size={16} className="text-zinc-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-zinc-400 text-sm">Home</div>
              <div className="text-zinc-600 text-[11px]">Always on — it's your landing page</div>
            </div>
            <span className="text-zinc-600 text-[10px] font-bold tracking-wider">LOCKED</span>
          </div>

          {data.pages.map(p => (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${
                p.enabled ? "bg-white/[0.02] border-white/10" : "bg-white/[0.01] border-white/5 opacity-55"
              }`}
            >
              {p.path ? <FileQuestion size={16} className="text-zinc-500 shrink-0" /> : <Puzzle size={16} className="text-zinc-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className={`font-bold text-sm ${p.enabled ? "text-white" : "text-zinc-500"}`}>{p.label}</div>
                <div className="text-zinc-600 text-[11px] font-mono truncate">{p.path || "home page section"}</div>
              </div>
              <Badge toneKey={p.enabled ? "success" : "danger"}>{p.enabled ? "Visible" : "Hidden"}</Badge>
              <Toggle value={p.enabled} onChange={v => toggle(p.id, v)} />
            </div>
          ))}
        </div>
      </Card>

      {/* Fallback note shown under the buy button ONLY after a checkout
          actually fails — edit the wording/phone here, no code change needed. */}
      <Card>
        <CardHeader title="Checkout-failure help message" />
        <p className="text-zinc-500 text-[11px] leading-relaxed mb-4">
          Shown on a purchase card only after online checkout fails for that attempt.
          Use <code className="text-zinc-300">{"{price}"}</code> for the amount and{" "}
          <code className="text-zinc-300">{"{phone}"}</code> for the GPay number below.
          A "Message on WhatsApp" link is always added after the message.
        </p>
        <div className="space-y-4">
          <Field>
            <FieldLabel>Message</FieldLabel>
            <Textarea
              rows={3}
              value={data.checkoutHelp?.message ?? DEFAULT_CHECKOUT_HELP.message}
              onChange={e =>
                setData({
                  ...data,
                  checkoutHelp: { ...(data.checkoutHelp || DEFAULT_CHECKOUT_HELP), message: e.target.value },
                })
              }
            />
          </Field>
          <Field>
            <FieldLabel>GPay phone number</FieldLabel>
            <Input
              value={data.checkoutHelp?.phone ?? DEFAULT_CHECKOUT_HELP.phone}
              onChange={e =>
                setData({
                  ...data,
                  checkoutHelp: { ...(data.checkoutHelp || DEFAULT_CHECKOUT_HELP), phone: e.target.value },
                })
              }
            />
          </Field>
        </div>
      </Card>

      <SaveBar onSave={save} />
    </div>
  );
}

// ═══ DETAIL-PAGE FIELDS (shared by products + courses) ════════════════════════
import { parseVideo, describeVideo } from "../lib/video";
import { renderMarkdown } from "../lib/markdown";
import type { DetailContent } from "../lib/store";

function DetailFieldsEditor<T extends DetailContent & { id: string }>({
  item,
  onChange,
}: {
  item: T;
  aspect: "square" | "video";
  onChange: (ch: Partial<T>) => void;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const preview = parseVideo(item.previewVideo);
  const desc = describeVideo(preview);

  const setFaq = (faq: { q: string; a: string }[]) => onChange({ faq } as Partial<T>);
  const setGallery = (gallery: string[]) => onChange({ gallery } as Partial<T>);

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.05] space-y-4">
      <div className="text-[#E50914] text-[10px] font-bold tracking-widest uppercase">Detail page content</div>

      {/* Preview video URL */}
      <Field label="Preview video URL (optional)">
        <Input
          value={item.previewVideo || ""}
          onChange={e => onChange({ previewVideo: e.target.value } as Partial<T>)}
          placeholder="https://youtube.com/watch?v=... or Instagram reel or .mp4 link"
          className="font-mono"
        />
        {desc && <div className="text-[#25D366] text-[11px] mt-1">✓ Detected: {desc}</div>}
        {item.previewVideo && !desc && (
          <div className="text-[#E50914] text-[11px] mt-1">⚠ Not a recognised YouTube / Instagram / video-file URL</div>
        )}
      </Field>

      {/* Description (markdown) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <FieldLabel>Description (markdown)</FieldLabel>
          <button
            onClick={() => setShowPreview(v => !v)}
            className="bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md px-2.5 py-1 text-[11px] font-bold cursor-pointer hover:bg-blue-500/20 transition-colors"
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
        {showPreview ? (
          <div className="bg-zinc-950 border border-white/10 rounded-lg p-3.5 min-h-[120px]">
            <div className="prose prose-invert prose-sm max-w-none">{renderMarkdown(item.description || "(nothing to preview yet)")}</div>
          </div>
        ) : (
          <Textarea
            value={item.description || ""}
            onChange={e => onChange({ description: e.target.value } as Partial<T>)}
            rows={8}
            placeholder={"## What this is\nA short intro paragraph.\n\n## What you get\n- Feature one\n- Feature two"}
            className="font-mono text-[12px]"
          />
        )}
        <div className="text-zinc-600 text-[10px] mt-1">
          Headings: # ## ### · bullets: - or * · numbered: 1. · divider: --- · **bold** · [link](url)
        </div>
      </div>

      {/* Gallery */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel>Gallery (screenshots shown as a strip)</FieldLabel>
          <button
            onClick={() => setGallery([...(item.gallery || []), ""])}
            className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 rounded-md px-2.5 py-1 text-[11px] font-bold cursor-pointer hover:bg-[#25D366]/20 transition-colors"
          >
            + Add screenshot
          </button>
        </div>
        {(item.gallery || []).map((url, i) => (
          <div key={i} className="mb-2 p-2.5 bg-zinc-950 border border-white/10 rounded-lg">
            <ImageField
              label={`SCREENSHOT ${i + 1}`}
              aspect="any"
              value={url}
              onChange={u => {
                const next = [...(item.gallery || [])];
                next[i] = u;
                setGallery(next);
              }}
            />
            <button
              onClick={() => setGallery((item.gallery || []).filter((_, j) => j !== i))}
              className="bg-red-500/10 text-red-400 rounded-md px-2.5 py-1 text-[11px] font-bold cursor-pointer mt-1.5 hover:bg-red-500/20 transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Terms */}
      <Field label="Terms (shown above the buy button)">
        <Textarea
          value={item.terms || ""}
          onChange={e => onChange({ terms: e.target.value } as Partial<T>)}
          rows={2}
          placeholder="Leave blank to use the default terms. Keep it short — this appears in the purchase card."
          className="text-[12px]"
        />
      </Field>

      {/* FAQ */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel>FAQ (question and answer pairs)</FieldLabel>
          <button
            onClick={() => setFaq([...(item.faq || []), { q: "", a: "" }])}
            className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 rounded-md px-2.5 py-1 text-[11px] font-bold cursor-pointer hover:bg-[#25D366]/20 transition-colors"
          >
            + Add question
          </button>
        </div>
        {(item.faq || []).map((row, i) => (
          <div key={i} className="mb-2 p-2.5 bg-zinc-950 border border-white/10 rounded-lg">
            <Input
              value={row.q}
              onChange={e => {
                const next = [...(item.faq || [])];
                next[i] = { ...next[i], q: e.target.value };
                setFaq(next);
              }}
              placeholder="Question"
              className="mb-1.5 font-semibold"
            />
            <Textarea
              value={row.a}
              onChange={e => {
                const next = [...(item.faq || [])];
                next[i] = { ...next[i], a: e.target.value };
                setFaq(next);
              }}
              rows={2}
              placeholder="Answer"
              className="text-[12px]"
            />
            <button
              onClick={() => setFaq((item.faq || []).filter((_, j) => j !== i))}
              className="bg-red-500/10 text-red-400 rounded-md px-2.5 py-1 text-[11px] font-bold cursor-pointer mt-1.5 hover:bg-red-500/20 transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ PRODUCTS + CATEGORIES PANEL ═══════════════════════════════════════════════
export function AdminProductsPanel() {
  const { data, setData, save } = useAdminStore();
  const confirmDialog = useConfirm();
  const { prompt } = usePrompt();
  if (!data) return <PanelLoading />;

  const setCats = (cats: ProductCategory[]) => setData({ ...data, productCategories: cats });
  const setProds = (ps: Product[]) => setData({ ...data, products: ps });

  const addCategory = async () => {
    const label = await prompt({ title: "New product category", label: "Category name", placeholder: "e.g. Transitions" });
    if (!label?.trim()) return;
    setCats([...data.productCategories, { id: toId(label), label: label.trim(), enabled: true }]);
  };

  const addProduct = () => {
    setProds([
      {
        id: `product-${Date.now()}`,
        name: "New Product",
        tagline: "",
        price: 0,
        image: "",
        category: data.productCategories[0]?.id || "",
        free: true,
        downloadUrl: "",
        featured: false,
        enabled: false,
      },
      ...data.products,
    ]);
  };

  const upProd = (id: string, ch: Partial<Product>) =>
    setProds(data.products.map(p => (p.id === id ? { ...p, ...ch } : p)));

  return (
    <div className="space-y-5">
      <div>
        <PageTitle accent="Products">Store</PageTitle>
        <p className="text-zinc-500 text-xs max-w-xl leading-relaxed">
          Square thumbnails shown on site • Free products are claimable instantly after login • Paid products are granted from the Users tab
        </p>
      </div>
      <SaveBar onSave={save} />

      {/* Categories */}
      <Card>
        <CardHeader
          title="Product Categories"
          action={<Button size="sm" variant="secondary" icon={<Plus size={11} />} onClick={addCategory}>Add Category</Button>}
        />
        <div className="space-y-2">
          {data.productCategories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2.5 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5">
              <Input
                value={cat.label}
                onChange={e => setCats(data.productCategories.map(c => c.id === cat.id ? { ...c, label: e.target.value } : c))}
                className="flex-1 font-bold"
              />
              <Toggle value={cat.enabled} onChange={v => setCats(data.productCategories.map(c => c.id === cat.id ? { ...c, enabled: v } : c))} />
              <button
                onClick={async () => {
                  if (await confirmDialog({ title: `Delete category "${cat.label}"?`, danger: true, confirmLabel: "Delete" }))
                    setCats(data.productCategories.filter(c => c.id !== cat.id));
                }}
                className="w-8 h-8 shrink-0 flex items-center justify-center bg-red-500/10 text-red-400 rounded-lg cursor-pointer hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        {data.productCategories.length === 0 && <EmptyState title="No categories yet" />}
      </Card>

      {/* Products */}
      <Card>
        <CardHeader
          title="Products"
          action={<Button size="sm" variant="success" icon={<Plus size={11} />} onClick={addProduct}>Add Product</Button>}
        />
        <div className="space-y-3">
          {data.products.map(p => (
            <div key={p.id} className={`bg-zinc-950/50 border border-white/5 rounded-2xl p-4 transition-opacity ${p.enabled ? "" : "opacity-60"}`}>
              <div className="mb-3.5">
                <ImageField label="THUMBNAIL" aspect="square" value={p.image} onChange={url => upProd(p.id, { image: url })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Field label="Name" className="sm:col-span-2">
                  <Input value={p.name} onChange={e => upProd(p.id, { name: e.target.value })} />
                </Field>
                <Field label="Price ₹ (0 = free)">
                  <Input type="number" value={p.price} onChange={e => { const v = Number(e.target.value); upProd(p.id, { price: v, free: v === 0 }); }} />
                </Field>
                <Field label="Original ₹ (optional)">
                  <Input type="number" value={p.originalPrice ?? ""} onChange={e => upProd(p.id, { originalPrice: e.target.value ? Number(e.target.value) : undefined })} />
                </Field>
                <Field label="Category">
                  <Select value={p.category} onChange={e => upProd(p.id, { category: e.target.value })}>
                    {data.productCategories.map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}
                  </Select>
                </Field>
                <Field label="Badge (optional)">
                  <Input value={p.badge ?? ""} onChange={e => upProd(p.id, { badge: e.target.value || undefined })} placeholder="Best Seller" />
                </Field>
                <Field label="Tagline" className="sm:col-span-3">
                  <Input value={p.tagline} onChange={e => upProd(p.id, { tagline: e.target.value })} />
                </Field>
                <div className="sm:col-span-3">
                  <FileField
                    label="PRODUCT FILE (delivered in My Library)"
                    hint="Upload a file, or paste a Google Drive / Dropbox link"
                    value={p.downloadUrl}
                    onChange={url => upProd(p.id, { downloadUrl: url })}
                  />
                </div>
                {p.freeAssetsEnabled && (
                  <div className="sm:col-span-3">
                    <FileField
                      label="FREE ASSETS FILE (extra button on product page)"
                      hint="Upload a file, or paste a link — shown to logged-in users even before purchase"
                      value={p.freeAssetsUrl ?? ""}
                      onChange={url => upProd(p.id, { freeAssetsUrl: url })}
                    />
                  </div>
                )}
              </div>
              <DetailFieldsEditor item={p} aspect="square" onChange={ch => upProd(p.id, ch)} />
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-4 pt-4 border-t border-white/[0.05]">
                <label className="flex items-center gap-2 text-zinc-400 text-xs font-bold">FREE <Toggle value={p.free} onChange={v => upProd(p.id, { free: v, price: v ? 0 : p.price })} /></label>
                <label className="flex items-center gap-2 text-zinc-400 text-xs font-bold">FEATURED (home) <Toggle value={!!p.featured} onChange={v => upProd(p.id, { featured: v })} /></label>
                <label className="flex items-center gap-2 text-zinc-400 text-xs font-bold">VISIBLE <Toggle value={p.enabled} onChange={v => upProd(p.id, { enabled: v })} /></label>
                <label className="flex items-center gap-2 text-zinc-400 text-xs font-bold">FREE ASSETS <Toggle value={!!p.freeAssetsEnabled} onChange={v => upProd(p.id, { freeAssetsEnabled: v })} /></label>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 size={12} />}
                  onClick={async () => { if (await confirmDialog({ title: `Delete "${p.name}"?`, danger: true, confirmLabel: "Delete" })) setProds(data.products.filter(x => x.id !== p.id)); }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
        {data.products.length === 0 && (
          <EmptyState icon={<Package size={28} />} title="No products yet" description="Click + Add Product to create your first listing." />
        )}
      </Card>

      <SaveBar onSave={save} />
    </div>
  );
}

// ═══ COURSES PANEL ═════════════════════════════════════════════════════════════
export function AdminCoursesPanel() {
  const { data, setData, save } = useAdminStore();
  const confirmDialog = useConfirm();
  if (!data) return <PanelLoading />;

  const setCourses = (cs: Course[]) => setData({ ...data, courses: cs });
  const upCourse = (id: string, ch: Partial<Course>) =>
    setCourses(data.courses.map(c => (c.id === id ? { ...c, ...ch } : c)));

  const addCourse = () => {
    setCourses([
      {
        id: `course-${Date.now()}`,
        title: "New Course",
        tagline: "",
        thumbnail: "",
        price: 0,
        features: [],
        free: true,
        accessUrl: "",
        enabled: false,
        live: true,
      },
      ...data.courses,
    ]);
  };

  return (
    <div className="space-y-5">
      <div>
        <PageTitle accent="Courses">My</PageTitle>
        <p className="text-zinc-500 text-xs max-w-xl leading-relaxed">
          16:9 YouTube-style thumbnails • One feature per line • Access URL is shown to enrolled users in My Library
        </p>
      </div>
      <SaveBar onSave={save} />

      <Card>
        <CardHeader
          title="Courses"
          action={<Button size="sm" variant="success" icon={<Plus size={11} />} onClick={addCourse}>Add Course</Button>}
        />
        <div className="space-y-3">
          {data.courses.map(c => (
            <div key={c.id} className={`bg-zinc-950/50 border border-white/5 rounded-2xl p-4 transition-opacity ${c.enabled ? "" : "opacity-60"}`}>
              <div className="mb-3.5">
                <ImageField label="THUMBNAIL" aspect="video" value={c.thumbnail} onChange={url => upCourse(c.id, { thumbnail: url })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Field label="Title" className="sm:col-span-2">
                  <Input value={c.title} onChange={e => upCourse(c.id, { title: e.target.value })} />
                </Field>
                <Field label="Price ₹ (0 = free)">
                  <Input type="number" value={c.price} onChange={e => { const v = Number(e.target.value); upCourse(c.id, { price: v, free: v === 0 }); }} />
                </Field>
                <Field label="Original ₹ (optional)">
                  <Input type="number" value={c.originalPrice ?? ""} onChange={e => upCourse(c.id, { originalPrice: e.target.value ? Number(e.target.value) : undefined })} />
                </Field>
                <Field label="Badge (optional)">
                  <Input value={c.badge ?? ""} onChange={e => upCourse(c.id, { badge: e.target.value || undefined })} placeholder="New" />
                </Field>
                <Field label="Tagline" className="sm:col-span-3">
                  <Input value={c.tagline} onChange={e => upCourse(c.id, { tagline: e.target.value })} />
                </Field>
                <div className="sm:col-span-3">
                  <FileField
                    label="COURSE ACCESS (delivered in My Library)"
                    hint="Unlisted playlist / course platform link — or upload a file"
                    value={c.accessUrl}
                    onChange={url => upCourse(c.id, { accessUrl: url })}
                  />
                </div>
                <Field label="Features — one per line" className="sm:col-span-3">
                  <Textarea
                    value={c.features.join("\n")}
                    onChange={e => upCourse(c.id, { features: e.target.value.split("\n") })}
                    onBlur={e => upCourse(c.id, { features: e.target.value.split("\n").map(f => f.trim()).filter(Boolean) })}
                    rows={4}
                    className="font-sans"
                  />
                </Field>
              </div>
              <DetailFieldsEditor item={c} aspect="video" onChange={ch => upCourse(c.id, ch)} />
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-4 pt-4 border-t border-white/[0.05]">
                <label className="flex items-center gap-2 text-zinc-400 text-xs font-bold">FREE <Toggle value={c.free} onChange={v => upCourse(c.id, { free: v, price: v ? 0 : c.price })} /></label>
                <label className="flex items-center gap-2 text-zinc-400 text-xs font-bold">VISIBLE <Toggle value={c.enabled} onChange={v => upCourse(c.id, { enabled: v })} /></label>
                {/* Visible + not live = listed as "Coming Soon": not purchasable, excluded from recommendations */}
                <label className="flex items-center gap-2 text-zinc-400 text-xs font-bold">LIVE (PURCHASABLE) <Toggle value={c.live !== false} onChange={v => upCourse(c.id, { live: v })} /></label>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 size={12} />}
                  onClick={async () => { if (await confirmDialog({ title: `Delete "${c.title}"?`, danger: true, confirmLabel: "Delete" })) setCourses(data.courses.filter(x => x.id !== c.id)); }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
        {data.courses.length === 0 && (
          <EmptyState icon={<GraduationCap size={28} />} title="No courses yet" description="Click + Add Course to build your academy library." />
        )}
      </Card>

      <SaveBar onSave={save} />
    </div>
  );
}

// ═══ USERS PANEL ═══════════════════════════════════════════════════════════════
interface AdminUser {
  uid: string;
  name: string;
  email: string;
  photo: string;
  lastLogin?: any;
  purchases: string[];
}

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [items, setItems] = useState<{ id: string; label: string; paid: boolean }[]>([]);
  const [grantFor, setGrantFor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const confirmDialog = useConfirm();
  const toast = useToast();

  const load = async () => {
    try {
      const [uSnap, sSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDoc(doc(db, "store", "data")),
      ]);
      const us: AdminUser[] = uSnap.docs.map(d => {
        const x = d.data();
        return { uid: d.id, name: x.name || "", email: x.email || "", photo: x.photo || "", lastLogin: x.lastLogin, purchases: x.purchases || [] };
      });
      us.sort((a, b) => (b.lastLogin?.seconds || 0) - (a.lastLogin?.seconds || 0));
      setUsers(us);

      const sd = sSnap.exists() ? (sSnap.data() as Partial<StoreData>) : SEED_STORE;
      setItems([
        ...(sd.products || SEED_STORE.products).map(p => ({ id: p.id, label: `📦 ${p.name}`, paid: !p.free })),
        ...(sd.courses || SEED_STORE.courses).map(c => ({ id: c.id, label: `🎓 ${c.title}`, paid: !c.free })),
      ]);
    } catch (e) {
      console.error(e);
      setUsers([]);
    }
  };

  useEffect(() => { load(); }, []);

  const grant = async (uid: string, itemId: string) => {
    await updateDoc(doc(db, "users", uid), { purchases: arrayUnion(itemId) });
    setUsers(us => us!.map(u => u.uid === uid ? { ...u, purchases: [...new Set([...u.purchases, itemId])] } : u));
    setGrantFor(null);
    toast.success("Access granted");
  };

  const revoke = async (uid: string, itemId: string) => {
    if (!(await confirmDialog({ title: "Remove this item?", description: "It will be removed from the user's library.", danger: true, confirmLabel: "Remove" }))) return;
    await updateDoc(doc(db, "users", uid), { purchases: arrayRemove(itemId) });
    setUsers(us => us!.map(u => u.uid === uid ? { ...u, purchases: u.purchases.filter(p => p !== itemId) } : u));
    toast.success("Access removed");
  };

  const labelOf = (id: string) => items.find(i => i.id === id)?.label || id;
  const fmtDate = (ts: any) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const filteredUsers = (users || []).filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <PageTitle accent="Users">Logged-in</PageTitle>
        <p className="text-zinc-500 text-xs mb-3">Everyone who logged in on the website appears here automatically.</p>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <span className="text-base leading-none mt-0.5">💡</span>
          <p className="text-zinc-400 text-xs leading-relaxed">
            When a customer pays you on WhatsApp, click <b className="text-[#25D366]">+ Grant Access</b> on their row and pick the product/course — it instantly appears in their <b className="text-white">My Library</b> with the download link.
          </p>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name or email…"
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader
          title={`Users (${filteredUsers.length} of ${users?.length ?? 0})`}
          action={<Button size="sm" variant="secondary" icon={<RefreshCw size={12} />} onClick={load}>Refresh</Button>}
        />
        {users === null && <PanelLoading />}
        {users !== null && filteredUsers.length === 0 && <EmptyState icon={<UserCircle2 size={28} />} title="No matching users found" />}
        <div className="space-y-3">
          {filteredUsers.map(u => (
            <div key={u.uid} className="bg-zinc-950/50 border border-white/5 rounded-2xl p-3.5">
              <div className="flex items-center gap-3">
                {u.photo
                  ? <img src={u.photo} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full border-2 border-[#E50914]/40 shrink-0" />
                  : <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0"><UserCircle2 size={20} className="text-zinc-500" /></div>}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm truncate">{u.name || "(no name)"}</div>
                  <div className="text-zinc-500 text-xs truncate">{u.email}</div>
                </div>
                <div className="text-zinc-500 text-[11px] text-right hidden sm:block shrink-0">
                  <div>Last login</div>
                  <div className="text-zinc-400">{fmtDate(u.lastLogin)}</div>
                </div>
                <Button size="sm" variant="success" onClick={() => setGrantFor(grantFor === u.uid ? null : u.uid)}>+ Grant Access</Button>
              </div>

              {/* Purchases */}
              {u.purchases.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {u.purchases.map(pid => (
                    <span key={pid} className="bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] rounded-full px-2.5 py-1 text-xs flex items-center gap-1.5">
                      {labelOf(pid)}
                      <button onClick={() => revoke(u.uid, pid)} className="text-red-400 cursor-pointer hover:text-red-300">✕</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Grant dropdown */}
              {grantFor === u.uid && (
                <div className="mt-2.5 bg-zinc-900 border border-white/10 rounded-xl p-2.5 flex flex-wrap gap-1.5">
                  {items.filter(i => !u.purchases.includes(i.id)).map(i => (
                    <button
                      key={i.id}
                      onClick={() => grant(u.uid, i.id)}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-lg px-3 py-1.5 text-xs cursor-pointer transition-colors"
                    >
                      {i.label} {i.paid ? "" : "(free)"}
                    </button>
                  ))}
                  {items.filter(i => !u.purchases.includes(i.id)).length === 0 && (
                    <span className="text-zinc-500 text-xs">User already owns everything 🎉</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══ COUPONS PANEL ═════════════════════════════════════════════════════════════
export function AdminCouponsPanel() {
  const { data, setData, save } = useAdminStore();
  const confirmDialog = useConfirm();
  if (!data) return <PanelLoading />;

  const coupons = data.coupons || [];
  const setCoupons = (cs: Coupon[]) => setData({ ...data, coupons: cs });

  const addCoupon = () => {
    setCoupons([
      { code: "LAUNCH10", percentOff: 10, enabled: true, appliesTo: [], uses: 0 },
      ...coupons,
    ]);
  };

  const upCoupon = (i: number, ch: Partial<Coupon>) => {
    setCoupons(coupons.map((c, j) => (j === i ? { ...c, ...ch } : c)));
  };

  // All items (products + courses) shown in the "applies to" picker
  const allItems = [
    ...(data.products || []).map(p => ({ id: p.id, label: `📦 ${p.name}` })),
    ...(data.courses || []).map(c => ({ id: c.id, label: `🎓 ${c.title}` })),
  ];

  return (
    <div className="space-y-5">
      <div>
        <PageTitle accent="Coupons">Discount</PageTitle>
        <p className="text-zinc-500 text-xs max-w-xl leading-relaxed">
          Buyers enter the code at checkout · code stored uppercase · leave "applies to" empty to work on everything · usage count updates automatically
        </p>
      </div>
      <SaveBar onSave={save} />

      <Card>
        <CardHeader
          title={`Coupons (${coupons.length})`}
          action={<Button size="sm" variant="success" icon={<Plus size={11} />} onClick={addCoupon}>Add Coupon</Button>}
        />
        {coupons.length === 0 && <EmptyState icon={<Tag size={28} />} title="No coupons yet" description="Click + Add Coupon to create a discount code." />}
        <div className="space-y-3">
          {coupons.map((c, i) => (
            <div key={i} className={`bg-zinc-950/50 border border-white/5 rounded-2xl p-4 transition-opacity ${c.enabled ? "" : "opacity-60"}`}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <Field label="Code">
                  <Input
                    value={c.code}
                    onChange={e => upCoupon(i, { code: e.target.value.toUpperCase().replace(/\s+/g, "") })}
                    placeholder="LAUNCH50"
                    className="font-bold uppercase tracking-wider"
                  />
                </Field>
                <Field label="% Off">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={c.percentOff}
                    onChange={e => upCoupon(i, { percentOff: Math.max(0, Math.min(100, Number(e.target.value))) })}
                  />
                </Field>
                <Field label="Expires (optional)">
                  <Input
                    type="date"
                    value={c.expiresAt ? c.expiresAt.slice(0, 10) : ""}
                    onChange={e => upCoupon(i, { expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  />
                </Field>
                <Field label="Max Uses (optional)">
                  <Input
                    type="number"
                    min={0}
                    value={c.maxUses ?? ""}
                    onChange={e => upCoupon(i, { maxUses: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Unlimited"
                  />
                </Field>
              </div>

              {/* Applies to picker */}
              <Field label='Applies to (leave empty for everything)' className="mb-3">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {allItems.map(item => {
                    const on = (c.appliesTo || []).includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          const next = new Set(c.appliesTo || []);
                          if (on) next.delete(item.id); else next.add(item.id);
                          upCoupon(i, { appliesTo: Array.from(next) });
                        }}
                        className={`rounded-full px-3 py-1 text-[11px] font-bold cursor-pointer transition-colors border ${
                          on ? "bg-[#25D366]/20 border-[#25D366] text-[#25D366]" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                        }`}
                      >
                        {on ? "✓ " : ""}{item.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3 border-t border-white/[0.05]">
                <label className="flex items-center gap-2 text-zinc-400 text-xs font-bold">
                  ENABLED
                  <Toggle value={c.enabled} onChange={v => upCoupon(i, { enabled: v })} />
                </label>
                <span className="text-zinc-500 text-xs">
                  Used <b className="text-zinc-300">{c.uses || 0}</b>
                  {c.maxUses != null ? ` / ${c.maxUses}` : ""} times
                </span>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 size={12} />}
                  onClick={async () => { if (await confirmDialog({ title: `Delete coupon "${c.code}"?`, danger: true, confirmLabel: "Delete" })) setCoupons(coupons.filter((_, j) => j !== i)); }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
