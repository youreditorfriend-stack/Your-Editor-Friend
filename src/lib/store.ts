import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { PROJECT_FILE } from "../config/titlecardPricing";

const TITLECARD_FILE_PRICE = PROJECT_FILE.price;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductCategory {
  id: string;
  label: string;
  enabled: boolean;
}

// Detail-page fields that both Product and Course share.
export interface DetailContent {
  previewVideo?: string;                    // YouTube / Instagram / mp4
  description?: string;                     // markdown, rendered on the detail page
  gallery?: string[];                       // extra screenshots (R2 URLs)
  faq?: { q: string; a: string }[];
  terms?: string;                           // short text shown above the buy button
}

export interface Product extends DetailContent {
  id: string;
  name: string;
  tagline: string;
  price: number; // 0 = free — the "discount price" once originalPrice is set
  originalPrice?: number; // shown struck-through; discount % is derived from this + price
  image: string; // square thumbnail
  category: string; // legacy single ProductCategory id — kept for back-compat, mirrors categories[0]
  categories?: string[]; // ProductCategory ids this product belongs to (multi-category)
  free: boolean;
  downloadUrl: string; // delivered after purchase / claim
  // Bonus free assets on a paid product: extra button on the detail page +
  // library card. Absent/false = hidden (default off), so existing products
  // are unaffected.
  freeAssetsEnabled?: boolean;
  freeAssetsUrl?: string; // Cloudflare R2 link (or pasted URL)
  badge?: string; // legacy free-text badge, still supported alongside the flags below
  bestSeller?: boolean;
  isNew?: boolean;
  trending?: boolean;
  rating?: number; // 0-5, halves allowed (e.g. 4.5) — renders as a star rating
  reviewCount?: number;
  pinned?: boolean; // pinned products always sort first in the catalog
  featured?: boolean;
  enabled: boolean;
  // Set by the admin prompt-kit editor: this product page shows the
  // PSD-files → layers → prompt viewer (data in promptKits* collections).
  promptKit?: { files: number; layers: number } | null;
  // "How to edit this template" YouTube link — free to watch for everyone.
  tutorialUrl?: string;
  // Set by the admin AI-asset editor: the product page shows the
  // name → ready-to-copy prompts generator (data in promptKits* docs, field assetGen).
  assetGen?: { cards: number } | null;
}

// ─── Prompt kits (one product = one video, made from several PSD files) ──────
export interface PromptLayerPublic {
  id: string;
  name: string;
  image: string;   // the layer rendered on the full PSD canvas (transparent)
  refs: string[];  // reference images to give the AI
  blend?: string;  // CSS mix-blend-mode from the PSD (screen, multiply…)
}
export interface PromptFilePublic {
  id: string;
  name: string;      // "Cold open"
  fileName: string;  // "01_cold-open.psd"
  cover: string;     // flattened preview of the whole PSD
  width: number;
  height: number;
  layers: PromptLayerPublic[]; // bottom → top
}
export interface PromptKitPublic { files: PromptFilePublic[] }
// layerId → prompt text + params. Readable only by buyers (or all, if free).
export interface PromptKitPrivate { free: boolean; prompts: Record<string, { prompt: string; params?: string }> }

export interface Course extends DetailContent {
  id: string;
  title: string;
  tagline: string;
  thumbnail: string; // 16:9 YouTube-style thumbnail
  price: number;
  originalPrice?: number;
  features: string[];
  free: boolean;
  accessUrl: string; // course link delivered after purchase
  badge?: string;
  enabled: boolean;
  // enabled + live=false → listed as "Coming Soon": visible in the catalogue
  // but not purchasable and excluded from recommendations. Absent = live,
  // so courses saved before this flag existed keep working unchanged.
  live?: boolean;
}

export const isCourseLive = (c: Pick<Course, "live">) => c.live !== false;

// Free assets are a paid-product perk only — a free product's main download
// already covers it.
export const hasFreeAssets = (p: Pick<Product, "freeAssetsEnabled" | "freeAssetsUrl" | "free">) =>
  !!p.freeAssetsEnabled && !!p.freeAssetsUrl && !p.free;

