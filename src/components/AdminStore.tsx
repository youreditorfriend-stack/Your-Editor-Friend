import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { DEFAULT_CHECKOUT_HELP, SEED_STORE, StoreData, Product, Course, ProductCategory, PageConfig, Coupon, Bundle, mergePages, netAfterFees } from "../lib/store";
import { adminAuthBody } from "../lib/adminAuth";
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
import { Eye, Home, FileQuestion, Puzzle, Plus, Trash2, Search, RefreshCw, UserCircle2, Tag, Package, GraduationCap, Mail, Copy, Send } from "lucide-react";

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
            bundles: Array.isArray(d.bundles) ? d.bundles : [],
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
      // merge: never wipe top-level fields another panel owns (e.g. bundles)
      await setDoc(doc(db, "store", "data"), data, { merge: true });
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
      {children} <span className="text-[#FF7A1A]">{accent}</span>
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
      <div className="text-[#FF7A1A] text-[10px] font-bold tracking-widest uppercase">Detail page content</div>

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
          <div className="text-[#FF7A1A] text-[11px] mt-1">⚠ Not a recognised YouTube / Instagram / video-file URL</div>
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
  payments: any[];
}

// Per-customer money summary derived from their payments[] (amount in paise).
function userSpend(u: AdminUser) {
  const spent = (u.payments || []).reduce((s, p) => s + (p.amount ? p.amount / 100 : 0), 0);
  return { spent, netProfit: netAfterFees(spent), paidCount: (u.payments || []).length };
}

