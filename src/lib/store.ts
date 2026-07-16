import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductCategory {
  id: string;
  label: string;
  enabled: boolean;
}

export interface Product {
  id: string;
  name: string;
  tagline: string;
  price: number; // 0 = free
  originalPrice?: number;
  image: string; // square thumbnail
  category: string; // ProductCategory id
  free: boolean;
  downloadUrl: string; // delivered after purchase / claim
  badge?: string;
  featured?: boolean;
  enabled: boolean;
}

export interface Course {
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

export interface StoreData {
  products: Product[];
  courses: Course[];
  productCategories: ProductCategory[];
  pages: PageConfig[];
}

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
        const snap = await getDoc(doc(db, "store", "data"));
        if (snap.exists()) {
          const d = snap.data();
          cache = {
            products: d.products?.length ? d.products : SEED_STORE.products,
            courses: d.courses?.length ? d.courses : SEED_STORE.courses,
            productCategories: d.productCategories?.length
              ? d.productCategories
              : SEED_STORE.productCategories,
            pages: mergePages(d.pages),
          };
        } else {
          cache = SEED_STORE;
        }
        // Keep "free" consistent with price (price 0 always means free)
        cache = {
          ...cache,
          products: cache.products.map(p => ({ ...p, free: p.price === 0 })),
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

// Is a page/section switched on in the Admin panel?
// Defaults to true while the store is still loading, so nothing flickers.
export function usePageEnabled() {
  const { store } = useStore();
  return (id: string) => store?.pages?.find(p => p.id === id)?.enabled !== false;
}