// Grabbing the free-assets bonus doesn't mean the buyer owns the paid
// product itself, so it's tracked as its own id in `purchases` rather than
// the product's own id (which would incorrectly flip Buy buttons to
// "Owned"). This is what lets it reappear in My Library on its own.
export const getFreeAssetsClaimId = (productId: string) => `${productId}::free-assets`;
export const hasClaimedFreeAssets = (purchases: string[] | undefined, productId: string) =>
  !!purchases?.includes(getFreeAssetsClaimId(productId));

// Discount code, applied at checkout. Server re-validates and computes the
// amount, so a tampered client can't buy at a lower price.
export interface Coupon {
  code: string;         // stored uppercase
  percentOff: number;   // 1-100
  enabled: boolean;
  appliesTo?: string[]; // item ids; empty/absent = everything
  expiresAt?: string;   // ISO date
  maxUses?: number;
  uses?: number;
}

// A page/section of the site that can be switched on or off from the Admin panel.
// Disabled pages vanish from the nav, from the home page, and their URL
// redirects home — so nothing leaks while you're still preparing content.
export interface PageConfig {
  id: string;
  label: string;
  path: string;
  enabled: boolean;
}

// The "Checkout issues? GPay …" fallback note shown under the buy button
// after an actual checkout failure. Editable from Admin → Pages so the
// wording/phone number can change without a code release. `{price}` and
// `{phone}` are substituted at render time.
export interface CheckoutHelp {
  message: string;
  phone: string;
}

export const DEFAULT_CHECKOUT_HELP: CheckoutHelp = {
  message:
    "Checkout issues? GPay ₹{price} to {phone} & send screenshot on WhatsApp for instant access!",
  phone: "+91 63743 43169",
};

// A bundle sells several products together at one price. Buying it grants the
// bundle id AND every product id in it (done server-side in verify-payment),
// so each product shows up in My Library on its own.
export interface Bundle {
  id: string;
  name: string;
  tagline?: string;
  productIds: string[];
  price: number;
  enabled: boolean;
  featured?: boolean; // shown in the big bundle block on the home page
}

export interface StoreData {
  products: Product[];
  courses: Course[];
  productCategories: ProductCategory[];
  pages: PageConfig[];
  coupons: Coupon[];
  bundles?: Bundle[];
  checkoutHelp?: CheckoutHelp;
  layout?: SiteLayout;
}

// Section-level show/hide + which products sit in the home hero fan.
// Missing keys mean "shown", so older data keeps working.
export interface SiteLayout {
  home?: Partial<Record<"fan" | "pills" | "shop" | "bundles" | "courses" | "reviews" | "creator", boolean>>;
  products?: Partial<Record<"bundles" | "help", boolean>>;
  fanIds?: string[];
}
export const sectionOn = (layout: SiteLayout | undefined, page: "home" | "products", key: string) =>
  (layout?.[page] as Record<string, boolean> | undefined)?.[key] !== false;

// Products inside a bundle (skips ids that were deleted from the catalog).
export function bundleProducts(store: Pick<StoreData, "products"> | null | undefined, b: Bundle): Product[] {
  if (!store) return [];
  return b.productIds
    .map(id => store.products.find(p => p.id === id))
    .filter((p): p is Product => !!p);
}

// Sum of the individual selling prices — the "you'd pay this separately" anchor.
export const bundleValue = (items: Product[]) => items.reduce((s, p) => s + (p.price || 0), 0);

export const DEFAULT_PAGES: PageConfig[] = [
  { id: "products", label: "Products", path: "/products", enabled: true },
  { id: "courses", label: "Courses", path: "/courses", enabled: true },
  { id: "services", label: "Services", path: "/services", enabled: true },
  { id: "portfolio", label: "Portfolio", path: "/portfolio", enabled: true },
  { id: "about", label: "About", path: "/about", enabled: true },
  { id: "contact", label: "Contact", path: "/contact", enabled: true },
  { id: "youtube", label: "YouTube banner (home)", path: "", enabled: true },
];