// Prefilled apology template for the checkout-outage announcement — the admin
// can edit any of it before copying or sending.
const APOLOGY_SUBJECT = "Sorry about the checkout issue — it's fixed now ✅";
const APOLOGY_HEADING = "We're sorry — and it's working now";
const APOLOGY_BODY = `Hi there,

You recently tried to buy something on Your Editor Friend and the checkout wasn't going through — sorry about that! The issue has now been fixed and purchases are working perfectly again.

Please head back to the site and try again — everything should go through smoothly this time. If you still hit any trouble, just reply to this email or message us on WhatsApp and we'll sort it out right away.

Thanks so much for your patience 🙏
— Janish, Your Editor Friend`;

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [items, setItems] = useState<{ id: string; label: string; paid: boolean }[]>([]);
  const [grantFor, setGrantFor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "spent" | "profit">("recent");
  const confirmDialog = useConfirm();
  const toast = useToast();

  // ── Announcement / apology email composer ──────────────────────────────
  const [emailOpen, setEmailOpen] = useState(false);
  const [subject, setSubject] = useState(APOLOGY_SUBJECT);
  const [heading, setHeading] = useState(APOLOGY_HEADING);
  const [bodyText, setBodyText] = useState(APOLOGY_BODY);
  const [ctaLabel, setCtaLabel] = useState("Try your purchase again");
  const [ctaUrl, setCtaUrl] = useState("https://www.youreditorfriend.in/products");
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const [uSnap, sSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDoc(doc(db, "store", "data")),
      ]);
      const us: AdminUser[] = uSnap.docs.map(d => {
        const x = d.data();
        return { uid: d.id, name: x.name || "", email: x.email || "", photo: x.photo || "", lastLogin: x.lastLogin, purchases: x.purchases || [], payments: x.payments || [] };
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

  const filteredUsers = (users || [])
    .filter(u =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "recent") return (b.lastLogin?.seconds || 0) - (a.lastLogin?.seconds || 0);
      return userSpend(b).spent - userSpend(a).spent; // spent & profit rank identically
    });

  // Studio-wide money totals across every logged-in customer.
  const studioTotals = useMemo(() => {
    const list = users || [];
    const grossRevenue = list.reduce((s, u) => s + userSpend(u).spent, 0);
    const payingCustomers = list.filter(u => (u.payments || []).length > 0).length;
    return { grossRevenue, netProfit: netAfterFees(grossRevenue), payingCustomers };
  }, [users]);

  // Every distinct, valid recipient email across all logged-in users.
  const allEmails = useMemo(
    () => [...new Set((users || []).map(u => u.email.trim().toLowerCase()).filter(e => e.includes("@")))],
    [users]
  );

  const copyEmails = async () => {
    if (allEmails.length === 0) return toast.error("No recipient emails yet");
    try {
      await navigator.clipboard.writeText(allEmails.join(", "));
      toast.success(`Copied ${allEmails.length} email${allEmails.length === 1 ? "" : "s"} to clipboard`);
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  };

  const sendEmail = async () => {
    if (allEmails.length === 0) return toast.error("No recipient emails yet");
    if (!subject.trim() || !bodyText.trim()) return toast.error("Subject and message are required");
    if (!(await confirmDialog({
      title: `Send this email to ${allEmails.length} user${allEmails.length === 1 ? "" : "s"}?`,
      description: "Each person gets their own private copy. This can't be un-sent.",
      confirmLabel: "Send now",
    }))) return;

    setSending(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(await adminAuthBody()),
          to: allEmails,
          subject: subject.trim(),
          heading: heading.trim() || undefined,
          body: bodyText.trim(),
          ctaLabel: ctaLabel.trim() || undefined,
          ctaUrl: ctaUrl.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || `Send failed (${res.status})`);
        return;
      }
      const failedNote = data.failed?.length ? ` · ${data.failed.length} failed` : "";
      toast.success(`Sent to ${data.sent} user${data.sent === 1 ? "" : "s"}${failedNote}`);
    } catch (e: any) {
      toast.error(e?.message || "Send failed — check your connection");
    } finally {
      setSending(false);
    }
  };

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

      {/* Studio money summary across every customer */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Paying customers", value: studioTotals.payingCustomers.toLocaleString("en-IN"), color: "text-white" },
          { label: "Gross revenue", value: `₹${studioTotals.grossRevenue.toLocaleString("en-IN")}`, color: "text-[#25D366]" },
          { label: "Net profit (after ~2% fee)", value: `₹${studioTotals.netProfit.toLocaleString("en-IN")}`, color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="bg-zinc-950/50 border border-white/5 rounded-2xl p-4">
            <div className={`text-xl sm:text-2xl font-extrabold font-mono tracking-tight mb-1 truncate ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-zinc-500 font-light">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Announcement / apology email to all logged-in users */}
      <Card>
        <CardHeader
          title="Email all users"
          subtitle={`Announce something (e.g. the checkout fix) to everyone who's logged in — ${allEmails.length} recipient${allEmails.length === 1 ? "" : "s"}.`}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={<Copy size={12} />} onClick={copyEmails}>Copy emails</Button>
              <Button size="sm" variant={emailOpen ? "secondary" : "primary"} icon={<Mail size={12} />} onClick={() => setEmailOpen(o => !o)}>
                {emailOpen ? "Hide" : "Compose email"}
              </Button>
            </div>
          }
        />

        {emailOpen && (
          <div className="space-y-3">
            <Field label="Subject">
              <Input value={subject} onChange={e => setSubject(e.target.value)} />
            </Field>
            <Field label="Heading (big text at the top, optional)">
              <Input value={heading} onChange={e => setHeading(e.target.value)} />
            </Field>
            <Field label="Message" hint="Blank line = new paragraph.">
              <Textarea value={bodyText} onChange={e => setBodyText(e.target.value)} rows={9} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Button label (optional)">
                <Input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="Try your purchase again" />
              </Field>
              <Field label="Button link (optional)">
                <Input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://www.youreditorfriend.in/products" />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button variant="primary" icon={<Send size={13} />} onClick={sendEmail} disabled={sending}>
                {sending ? "Sending…" : `Send to ${allEmails.length} user${allEmails.length === 1 ? "" : "s"}`}
              </Button>
              <Button variant="secondary" icon={<Copy size={13} />} onClick={copyEmails}>Copy all emails instead</Button>
              <span className="text-zinc-600 text-[11px]">Each person gets their own private copy — they can't see each other.</span>
            </div>
          </div>
        )}
      </Card>

      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name or email…"
            className="pl-9"
          />
        </div>
        <div className="flex bg-zinc-950 border border-white/10 rounded-xl p-1 shrink-0">
          {([
            { id: "recent", label: "Recent" },
            { id: "spent", label: "Top spender" },
            { id: "profit", label: "Top profit" },
          ] as const).map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                sortBy === opt.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader
          title={`Users (${filteredUsers.length} of ${users?.length ?? 0})`}
          action={<Button size="sm" variant="secondary" icon={<RefreshCw size={12} />} onClick={load}>Refresh</Button>}
        />
        {users === null && <PanelLoading />}
        {users !== null && filteredUsers.length === 0 && <EmptyState icon={<UserCircle2 size={28} />} title="No matching users found" />}
        <div className="space-y-3">
          {filteredUsers.map(u => {
            const s = userSpend(u);
            return (
            <div key={u.uid} className="bg-zinc-950/50 border border-white/5 rounded-2xl p-3.5">
              <div className="flex items-center gap-3">
                {u.photo
                  ? <img src={u.photo} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full border-2 border-[#FF7A1A]/40 shrink-0" />
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

              {/* Per-customer spend / profit */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2.5 pt-2.5 border-t border-white/[0.04] text-[11px]">
                <span className="text-zinc-500">Spent <b className="text-zinc-200 font-mono">₹{s.spent.toLocaleString("en-IN")}</b></span>
                <span className="text-zinc-500">Net profit <b className="text-[#25D366] font-mono">₹{s.netProfit.toLocaleString("en-IN")}</b></span>
                <span className="text-zinc-500"><b className="text-zinc-300 font-mono">{s.paidCount}</b> paid · <b className="text-zinc-300 font-mono">{u.purchases.length}</b> owned</span>
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
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ═══ BUNDLE BUILDER ════════════════════════════════════════════════════════════
// Pick products → name it → set a price (quick "% off" buttons) → live preview.
// Bundle ids never change after creation: purchases are stored by id.
const BUNDLE_FAN: [number, number, number][] = [[-30, -4, -10], [30, -4, 10], [-10, 3, -3], [10, 6, 3]];

function BundlePreview({ name, items, price }: { name: string; items: Product[]; price: number }) {
  const value = items.reduce((s, p) => s + (p.price || 0), 0);
  const save = value > price ? Math.round(((value - price) / value) * 100) : 0;
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 border-t-[3px] border-t-[#FF7A1A] bg-[#131313]">
      <div className="relative h-48 bg-[#0e0e0e] grid place-items-center overflow-hidden">
        {items.length === 0 && <span className="text-zinc-600 text-xs">Pick products to see the preview</span>}
        {items.slice(0, 4).map((p, i) => {
          const [x, y, r] = BUNDLE_FAN[i];
          return (
            <div key={p.id} className="absolute w-[38%] rounded-lg overflow-hidden border border-[#333] shadow-xl transition-all duration-500"
              style={{ transform: `translate(${x}%, ${y}%) rotate(${r}deg)`, zIndex: i === 3 ? 2 : 1 }}>
              <img src={p.image} alt="" className="block w-full aspect-[4/5] object-cover" />
            </div>
          );
        })}
        {items.length > 0 && <span className="absolute top-3 left-3 bg-[#FF7A1A] text-black text-[11px] font-extrabold px-2.5 py-1 rounded-full">{items.length} in 1</span>}
      </div>
      <div className="p-4">
        <div className="font-extrabold text-lg leading-tight truncate">{name || "Untitled bundle"}</div>
        <div className="flex items-end justify-between mt-3">
          <div>
            {value > price && <div className="text-[11px] text-zinc-500">Separately <s>₹{value.toLocaleString("en-IN")}</s></div>}
            <div className="text-2xl font-extrabold">₹{(price || 0).toLocaleString("en-IN")}</div>
          </div>
          {save > 0 && <span className="text-[11px] font-extrabold text-black bg-[#FF7A1A] px-2 py-1 rounded-md">SAVE {save}%</span>}
        </div>
        <div className="mt-3 h-10 rounded-lg bg-[#FF7A1A] text-black font-bold text-sm grid place-items-center">Get all {items.length} — ₹{(price || 0).toLocaleString("en-IN")}</div>
      </div>
    </div>
  );
}

export function AdminBundlesPanel() {
  const { data, setData, save } = useAdminStore();
  const confirmDialog = useConfirm();
  const [selId, setSelId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  if (!data) return <PanelLoading />;

  const bundles = data.bundles || [];
  const products = (data.products || []).filter(p => !p.free);
  const setBundles = (bs: Bundle[]) => setData({ ...data, bundles: bs });
  const sel = bundles.find(b => b.id === selId) || bundles[0] || null;
  const up = (ch: Partial<Bundle>) => sel && setBundles(bundles.map(b => (b.id === sel.id ? { ...b, ...ch } : b)));

  const create = () => {
    const nb: Bundle = { id: `bundle-${Date.now().toString(36)}`, name: "New bundle", productIds: [], price: 0, enabled: false };
    setBundles([nb, ...bundles]);
    setSelId(nb.id);
  };

  const items = sel ? sel.productIds.map(id => data.products.find(p => p.id === id)).filter((p): p is Product => !!p) : [];
  const value = items.reduce((s, p) => s + (p.price || 0), 0);
  const toggle = (id: string) => {
    if (!sel) return;
    const has = sel.productIds.includes(id);
    up({ productIds: has ? sel.productIds.filter(x => x !== id) : [...sel.productIds, id] });
  };
  const visible = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <div>
        <PageTitle accent="Builder">Bundle</PageTitle>
        <p className="text-zinc-500 text-xs max-w-xl leading-relaxed">
          Pick products, name it, set a price. Buyers get every product in the bundle in My Library. Turn on "Live" and save to show it on the site.
        </p>
      </div>
      <SaveBar onSave={save} />

      {/* Bundle list */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        <button onClick={create}
          className="shrink-0 w-40 h-24 rounded-2xl border-2 border-dashed border-white/15 text-zinc-400 hover:text-white hover:border-[#FF7A1A] flex flex-col items-center justify-center gap-1 text-sm font-semibold transition">
          <Plus size={18} /> New bundle
        </button>
        {bundles.map(b => {
          const thumbs = b.productIds.slice(0, 3).map(id => data.products.find(p => p.id === id)?.image).filter(Boolean) as string[];
          const active = sel?.id === b.id;
          return (
            <button key={b.id} onClick={() => setSelId(b.id)}
              className={`shrink-0 w-56 h-24 rounded-2xl border p-3 text-left flex gap-3 items-center transition ${active ? "border-[#FF7A1A] bg-[#FF7A1A]/[0.06]" : "border-white/10 bg-zinc-950/50 hover:border-white/25"}`}>
              <div className="relative w-14 h-16 shrink-0">
                {thumbs.length === 0 && <div className="w-full h-full rounded-lg bg-white/5 grid place-items-center"><Package size={18} className="text-zinc-600" /></div>}
                {thumbs.map((t, i) => (
                  <img key={i} src={t} alt="" className="absolute w-10 h-12 object-cover rounded-md border border-black" style={{ left: i * 7, top: i * 3, transform: `rotate(${(i - 1) * 6}deg)` }} />
                ))}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{b.name || "Untitled"}</div>
                <div className="text-xs text-zinc-500">{b.productIds.length} items · ₹{(b.price || 0).toLocaleString("en-IN")}</div>
                <div className={`text-[10px] font-bold mt-1 ${b.enabled ? "text-[#25D366]" : "text-zinc-500"}`}>{b.enabled ? "● LIVE" : "○ DRAFT"}</div>
              </div>
            </button>
          );
        })}
      </div>

      {!sel ? (
        <Card><EmptyState icon={<Package size={28} />} title="No bundles yet" description="Click New bundle to combine products into one deal." /></Card>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
          <div className="space-y-5">
            {/* Step 1 */}
            <Card>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-sm font-bold"><span className="text-[#FF7A1A]">1.</span> Pick products <span className="text-zinc-500 font-normal">({sel.productIds.length} selected)</span></div>
                <div className="relative w-44">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="pl-7" />
                </div>
              </div>
              {products.length === 0 && <p className="text-zinc-500 text-xs">Add some paid products first.</p>}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                {visible.map(p => {
                  const idx = sel.productIds.indexOf(p.id);
                  const on = idx >= 0;
                  return (
                    <button key={p.id} onClick={() => toggle(p.id)}
                      className={`relative text-left rounded-xl overflow-hidden border-2 transition ${on ? "border-[#FF7A1A] scale-[0.97]" : "border-transparent hover:border-white/20"}`}>
                      <img src={p.image} alt="" className={`block w-full aspect-square object-cover transition ${on ? "" : "opacity-70"}`} />
                      {on && <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#FF7A1A] text-black text-xs font-extrabold grid place-items-center">{idx + 1}</span>}
                      <div className="px-2 py-1.5 bg-zinc-950">
                        <div className="text-[11px] font-semibold truncate">{p.name}</div>
                        <div className="text-[10px] text-zinc-500">₹{p.price.toLocaleString("en-IN")}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Step 2 */}
            <Card>
              <div className="text-sm font-bold mb-3"><span className="text-[#FF7A1A]">2.</span> Name &amp; price</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Bundle name"><Input value={sel.name} onChange={e => up({ name: e.target.value })} placeholder="Tamil Title Card Pack" /></Field>
                <Field label="Short line (optional)"><Input value={sel.tagline || ""} onChange={e => up({ tagline: e.target.value })} placeholder="4 movie title cards, one download" /></Field>
              </div>
              <div className="mt-4 rounded-xl bg-zinc-950/60 border border-white/5 p-3.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mb-3">
                  Separately <b className="text-white">₹{value.toLocaleString("en-IN")}</b> · quick price:
                  {[30, 40, 50, 60].map(pct => (
                    <button key={pct} disabled={!value} onClick={() => up({ price: Math.round((value * (100 - pct)) / 100 / 10) * 10 - 1 })}
                      className="px-2.5 py-1 rounded-full border border-[#FF7A1A]/50 text-[#FF7A1A] font-bold hover:bg-[#FF7A1A] hover:text-black disabled:opacity-30 transition">
                      {pct}% off
                    </button>
                  ))}
                </div>
                <Field label="Bundle price (₹)">
                  <Input type="number" min={1} value={sel.price || ""} onChange={e => up({ price: Math.max(0, Number(e.target.value)) })} placeholder="449" />
                </Field>
                {sel.price > 0 && value > 0 && sel.price >= value && (
                  <p className="text-amber-400 text-[11px] mt-2">Price is not lower than buying separately — buyers won't see a saving.</p>
                )}
              </div>
            </Card>

            {/* Step 3 */}
            <Card>
              <div className="text-sm font-bold mb-3"><span className="text-[#FF7A1A]">3.</span> Go live</div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <label className="flex items-center gap-2 text-zinc-400 text-xs font-bold">LIVE ON SITE <Toggle value={sel.enabled} onChange={v => up({ enabled: v })} /></label>
                <label className="flex items-center gap-2 text-zinc-400 text-xs font-bold">SHOW FIRST ON HOME <Toggle value={!!sel.featured} onChange={v => up({ featured: v })} /></label>
                <div className="flex-1" />
                <Button size="sm" variant="danger" icon={<Trash2 size={12} />}
                  onClick={async () => {
                    if (await confirmDialog({ title: `Delete "${sel.name}"?`, description: "People who already bought it keep their products.", danger: true, confirmLabel: "Delete" })) {
                      setBundles(bundles.filter(b => b.id !== sel.id));
                      setSelId(null);
                    }
                  }}>Delete</Button>
              </div>
              {sel.enabled && (sel.productIds.length < 2 || !sel.price) && (
                <p className="text-amber-400 text-[11px] mt-3">Add at least 2 products and a price before going live.</p>
              )}
            </Card>
          </div>

          {/* Live preview */}
          <div className="lg:sticky lg:top-4 space-y-2">
            <div className="text-[11px] font-bold tracking-widest text-zinc-500">LIVE PREVIEW</div>
            <BundlePreview name={sel.name} items={items} price={sel.price} />
            <p className="text-zinc-600 text-[11px]">Remember to click Save Store Changes.</p>
          </div>
        </div>
      )}
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
    { id: "titlecard-edit", label: "🎬 Title card edit (booking)" },
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
                <Field label="Last day (optional)">
                  <Input
                    type="date"
                    value={c.expiresAt ? new Date(new Date(c.expiresAt).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10) : ""}
                    onChange={e => upCoupon(i, { expiresAt: e.target.value ? new Date(`${e.target.value}T23:59:59+05:30`).toISOString() : undefined })}
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