// ─── Seed data (shown until admin saves real data to Firestore) ───────────────

export const SEED_STORE: StoreData = {
  pages: DEFAULT_PAGES,
  coupons: [],
  productCategories: [
    { id: "transitions", label: "Transitions", enabled: true },
    { id: "templates", label: "Templates", enabled: true },
    { id: "presets", label: "Presets", enabled: true },
  ],
  products: [
    {
      id: "transitions-pack",
      name: "Premiere Pro Transitions Pack",
      tagline: "50+ cinematic transitions used in my own videos",
      price: 499,
      originalPrice: 999,
      image: "https://i.ytimg.com/vi/3tEHyBX0zRU/hqdefault.jpg",
      category: "transitions",
      free: false,
      downloadUrl: "",
      badge: "Best Seller",
      featured: true,
      enabled: true,
    },
    {
      id: "capcut-templates",
      name: "CapCut Template Bundle",
      tagline: "Viral reel templates — edit on your phone in minutes",
      price: 299,
      image: "https://i.ytimg.com/vi/947uAF82nMQ/hqdefault.jpg",
      category: "templates",
      free: false,
      downloadUrl: "",
      featured: true,
      enabled: true,
    },
    {
      id: "free-luts",
      name: "Free Cinematic LUTs",
      tagline: "5 free LUTs to get that film look instantly",
      price: 0,
      image: "https://i.ytimg.com/vi/B7JXqAMablI/hqdefault.jpg",
      category: "presets",
      free: true,
      downloadUrl: "",
      badge: "Free",
      featured: true,
      enabled: true,
    },
    {
      id: "color-presets",
      name: "Cinematic Color Presets",
      tagline: "One-click color grades for that film look",
      price: 399,
      image: "https://i.ytimg.com/vi/6EwyG118OB8/hqdefault.jpg",
      category: "presets",
      free: false,
      downloadUrl: "",
      enabled: true,
    },
  ],
  courses: [
    {
      id: "tamil-editing-course",
      title: "Tamil Video Editing Course",
      tagline: "Zero to pro editing — full course in Tamil",
      thumbnail: "https://i.ytimg.com/vi/Aoq1fnD_qro/hqdefault.jpg",
      price: 1999,
      originalPrice: 2999,
      features: [
        "20+ hours of Tamil video lessons",
        "Premiere Pro + After Effects from basics",
        "Real client project breakdowns",
        "Project files & assets included",
        "Certificate of completion",
        "Lifetime access + free updates",
      ],
      free: false,
      accessUrl: "",
      badge: "New",
      enabled: true,
    },
    {
      id: "reels-crash-course",
      title: "Viral Reels Crash Course",
      tagline: "Edit scroll-stopping reels in CapCut — free starter course",
      thumbnail: "https://i.ytimg.com/vi/xCH997TcWB4/hqdefault.jpg",
      price: 0,
      features: [
        "6 quick lessons (mobile editing)",
        "CapCut viral template workflow",
        "Hook + retention editing basics",
        "Free template pack included",
      ],
      free: true,
      accessUrl: "",
      badge: "Free",
      enabled: true,
    },
  ],
};

// ─── Fetch hook ───────────────────────────────────────────────────────────────

// Keeps saved on/off choices while picking up any pages added in a later release
export function mergePages(saved?: PageConfig[]): PageConfig[] {
  if (!saved?.length) return DEFAULT_PAGES;
  return DEFAULT_PAGES.map(def => {
    const s = saved.find(p => p.id === def.id);
    return s ? { ...def, enabled: s.enabled !== false } : def;
  });
}

let cache: StoreData | null = null;

export function useStore() {
  const [data, setData] = useState<StoreData | null>(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    (async () => {
      try {
        const [snap, tcSnap] = await Promise.all([
          getDoc(doc(db, "store", "data")),
          getDoc(doc(db, "store", "titlecard")).catch(() => null),
        ]);
        const tcFileId: string = tcSnap?.exists() ? (tcSnap.data()?.fileProductId || "") : "";
        if (snap.exists()) {
          const d = snap.data();
          cache = {
            products: d.products?.length ? d.products : SEED_STORE.products,
            courses: d.courses?.length ? d.courses : SEED_STORE.courses,
            productCategories: d.productCategories?.length
              ? d.productCategories
              : SEED_STORE.productCategories,
            pages: mergePages(d.pages),
            coupons: Array.isArray(d.coupons) ? d.coupons : [],
            bundles: Array.isArray(d.bundles) ? d.bundles : [],
            layout: d.layout || {},
            checkoutHelp: d.checkoutHelp?.message
              ? { ...DEFAULT_CHECKOUT_HELP, ...d.checkoutHelp }
              : DEFAULT_CHECKOUT_HELP,
          };
        } else {
          cache = SEED_STORE;
        }
        // Keep "free" consistent with price (price 0 always means free)
        cache = {
          ...cache,
          // The title card project file's price lives in src/config/titlecardPricing.ts
          // (the server charges the same amount in /api/create-order).
          products: cache.products
            .map(p => p.id === tcFileId ? { ...p, price: TITLECARD_FILE_PRICE } : p)
            .map(p => ({ ...p, free: p.price === 0 })),
          courses: cache.courses.map(c => ({ ...c, free: c.price === 0 })),
        };
      } catch (e) {
        console.error("Failed to fetch store data:", e);
        cache = SEED_STORE;
      }
      setData(cache);
      setLoading(false);
    })();
  }, []);

  return { store: data, loading };
}

export const formatPrice = (n: number) =>
  n === 0 ? "FREE" : `₹${n.toLocaleString("en-IN")}`;

// Payment-gateway cut deducted from gross sales to estimate real take-home.
// Razorpay is ~2% + GST (≈2.36%); we use a flat 2% per the studio's choice —
// digital products have ~zero marginal cost, so net-of-fees ≈ profit.
// Single source of truth: tweak this one number to change every profit figure.
export const RAZORPAY_FEE_RATE = 0.02;

// Net take-home (profit) from a gross rupee amount, after the gateway fee.
export const netAfterFees = (gross: number) =>
  Math.round(gross * (1 - RAZORPAY_FEE_RATE));

// Every category id a product belongs to — falls back to its legacy single
// `category` field when `categories` hasn't been set yet, so old data and
// filters written before multi-category support keep working unchanged.
export function getProductCategories(p: Pick<Product, "category" | "categories">): string[] {
  if (p.categories && p.categories.length > 0) return p.categories;
  return p.category ? [p.category] : [];
}

// Discount % derived from originalPrice → price (the "strike-through" chain:
// Original Price → Strike Through → Discount Price → Discount %). Returns
// undefined when there's nothing to discount from.
export function getDiscountPercent(price: number, originalPrice?: number): number | undefined {
  if (!originalPrice || originalPrice <= price) return undefined;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

// Pinned items always sort first; everything else keeps its existing
// (admin drag-and-drop controlled) relative order.
export function sortByPinned<T extends { pinned?: boolean }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => Number(!!b.item.pinned) - Number(!!a.item.pinned) || a.index - b.index)
    .map(({ item }) => item);
}

// Post-purchase cross-sell picks, in priority order — free downloads first
// (the easiest possible next "yes"), then cheap products, then courses, then
// the best-selling product — filling up to `limit` slots so the popup never
// needs to scroll. Any empty tier is skipped gracefully.
export type RecommendationReason = "free" | "low-cost" | "course" | "best-seller";

export interface Recommendation {
  kind: "product" | "course";
  reason: RecommendationReason;
  item: Product | Course;
}

export function getPostPurchaseRecommendations(
  store: StoreData | null | undefined,
  excludeItemId: string,
  ownedIds: string[],
  limit = 4
): Recommendation[] {
  if (!store) return [];
  const owned = new Set(ownedIds);
  const eligibleProducts = (store.products || []).filter(p => p.enabled && p.id !== excludeItemId && !owned.has(p.id));
  const eligibleCourses = (store.courses || []).filter(
    c => c.enabled && isCourseLive(c) && c.id !== excludeItemId && !owned.has(c.id)
  );

  const picks: Recommendation[] = [];
  const seen = new Set<string>();
  const add = (list: (Product | Course)[], kind: "product" | "course", reason: RecommendationReason) => {
    for (const item of list) {
      if (picks.length >= limit) return;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      picks.push({ item, kind, reason });
    }
  };

  add(eligibleProducts.filter(p => p.free), "product", "free");
  add([...eligibleProducts].filter(p => !p.free).sort((a, b) => a.price - b.price), "product", "low-cost");
  add(eligibleCourses, "course", "course");
  add(eligibleProducts.filter(p => p.bestSeller), "product", "best-seller");

  return picks;
}

// ─── First-time-buyer discount window ─────────────────────────────────────────
// For 5 minutes after a user's FIRST paid purchase, any additional purchase
// gets an automatic 25% discount. The window start (`firstPurchaseAt` on the
// user doc) is written only by api/verify-payment via the Admin SDK — Firestore
// rules stop users from setting it themselves — and api/create-order re-checks
// it server-side, so the client-side mirror here is display-only.
export const FIRST_BUYER_DISCOUNT_PERCENT = 25;
export const FIRST_BUYER_WINDOW_MS = 5 * 60 * 1000;

// Milliseconds left in the discount window; 0 when absent or expired.
export function firstBuyerWindowRemainingMs(
  firstPurchaseAt: string | null | undefined,
  nowMs: number = Date.now()
): number {
  if (!firstPurchaseAt) return 0;
  const start = new Date(firstPurchaseAt).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, start + FIRST_BUYER_WINDOW_MS - nowMs);
}

// Coupon validation used by both the purchase card (instant feedback) and the
// server (source of truth for the amount charged). They must stay in lockstep,
// so keep this function pure and let the caller pass the current time.
export interface CouponResult {
  ok: boolean;
  price: number;    // final price after discount (never below 0)
  discount: number; // amount taken off
  coupon?: Coupon;
  error?: string;   // set when ok=false; safe to show to the user
}

export function applyCoupon(
  price: number,
  code: string,
  coupons: Coupon[],
  itemId: string,
  now: Date = new Date()
): CouponResult {
  const trimmed = (code || "").trim().toUpperCase();
  if (!trimmed) return { ok: false, price, discount: 0, error: "Enter a coupon code" };

  const c = coupons.find(x => (x.code || "").toUpperCase() === trimmed);
  if (!c) return { ok: false, price, discount: 0, error: "That coupon doesn't exist" };
  if (!c.enabled) return { ok: false, price, discount: 0, error: "This coupon is not active" };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now.getTime()) {
    return { ok: false, price, discount: 0, error: "This coupon has expired" };
  }
  if (c.maxUses != null && (c.uses ?? 0) >= c.maxUses) {
    return { ok: false, price, discount: 0, error: "This coupon has already been fully used" };
  }
  if (c.appliesTo && c.appliesTo.length > 0 && !c.appliesTo.includes(itemId)) {
    return { ok: false, price, discount: 0, error: "This coupon doesn't apply to this item" };
  }
  if (!(c.percentOff > 0 && c.percentOff <= 100)) {
    return { ok: false, price, discount: 0, error: "This coupon is misconfigured" };
  }

  const discount = Math.round(price * (c.percentOff / 100));
  return { ok: true, price: Math.max(0, price - discount), discount, coupon: c };
}

// Is a page/section switched on in the Admin panel?
// Defaults to true while the store is still loading, so nothing flickers.
export function usePageEnabled() {
  const { store } = useStore();
  return (id: string) => store?.pages?.find(p => p.id === id)?.enabled !== false;
}
