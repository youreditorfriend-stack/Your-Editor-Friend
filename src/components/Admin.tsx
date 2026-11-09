import { useEffect, useState, type ReactNode } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { SEED_STORE, StoreData, Product, Course, ProductCategory, PageConfig, Coupon, getProductCategories, getDiscountPercent, netAfterFees } from "../lib/store";
import { loadAllAnalytics, AnalyticsData } from "../lib/analytics";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImageField } from "./ImageField";
import { FileField } from "./FileField";
import { StudioAnalytics } from "./StudioAnalytics";
import { StudioComments } from "./StudioComments";
import { AdminPagesPanel, AdminProductsPanel, AdminCoursesPanel, AdminUsersPanel, AdminCouponsPanel, AdminBundlesPanel } from "./AdminStore";
import { PromptKitEditor } from "./PromptKitEditor";
import { AdminPayments, useProblemCount } from "./AdminPayments";
import { AdminSupport } from "./AdminSupport";
import { AdminReviews } from "./AdminReviews";
import { InstallAppButton } from "./InstallApp";
import { ItemEditor } from "./ItemEditor";
import { AdminDashboard } from "./AdminDashboard";
import { AdminCustomers } from "./AdminCustomers";
import { AdminEmail } from "./AdminEmail";
import { AdminSiteMap } from "./AdminSiteMap";
import { AdminStorage } from "./AdminStorage";
import { AdminTitleCard, useTitleCardOrders } from "./AdminTitleCard";
import { CreditCard as CreditCardIcon, LifeBuoy, Star as StarIcon, Mail, HardDrive } from "lucide-react";
import { Layers, Copy as CopyIcon, Search as SearchIcon, ImagePlus, Pencil } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from "recharts";
import {
  Button,
  Card,
  CardHeader,
  Badge,
  Field,
  Input,
  Textarea,
  Toggle,
  EmptyState,
  Spinner,
  useToast,
  useConfirm,
} from "./admin/ui";
import {
  LayoutDashboard,
  FolderEdit,
  BookOpen,
  MessageSquare,
  Users,
  Tag,
  Sliders,
  Save,
  LogOut,
  Plus,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Eye,
  DollarSign,
  ExternalLink,
  Sparkles,
  Settings,
  Menu,
  X,
  GripVertical,
  Pin,
  Star,
  Flame,
  Gift,
  TrendingUp,
  Trophy,
} from "lucide-react";

// Types
type TabType = "titlecard" | "overview" | "products" | "bundles" | "payments" | "support" | "reviews" | "email" | "storage" | "courses" | "projects" | "pages" | "comments" | "users" | "coupons" | "quote" | "settings";

interface ActiveWorkspace {
  id: string;
  type: "product" | "course";
  item: any;
  workspaceTab: "details" | "analytics" | "comments";
}

// Drag-and-drop wrapper for reordering products — only mounted while the
// "All" category filter is active, so a drag always maps onto a well-defined
// position in the full underlying array.
function SortableProductCard({
  id,
  children,
}: {
  id: string;
  children: (drag: { attributes: any; listeners: any; setActivatorNodeRef: (el: HTMLElement | null) => void }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners, setActivatorNodeRef })}
    </div>
  );
}

// Grouped by what you're doing: selling, people, the rest of the site.
const NAV_GROUPS = [
  {
    title: "Sell",
    items: [
      { id: "titlecard", label: "Edit orders 🎬", icon: <Flame size={17} /> },
      { id: "overview", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
      { id: "products", label: "Products", icon: <FolderEdit size={17} /> },
      { id: "bundles", label: "Bundles", icon: <Layers size={17} /> },
      { id: "courses", label: "Courses", icon: <BookOpen size={17} /> },
      { id: "coupons", label: "Coupons", icon: <Tag size={17} /> },
      { id: "payments", label: "Payments & alerts", icon: <CreditCardIcon size={17} /> },
    ],
  },
  {
    title: "People",
    items: [
      { id: "users", label: "Customers", icon: <Users size={17} /> },
      { id: "support", label: "Support helper", icon: <LifeBuoy size={17} /> },
      { id: "email", label: "Send email", icon: <Mail size={17} /> },
      { id: "reviews", label: "Reviews", icon: <StarIcon size={17} /> },
      { id: "comments", label: "Comments", icon: <MessageSquare size={17} /> },
    ],
  },
  {
    title: "Site",
    items: [
      { id: "projects", label: "Portfolio", icon: <ExternalLink size={17} /> },
      { id: "pages", label: "Show / hide", icon: <Eye size={17} /> },
      { id: "storage", label: "Storage & alerts", icon: <HardDrive size={17} /> },
      { id: "quote", label: "Custom quote", icon: <Sliders size={17} /> },
      { id: "settings", label: "Settings", icon: <Settings size={17} /> },
    ],
  },
] as const;

// Phone bottom bar: the four screens used most.
const NAV_MOBILE = ["titlecard", "overview", "products", "payments"] as const;

// Sortable columns for the dashboard Product Leaderboard (all sort descending).
const LEADER_COLS = [
  { key: "impressions", label: "Impressions" },
  { key: "uniqueViewers", label: "Views" },
  { key: "purchases", label: "Purchases" },
  { key: "revenue", label: "Revenue" },
  { key: "netProfit", label: "Net Profit" },
  { key: "conversion", label: "Ratio %" },
] as const;

export default function Admin({ onLogout }: { onLogout?: () => void }) {
  const toast = useToast();
  const confirmDialog = useConfirm();

  // Navigation & Shell States
  const [activeTab, setActiveTab] = useState<TabType>("titlecard");
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Data States (Consolidated Source of Truth)
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  // -- Store Schema States
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [storeCourses, setStoreCourses] = useState<Course[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  // Loaded and written back verbatim so this panel's full-doc save doesn't
  // wipe the checkout-help message edited in the Pages panel (AdminStore.tsx).
  const [checkoutHelp, setCheckoutHelp] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  // Real per-item view/impression counters (analytics/{itemId}), joined on the dashboard.
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, AnalyticsData>>({});
  // Which leaderboard column to sort by (all descending).
  const [leaderSort, setLeaderSort] = useState<"purchases" | "revenue" | "netProfit" | "uniqueViewers" | "impressions" | "conversion">("purchases");

  // -- Portfolio Schema States
  const [projects, setProjects] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [styleCategories, setStyleCategories] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [discountSettings, setDiscountSettings] = useState<any>({
    tier1: { minVideos: 6, maxVideos: 15, discountPercent: 5 },
    tier2: { minVideos: 16, maxVideos: 30, discountPercent: 10 },
  });
  const [adminPassword, setAdminPassword] = useState("");

  // Inline editing state trackers
  const [editMap, setEditMap] = useState<{ [key: string]: string }>({});

  // Products tab: category filter + drag-and-drop reordering
  const [productFilterCat, setProductFilterCat] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [showCatEditor, setShowCatEditor] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");
  const [wsDirty, setWsDirty] = useState(false);
  const [emailPreset, setEmailPreset] = useState<string[]>([]);
  useEffect(() => { setWsDirty(false); }, [activeWorkspace?.id]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const problemCount = useProblemCount();
  const tcOrders = useTitleCardOrders();
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleProductDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = storeProducts.findIndex(p => p.id === active.id);
    const newIndex = storeProducts.findIndex(p => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(storeProducts, oldIndex, newIndex);
    setStoreProducts(next);
    handleSave(next); // new order goes live right away
  };

  // Portfolio (Projects) tab: category filter + drag-and-drop reordering,
  // scoped to a single category at a time (reordering only makes sense
  // within a category, since that's how items are grouped on the public
  // portfolio grid).
  const [portfolioFilterCat, setPortfolioFilterCat] = useState("all");

  const handlePortfolioDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || portfolioFilterCat === "all") return;
    const catItems = projects.filter(p => p.category === portfolioFilterCat);
    const oldIndex = catItems.findIndex(p => p.id === active.id);
    const newIndex = catItems.findIndex(p => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(catItems, oldIndex, newIndex).map((p, i) => ({ ...p, order: i }));
    const reorderedIds = new Set(reordered.map(p => p.id));
    const next = [
      ...projects.filter(p => !reorderedIds.has(p.id)),
      ...reordered,
    ];
    setProjects(next);
    handleSave(undefined, undefined, undefined, next);
  };

  // Updates a product-only field on the currently open workspace item, keeping
  // both the workspace's local copy and the master storeProducts array in sync.
  const updateActiveProduct = (ch: Partial<Product>) => {
    if (!activeWorkspace || activeWorkspace.type !== "product") return;
    setActiveWorkspace(prev => prev ? { ...prev, item: { ...prev.item, ...ch } } : null);
    setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, ...ch } : p));
  };

  // Fetch all databases at once
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [portfolioSnap, storeSnap, usersSnap, analytics] = await Promise.all([
          getDoc(doc(db, "portfolio", "data")),
          getDoc(doc(db, "store", "data")),
          getDocs(collection(db, "users")),
          loadAllAnalytics(),
        ]);
        setAnalyticsMap(analytics);

        if (portfolioSnap.exists()) {
          const d = portfolioSnap.data();
          setCategories(d.portfolio || []);
          setProjects(
            d.portfolio?.flatMap((c: any) =>
              (c.projects || []).map((p: any, i: number) => ({ ...p, order: typeof p.order === "number" ? p.order : i }))
            ) || []
          );
          setStyleCategories(d.styleCategories || []);
          setAddons(d.addons || []);
          setFormFields(d.formFields || []);
          setDiscountSettings(d.discountSettings || {
            tier1: { minVideos: 6, maxVideos: 15, discountPercent: 5 },
            tier2: { minVideos: 16, maxVideos: 30, discountPercent: 10 },
          });
          setAdminPassword(d.adminPassword || "");
        }

        if (storeSnap.exists()) {
          const d = storeSnap.data();
          setStoreProducts(d.products || []);
          setStoreCourses(d.courses || []);
          setProductCategories(d.productCategories || []);
          setPageConfigs(d.pages || []);
          setCoupons(d.coupons || []);
          setCheckoutHelp(d.checkoutHelp || null);
        } else {
          setStoreProducts(SEED_STORE.products);
          setStoreCourses(SEED_STORE.courses);
          setProductCategories(SEED_STORE.productCategories);
          setPageConfigs(SEED_STORE.pages);
          setCoupons([]);
        }

        const usList = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
        setUsers(usList);
      } catch (error) {
        console.error("Error loading admin datasets:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Universal Unified Save Function
  const handleSave = async (
    customProds?: Product[],
    customCourses?: Course[],
    customCoupons?: Coupon[],
    customProjects?: any[],
    customCats?: any[]
  ) => {
    setSaving(true);
    try {
      const activeProducts = customProds || storeProducts;
      const activeCourses = customCourses || storeCourses;
      const activeCoupons = customCoupons || coupons;
      const activeProjects = customProjects || projects;
      const activeCats = customCats || categories;

      const pData = {
        portfolio: activeCats.map((c: any) => ({
          ...c,
          projects: activeProjects.filter((p: any) => p.category === c.id)
        })),
        styleCategories,
        addons,
        formFields,
        discountSettings,
        adminPassword
      };

      const sData = {
        products: activeProducts.map(p => ({ ...p, free: p.price === 0 })),
        courses: activeCourses.map(c => ({ ...c, free: c.price === 0 })),
        productCategories,
        // pages are owned by the Show / hide screen — not written here, so a
        // product save can never undo a visibility change (merge keeps them).
        coupons: activeCoupons,
        ...(checkoutHelp ? { checkoutHelp } : {})
      };

      await Promise.all([
        setDoc(doc(db, "portfolio", "data"), pData),
        // merge: keeps fields this screen doesn't manage (e.g. bundles)
        setDoc(doc(db, "store", "data"), sData, { merge: true })
      ]);

      toast.success("Workspace saved live");
    } catch (err: any) {
      console.error("Failed to save changes:", err);
      toast.error("Failed to save changes: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Helper: Inline editing trigger
  const startEdit = (key: string, val: string) => setEditMap(m => ({ ...m, [key]: val }));
  const endEdit = (key: string) => setEditMap(m => { const n = { ...m }; delete n[key]; return n; });
  const getEditValue = (key: string, fallback: string) => editMap[key] !== undefined ? editMap[key] : fallback;

  // Render Loading Panel
  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#080808] text-zinc-500 flex flex-col items-center justify-center gap-4 font-sans">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#FF7A1A] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-[#FF7A1A] text-sm">EF</div>
        </div>
        <div className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">Booting Creator Studio…</div>
      </div>
    );
  }

  // Calculate high-level stats
  const totalProducts = storeProducts.length;
  const totalCourses = storeCourses.length;
  const totalVideos = projects.length;
  const activeVisibilityCount = pageConfigs.filter(p => p.enabled).length;

  // Compute aggregate sales & revenue stats
  let totalRevenue = 0;
  const productMetricsMap: { [key: string]: { name: string; type: "product" | "course" | "other"; count: number; rev: number } } = {};

  storeProducts.forEach(p => {
    productMetricsMap[p.id] = { name: p.name, type: "product", count: 0, rev: 0 };
  });
  storeCourses.forEach(c => {
    productMetricsMap[c.id] = { name: c.title, type: "course", count: 0, rev: 0 };
  });

  users.forEach(u => {
    const payments = u.payments || [];
    payments.forEach((p: any) => {
      const amt = p.amount ? (p.amount / 100) : 0;
      totalRevenue += amt;
      if (productMetricsMap[p.itemId]) {
        productMetricsMap[p.itemId].count += 1;
        productMetricsMap[p.itemId].rev += amt;
      } else {
        productMetricsMap[p.itemId] = { name: p.itemName || p.itemId, type: "other", count: 1, rev: amt };
      }
    });

    const purchases = u.purchases || [];
    purchases.forEach((pId: string) => {
      const hasPayment = payments.some((p: any) => p.itemId === pId);
      if (!hasPayment && productMetricsMap[pId]) {
        productMetricsMap[pId].count += 1;
      }
    });
  });

  // Net take-home after gateway fees — the real "profit" figure.
  const totalNetProfit = netAfterFees(totalRevenue);

  const chartData = Object.keys(productMetricsMap).map(id => ({
    name: productMetricsMap[id].name,
    sales: productMetricsMap[id].count,
    revenue: productMetricsMap[id].rev,
  })).filter(item => item.sales > 0 || item.revenue > 0);

  // Product leaderboard — joins sales with the real view/impression counters and
  // ranks every listing. Purchases = paid checkouts + free claims/grants.
  const leaderboard = Object.keys(productMetricsMap).map(id => {
    const m = productMetricsMap[id];
    const a = analyticsMap[id] || { impressions: 0, views: 0, uniqueViewers: 0, revisits: 0 };
    return {
      id,
      name: m.name,
      type: m.type,
      purchases: m.count,
      revenue: m.rev,
      netProfit: netAfterFees(m.rev),
      impressions: a.impressions,
      views: a.views,
      uniqueViewers: a.uniqueViewers,
      // Purchase ratio = purchases / unique viewers (null when nobody has viewed it yet).
      conversion: a.uniqueViewers > 0 ? (m.count / a.uniqueViewers) * 100 : null,
    };
  }).filter(r => r.purchases > 0 || r.impressions > 0 || r.views > 0);

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const val = (r: typeof a) => (leaderSort === "conversion" ? (r.conversion ?? -1) : r[leaderSort]);
    return val(b) - val(a);
  });

  // Daily trend
  const dailyRev: { [key: string]: number } = {};
  users.forEach(u => {
    const payments = u.payments || [];
    payments.forEach((p: any) => {
      if (p.at || p.purchasedAt) {
        try {
          const d = new Date(p.at || p.purchasedAt);
          const dateStr = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
          dailyRev[dateStr] = (dailyRev[dateStr] || 0) + (p.amount ? (p.amount / 100) : 0);
        } catch (err) {
          console.error(err);
        }
      }
    });
  });

  // Real data only — no fabricated fallback. Empty arrays render an empty state.
  const revenueTrendData = Object.keys(dailyRev).map(date => ({ date, revenue: dailyRev[date] })).slice(-8);
  const productChartData = chartData;

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="px-3 space-y-5">
        {NAV_GROUPS.map(group => (
          <div key={group.title} className="space-y-0.5">
            <div className="text-[10px] font-bold text-zinc-600 px-3 uppercase tracking-[0.15em] mb-1.5">{group.title}</div>
            {group.items.map(menu => {
              const on = activeTab === menu.id;
              return (
                <button
                  key={menu.id}
                  onClick={() => { setActiveTab(menu.id as TabType); onNavigate?.(); }}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all text-left cursor-pointer ${
                    on ? "bg-[#FF7A1A]/[0.12] text-white" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {on && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#FF7A1A]" />}
                  <span className={on ? "text-[#FF7A1A]" : ""}>{menu.icon}</span>
                  {menu.label}
                  {menu.id === "products" && <span className="ml-auto text-[11px] text-zinc-500 font-medium">{storeProducts.length}</span>}
                  {menu.id === "titlecard" && tcOrders.unseen > 0 && <span className="ml-auto min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#FF7A1A] text-black text-[10px] font-extrabold grid place-items-center">{tcOrders.unseen}</span>}
                  {menu.id === "payments" && problemCount > 0 && <span className="ml-auto min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold grid place-items-center">{problemCount}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <a href="/" target="_blank" rel="noopener noreferrer"
        className="mx-3 mt-6 flex items-center justify-center gap-2 h-10 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300 hover:border-white/25 hover:text-white">
        <ExternalLink size={13} /> View live site
      </a>
    </>
  );

  const allNavItems = NAV_GROUPS.flatMap(g => g.items as readonly { id: string; label: string; icon: ReactNode }[]);

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col font-sans antialiased">

      {/* ── TOP ACTION NAVIGATION HEADER ── */}
      <header className="sticky top-0 z-[60] h-14 bg-zinc-950/95 backdrop-blur border-b border-white/5 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {!activeWorkspace && (
            <button
              onClick={() => setMobileNavOpen(true)}
              className="p-1.5 -ml-1.5 text-zinc-400 hover:text-white rounded-lg lg:hidden cursor-pointer"
            >
              <Menu size={20} />
            </button>
          )}
          <span className="font-extrabold text-[13px] sm:text-sm tracking-wide whitespace-nowrap">
            YOUR EDITOR <span className="text-[#FF7A1A]">FRIEND</span>
          </span>
          <span className="hidden sm:inline-block text-[10px] font-bold tracking-widest text-zinc-500 border border-white/10 rounded-md px-1.5 py-0.5">ADMIN</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <InstallAppButton />
          <button onClick={() => { setActiveWorkspace(null); setActiveTab("payments"); }} title="Payment alerts"
            className="relative w-9 h-9 rounded-xl border border-white/10 grid place-items-center text-zinc-300 hover:text-white cursor-pointer">
            🔔
            {problemCount > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold grid place-items-center">{problemCount}</span>}
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSave()}
            disabled={saving}
            icon={saving ? <Spinner size={13} /> : <Save size={13} />}
          >
            <span className="hidden sm:inline">{saving ? "Saving…" : "Save changes"}</span>
          </Button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 text-zinc-500 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>

      {/* ── PHONE BOTTOM BAR (thumb-reach) ── */}
      {!activeWorkspace && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[70] bg-[#0c0c0c]/95 backdrop-blur border-t border-white/10 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {NAV_MOBILE.map(id => {
            const item = allNavItems.find(n => n.id === id)!;
            const on = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id as TabType)}
                className={`relative flex flex-col items-center justify-center gap-1 h-16 text-[10px] font-semibold ${on ? "text-[#FF7A1A]" : "text-zinc-500"}`}>
                {item.icon}
                {({ titlecard: "Orders", overview: "Home", products: "Products", payments: "Payments", support: "Help" } as Record<string, string>)[id] || item.label}
                {id === "titlecard" && tcOrders.unseen > 0 && <span className="absolute top-1.5 right-[calc(50%-20px)] min-w-[16px] h-4 px-1 rounded-full bg-[#FF7A1A] text-black text-[9px] font-extrabold grid place-items-center">{tcOrders.unseen}</span>}
                {id === "payments" && problemCount > 0 && <span className="absolute top-2 right-[calc(50%-18px)] w-2 h-2 rounded-full bg-red-500" />}
              </button>
            );
          })}
          <button onClick={() => setMobileNavOpen(true)} className="flex flex-col items-center justify-center gap-1 h-16 text-[10px] font-semibold text-zinc-500">
            <Menu size={17} />
            More
          </button>
        </nav>
      )}

      {/* ── WORKSPACE SHELL ── */}
      <div className="flex flex-1 min-h-[calc(100vh-56px)]">

        {/* SIDEBAR NAVIGATION — desktop */}
        {!activeWorkspace && (
          <aside className="w-60 shrink-0 bg-[#0c0c0c] border-r border-white/5 hidden lg:flex flex-col py-5 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
            <NavList />
          </aside>
        )}

        {/* SIDEBAR NAVIGATION — mobile drawer */}
        {mobileNavOpen && !activeWorkspace && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-zinc-950 border-r border-white/10 flex flex-col justify-between py-4 shadow-2xl">
              <div>
                <div className="flex items-center justify-between px-4 mb-4">
                  <span className="font-extrabold text-sm tracking-wide">
                    YOUR EDITOR <span className="text-[#FF7A1A]">FRIEND</span>
                  </span>
                  <button onClick={() => setMobileNavOpen(false)} className="p-1.5 text-zinc-400 hover:text-white cursor-pointer">
                    <X size={18} />
                  </button>
                </div>
                <NavList onNavigate={() => setMobileNavOpen(false)} />
              </div>
            </aside>
          </div>
        )}

        {/* PRIMARY WORKSPACE AREA */}
        <main className="flex-1 min-w-0 bg-[#0a0a0a] p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-y-auto max-w-full">

          {/* A. ITEM DEDICATED WORKSPACE IF SELECTED */}
          {activeWorkspace ? (
            <div className="space-y-6">

              {/* Back Bar & Quick Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      if (wsDirty && !(await confirmDialog({ title: "Leave without saving?", description: "Your changes on this product aren't saved yet.", confirmLabel: "Leave", danger: true }))) return;
                      setWsDirty(false);
                      setActiveWorkspace(null);
                    }}
                    className="h-10 px-3 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1 text-sm font-bold border border-white/10"
                  >
                    <ArrowLeft size={16} /> {activeWorkspace.type === "product" ? "Products" : "Courses"}
                  </button>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
                      {activeWorkspace.type === "product" ? "Editing product" : "Editing course"}
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white truncate max-w-[60vw] sm:max-w-[40vw]">
                      {activeWorkspace.item.name || activeWorkspace.item.title || "Untitled"}
                    </h2>
                  </div>
                </div>

                {/* Sub Tab selection */}
                <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/5 self-start sm:self-auto overflow-x-auto no-scrollbar">
                  {[
                    { id: "details", label: "✏️ Edit" },
                    { id: "analytics", label: "📈 Sales" },
                    { id: "comments", label: "💬 Q&A" },
                  ].map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setActiveWorkspace(prev => prev ? { ...prev, workspaceTab: subTab.id as any } : null)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                        activeWorkspace.workspaceTab === subTab.id
                          ? "bg-zinc-800 text-white shadow"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Workspace Tab Render: Details Editor (step-by-step) */}
              {activeWorkspace.workspaceTab === "details" && (
                <ItemEditor
                  key={activeWorkspace.id}
                  kind={activeWorkspace.type}
                  item={activeWorkspace.item}
                  categories={productCategories}
                  dirty={wsDirty}
                  saving={saving}
                  onChange={(patch) => {
                    const ch = "price" in patch ? { ...patch, free: patch.price === 0 } : patch;
                    setActiveWorkspace(prev => (prev ? { ...prev, item: { ...prev.item, ...ch } } : null));
                    if (activeWorkspace.type === "product") setStoreProducts(storeProducts.map(p => (p.id === activeWorkspace.id ? { ...p, ...ch } : p)));
                    else setStoreCourses(storeCourses.map(c => (c.id === activeWorkspace.id ? { ...c, ...ch } : c)));
                    setWsDirty(true);
                  }}
                  onSave={async () => { await handleSave(); setWsDirty(false); }}
                  onPromptKitSaved={(summary) => {
                    const next = storeProducts.map(p => (p.id === activeWorkspace.id ? { ...p, promptKit: summary } : p));
                    setStoreProducts(next);
                    setActiveWorkspace(prev => (prev ? { ...prev, item: { ...prev.item, promptKit: summary } } : null));
                    handleSave(next);
                  }}
                />
              )}

              {/* Workspace Tab Render: Analytics Insights */}
              {activeWorkspace.workspaceTab === "analytics" && (
                <StudioAnalytics
                  itemId={activeWorkspace.id}
                  itemTitle={activeWorkspace.item.name || activeWorkspace.item.title}
                  isFree={activeWorkspace.item.price === 0}
                  itemPrice={activeWorkspace.item.price}
                />
              )}

              {/* Workspace Tab Render: Threaded Q&A Moderation */}
              {activeWorkspace.workspaceTab === "comments" && (
                <div>
                  <h3 className="font-semibold text-xs text-zinc-400 uppercase tracking-widest mb-4">Filtered Q&amp;A Thread for this Item</h3>
                  <Card>
                    <StudioComments />
                  </Card>
                </div>
              )}

            </div>
          ) : (

            // B. BASE TAB NAVIGATION CONTROL PANEL
            <div>

              {/* 1. DASHBOARD */}
              {activeTab === "overview" && (
                <AdminDashboard
                  products={storeProducts}
                  courses={storeCourses}
                  users={users}
                  analytics={analyticsMap}
                  onGo={(tab) => setActiveTab(tab as TabType)}
                  onOpenProduct={(p) => setActiveWorkspace({ id: p.id, type: "product", item: p, workspaceTab: "details" })}
                />
              )}

              {/* 2. PRODUCTS — search, filter, quick Live/Draft, duplicate, delete, drag to reorder */}
              {activeTab === "products" && (() => {
                const q = productSearch.trim().toLowerCase();
                const byCat = productFilterCat === "all" ? storeProducts
                  : productFilterCat === "__draft" ? storeProducts.filter(p => !p.enabled)
                  : storeProducts.filter(p => getProductCategories(p).includes(productFilterCat));
                const visibleProducts = q ? byCat.filter(p => p.name.toLowerCase().includes(q)) : byCat;
                const canDrag = productFilterCat === "all" && !q;
                const liveCount = storeProducts.filter(p => p.enabled).length;
                const draftCount = storeProducts.length - liveCount;

                const commit = (next: Product[]) => { setStoreProducts(next); handleSave(next); };
                const updateProduct = (id: string, ch: Partial<Product>) => commit(storeProducts.map(p => (p.id === id ? { ...p, ...ch } : p)));
                const openEditor = (p: Product) => setActiveWorkspace({ id: p.id, type: "product", item: p, workspaceTab: "details" });

                const addProduct = () => {
                  const newProd: Product = {
                    id: `product-${Date.now()}`,
                    name: "Untitled product",
                    tagline: "",
                    price: 199,
                    image: "",
                    category: productCategories[0]?.id || "",
                    categories: productCategories[0] ? [productCategories[0].id] : [],
                    free: false,
                    downloadUrl: "",
                    pinned: false,
                    enabled: false,
                  };
                  commit([newProd, ...storeProducts]);
                  openEditor(newProd);
                };
                const duplicate = (p: Product) => {
                  const copy: Product = { ...p, id: `product-${Date.now()}`, name: `${p.name} (copy)`, enabled: false, pinned: false };
                  const i = storeProducts.findIndex(x => x.id === p.id);
                  commit([...storeProducts.slice(0, i + 1), copy, ...storeProducts.slice(i + 1)]);
                  toast.success("Copy created as a draft");
                };
                const remove = async (p: Product) => {
                  if (await confirmDialog({ title: `Delete "${p.name}"?`, description: "It disappears from the shop. People who bought it keep it in their library.", danger: true, confirmLabel: "Delete" })) {
                    commit(storeProducts.filter(x => x.id !== p.id));
                  }
                };

                const card = (p: Product, dragHandle?: ReactNode) => {
                  const hasDiscount = !!p.originalPrice && p.originalPrice > p.price;
                  const catLabel = productCategories.find(c => c.id === getProductCategories(p)[0])?.label;
                  return (
                    <div className={`group relative h-full flex flex-col rounded-2xl bg-[#131313] overflow-hidden border transition-colors ${
                      p.enabled ? "border-white/[0.08]" : "border-dashed border-white/20"
                    } hover:border-[#FF7A1A]/60`}>
                      {/* Image — click to edit */}
                      <button onClick={() => openEditor(p)} className="relative block w-full aspect-square bg-zinc-900 cursor-pointer">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className={`w-full h-full object-cover ${p.enabled ? "" : "opacity-60"}`} />
                        ) : (
                          <span className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs font-semibold">
                            <ImagePlus size={26} /> Add image
                          </span>
                        )}
                        <span className="absolute inset-0 hidden sm:flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="flex items-center gap-1.5 bg-[#FF7A1A] text-black text-xs font-bold px-3.5 py-2 rounded-full"><Pencil size={13} /> Edit</span>
                        </span>
                      </button>

                      {/* Select + drag + pin */}
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <button
                          onClick={() => setSelectedIds(s => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}
                          className={`w-7 h-7 rounded-lg border-2 grid place-items-center text-xs font-extrabold cursor-pointer ${selectedIds.has(p.id) ? "bg-[#FF7A1A] border-[#FF7A1A] text-black" : "bg-black/70 border-white/40 text-transparent"}`}
                          title="Select"
                        >✓</button>
                        {dragHandle}
                        {p.pinned && <span className="w-7 h-7 flex items-center justify-center bg-black/70 text-amber-400 rounded-lg" title="Pinned to top"><Pin size={13} /></span>}
                      </div>

                      {/* Live / Draft — one tap */}
                      <button
                        onClick={() => updateProduct(p.id, { enabled: !p.enabled })}
                        title={p.enabled ? "Live on the shop — tap to hide" : "Hidden draft — tap to put live"}
                        className={`absolute top-2 right-2 h-7 px-2.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 cursor-pointer backdrop-blur ${
                          p.enabled ? "bg-[#25D366] text-black" : "bg-black/75 text-zinc-300 border border-white/20"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${p.enabled ? "bg-black" : "bg-zinc-400"}`} />
                        {p.enabled ? "Live" : "Draft"}
                      </button>

                      {/* Info */}
                      <div className="px-3 pt-2.5 pb-2 flex-1">
                        <h3 className="text-[13px] font-semibold leading-snug line-clamp-2">{p.name}</h3>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className={`text-sm font-extrabold ${p.price === 0 ? "text-[#25D366]" : "text-white"}`}>{p.price === 0 ? "FREE" : `₹${p.price.toLocaleString("en-IN")}`}</span>
                          {hasDiscount && <span className="text-[11px] text-zinc-600 line-through">₹{p.originalPrice}</span>}
                        </div>
                        {typeof p.rating === "number" && p.rating > 0 && (
                          <div className="flex items-center gap-0.5 mt-1 text-[11px] text-zinc-500"><Star size={10} fill="#facc15" className="text-yellow-400" />{p.rating.toFixed(1)}</div>
                        )}
                        {/* Change category right here — saves instantly */}
                        <select
                          value={getProductCategories(p)[0] || ""}
                          onChange={e => { const c = e.target.value; updateProduct(p.id, { category: c, categories: c ? [c] : [] }); toast.success(`Moved to ${productCategories.find(x => x.id === c)?.label || "no category"}`); }}
                          className="mt-2 w-full h-8 rounded-lg border border-[#FF7A1A]/35 bg-[#FF7A1A]/[0.06] text-[#ffb27a] text-[12px] font-bold px-2 cursor-pointer outline-none"
                          title={catLabel ? `Category: ${catLabel}` : "No category"}
                        >
                          <option value="">— No category —</option>
                          {productCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-[1fr_auto_auto] border-t border-white/[0.06]">
                        <button onClick={() => openEditor(p)} className="h-10 flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-200 hover:bg-white/[0.04] cursor-pointer">
                          <Pencil size={13} /> Edit
                        </button>
                        <button onClick={() => duplicate(p)} title="Duplicate" className="h-10 w-11 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.04] border-l border-white/[0.06] cursor-pointer">
                          <CopyIcon size={14} />
                        </button>
                        <button onClick={() => remove(p)} title="Delete" className="h-10 w-11 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border-l border-white/[0.06] cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                };

                const addCard = (
                  <button onClick={addProduct}
                    className="min-h-[220px] h-full rounded-2xl border-2 border-dashed border-white/15 hover:border-[#FF7A1A] text-zinc-400 hover:text-[#FF7A1A] flex flex-col items-center justify-center gap-2 text-sm font-bold transition-colors cursor-pointer">
                    <span className="w-12 h-12 rounded-full bg-[#FF7A1A]/10 flex items-center justify-center"><Plus size={22} /></span>
                    Add product
                  </button>
                );

                const chips = [
                  { id: "all", label: "All", count: storeProducts.length },
                  ...productCategories.map(c => ({ id: c.id, label: c.label, count: storeProducts.filter(p => getProductCategories(p).includes(c.id)).length })),
                  ...(draftCount ? [{ id: "__draft", label: "Drafts", count: draftCount }] : []),
                ];

                return (
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">Products</h1>
                        <p className="text-xs text-zinc-500 mt-1">
                          <span className="text-[#25D366] font-semibold">{liveCount} live</span> · {draftCount} draft{draftCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Button variant="primary" icon={<Plus size={15} />} className="shrink-0" onClick={addProduct}>Add product</Button>
                    </div>

                    {/* Search + filters */}
                    <div className="flex flex-col gap-3">
                      <div className="relative max-w-sm">
                        <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products"
                          className="w-full h-11 bg-[#131313] border border-white/10 rounded-xl pl-9 pr-3 text-sm outline-none focus:border-[#FF7A1A]" />
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
                        {chips.map(c => (
                          <button key={c.id} onClick={() => setProductFilterCat(c.id)}
                            className={`shrink-0 h-9 rounded-full px-3.5 text-xs font-bold cursor-pointer transition-colors border flex items-center gap-1.5 ${
                              productFilterCat === c.id ? "bg-white text-black border-white" : "border-white/10 text-zinc-400 hover:text-white hover:border-white/25"
                            }`}>
                            {c.label} <span className={productFilterCat === c.id ? "text-zinc-500" : "text-zinc-600"}>{c.count}</span>
                          </button>
                        ))}
                        <button onClick={() => setShowCatEditor(v => !v)}
                          className="shrink-0 h-9 rounded-full px-3.5 text-xs font-bold text-[#FF7A1A] border border-dashed border-[#FF7A1A]/40 hover:bg-[#FF7A1A]/10 cursor-pointer">
                          {showCatEditor ? "Done" : "Edit categories"}
                        </button>
                      </div>
                    </div>

                    {/* Inline category editor */}
                    {showCatEditor && (
                      <div className="rounded-2xl border border-white/10 bg-[#131313] p-4 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {productCategories.map(cat => (
                            <span key={cat.id} className="h-9 pl-3.5 pr-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-semibold flex items-center gap-1.5">
                              {cat.label}
                              <button
                                onClick={async () => {
                                  if (await confirmDialog({ title: `Delete category "${cat.label}"?`, description: "Products stay — they just lose this label.", danger: true, confirmLabel: "Delete" })) {
                                    setProductCategories(productCategories.filter(c => c.id !== cat.id));
                                  }
                                }}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer" title="Delete category">
                                <X size={13} />
                              </button>
                            </span>
                          ))}
                          {productCategories.length === 0 && <span className="text-xs text-zinc-500">No categories yet.</span>}
                        </div>
                        <form
                          className="flex gap-2 max-w-sm"
                          onSubmit={e => {
                            e.preventDefault();
                            const input = (e.currentTarget.elements.namedItem("cat") as HTMLInputElement);
                            const label = input.value.trim();
                            if (!label) return;
                            const id = label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `cat-${Date.now()}`;
                            if (productCategories.some(c => c.id === id)) { toast.error("That category already exists"); return; }
                            setProductCategories([...productCategories, { id, label, enabled: true }]);
                            input.value = "";
                          }}>
                          <input name="cat" placeholder="New category, e.g. Title Cards"
                            className="flex-1 h-10 bg-zinc-950 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-[#FF7A1A]" />
                          <Button variant="primary" size="sm" icon={<Plus size={13} />}>Add</Button>
                        </form>
                        <p className="text-[11px] text-zinc-500">Category changes go live when you press <b className="text-zinc-300">Save changes</b> at the top.</p>
                      </div>
                    )}

                    {/* Bulk actions for selected cards */}
                    {selectedIds.size > 0 && (
                      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-[#FF7A1A]/50 bg-[#2a1606] px-3 py-2.5">
                        <b className="text-sm">{selectedIds.size} selected</b>
                        <select id="bulkCat" defaultValue="" className="h-9 rounded-lg bg-black border border-white/20 px-2 text-sm"
                          onChange={e => {
                            const c = e.target.value; if (!c) return;
                            commit(storeProducts.map(p => (selectedIds.has(p.id) ? { ...p, category: c, categories: [c] } : p)));
                            toast.success(`${selectedIds.size} moved to ${productCategories.find(x => x.id === c)?.label}`);
                            setSelectedIds(new Set());
                          }}>
                          <option value="">Move to category…</option>
                          {productCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                        <Button size="sm" variant="secondary" onClick={() => { commit(storeProducts.map(p => (selectedIds.has(p.id) ? { ...p, enabled: true } : p))); setSelectedIds(new Set()); }}>Show</Button>
                        <Button size="sm" variant="secondary" onClick={() => { commit(storeProducts.map(p => (selectedIds.has(p.id) ? { ...p, enabled: false } : p))); setSelectedIds(new Set()); }}>Hide</Button>
                        <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-zinc-400 hover:text-white cursor-pointer">✕ Clear</button>
                      </div>
                    )}

                    <p className="text-[11px] text-zinc-500">
                      {canDrag ?"Drag the grip handle (top-left of a card) to reorder — the shop shows products in this order. Tap Live / Draft to show or hide." : "Pick All and clear search to reorder."}
                    </p>

                    {/* Grid */}
                    {canDrag ? (
                      <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleProductDragEnd}>
                        <SortableContext items={storeProducts.map(p => p.id)} strategy={rectSortingStrategy}>
                          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                            {addCard}
                            {storeProducts.map(p => (
                              <SortableProductCard key={p.id} id={p.id}>
                                {(drag) => card(
                                  p,
                                  <button
                                    ref={drag.setActivatorNodeRef}
                                    {...drag.attributes}
                                    {...drag.listeners}
                                    className="w-7 h-7 flex items-center justify-center bg-black/70 text-zinc-200 hover:text-white rounded-lg cursor-grab active:cursor-grabbing touch-none"
                                    title="Drag to reorder"
                                  >
                                    <GripVertical size={14} />
                                  </button>
                                )}
                              </SortableProductCard>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : visibleProducts.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                        {visibleProducts.map(p => <div key={p.id}>{card(p)}</div>)}
                      </div>
                    ) : (
                      <EmptyState icon={<FolderEdit size={32} />} title="Nothing matches" description="Try another search or category." />
                    )}
                  </div>
                );
              })()}

              {/* 3. COURSES MASTER LIST */}
              {activeTab === "courses" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">Academy Courses</h1>
                      <p className="text-xs text-zinc-500 font-light mt-0.5 max-w-xl">Manage educational course video playlists, download materials, student rosters, and curriculum details.</p>
                    </div>
                    <Button
                      variant="success"
                      icon={<Plus size={14} />}
                      className="shrink-0"
                      onClick={() => {
                        const newCourse: Course = {
                          id: `course-${Date.now()}`,
                          title: "New Video Editing Course",
                          tagline: "Start your video editing journey here",
                          thumbnail: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800",
                          price: 1499,
                          features: ["High-quality lessons", "Project source files included", "Lifetime access"],
                          free: false,
                          accessUrl: "",
                          enabled: false,
                        };
                        const nextCourses = [newCourse, ...storeCourses];
                        setStoreCourses(nextCourses);
                        handleSave(undefined, nextCourses);
                      }}
                    >
                      Add Academy Course
                    </Button>
                  </div>

                  {/* Courses layout grids */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {storeCourses.map((c) => (
                      <Card key={c.id} hoverable className="!p-4 flex flex-col justify-between group">
                        <div>
                          {/* 16:9 Thumbnail Preview */}
                          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/5 mb-4">
                            <img
                              src={c.thumbnail}
                              alt={c.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute top-2 right-2">
                              <Badge toneKey={c.enabled ? "success" : "neutral"}>{c.enabled ? "Live" : "Draft"}</Badge>
                            </div>
                          </div>

                          <h3 className="font-semibold text-xs tracking-wide text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                            {c.title}
                          </h3>
                          <p className="text-[10px] text-zinc-500 font-light mt-1.5 line-clamp-2 leading-relaxed">
                            {c.tagline || "No course description tagline provided."}
                          </p>
                        </div>

                        <div className="border-t border-white/[0.04] mt-4 pt-3.5 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-zinc-300 font-mono">
                            {c.price === 0 ? "FREE" : `₹${c.price}`}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                if (await confirmDialog({ title: `Delete course "${c.title}"?`, danger: true, confirmLabel: "Delete" })) {
                                  const next = storeCourses.filter(x => x.id !== c.id);
                                  setStoreCourses(next);
                                  handleSave(undefined, next);
                                }
                              }}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors cursor-pointer"
                              title="Delete Course"
                            >
                              <Trash2 size={13} />
                            </button>
                            <button
                              onClick={() => setActiveWorkspace({ id: c.id, type: "course", item: c, workspaceTab: "details" })}
                              className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Open Class <ChevronRight size={10} />
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {storeCourses.length === 0 && (
                    <EmptyState
                      icon={<BookOpen size={32} />}
                      title="No courses yet"
                      description="No educational courses registered in your academy portal."
                    />
                  )}

                </div>
              )}

              {/* 4. PUBLIC COMMENTS MODERATION */}
              {activeTab === "comments" && <StudioComments />}

              {/* 5. USERS & ACCESS MANAGEMENT */}
              {activeTab === "users" && (
                <AdminCustomers onEmail={(emails) => { setEmailPreset(emails); setActiveTab("email"); }} />
              )}
              {activeTab === "email" && <AdminEmail preset={emailPreset} />}
              {activeTab === "storage" && <AdminStorage />}
              {activeTab === "titlecard" && <AdminTitleCard data={tcOrders} />}

              {activeTab === "payments" && (
                <AdminPayments onOpenSupport={(em) => { setSupportEmail(em); setActiveTab("support"); }} />
              )}
              {activeTab === "support" && <AdminSupport initialEmail={supportEmail} />}
              {activeTab === "reviews" && <AdminReviews />}

              {activeTab === "bundles" && (
                <Card>
                  <AdminBundlesPanel />
                </Card>
              )}

              {/* 6. DISCOUNT COUPONS */}
              {activeTab === "coupons" && (
                <Card>
                  <AdminCouponsPanel />
                </Card>
              )}

              {/* 7. PAGE VISIBILITY CONFIG */}
              {activeTab === "pages" && (
                <div className="space-y-4">
                  <AdminSiteMap />
                  <details className="rounded-2xl border border-white/[0.08] bg-[#131313] p-4">
                    <summary className="cursor-pointer text-sm font-bold text-zinc-300">Advanced: checkout help note (GPay fallback message)</summary>
                    <div className="mt-4"><AdminPagesPanel /></div>
                  </details>
                </div>
              )}

              {/* 8. RECENT PORTFOLIO PROJECTS */}
              {activeTab === "projects" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">Recent Projects</h1>
                      <p className="text-xs text-zinc-500 font-light mt-0.5">Configure your home page showcase portfolio videos and categories.</p>
                    </div>
                    <Button
                      variant="success"
                      icon={<Plus size={14} />}
                      className="shrink-0"
                      onClick={() => {
                        const newTitle = window.prompt("Enter new video title:");
                        const newLink = window.prompt("Enter video link:");
                        if (!newTitle || !newLink) return;
                        const cat = categories[0]?.id || "personal_branding";
                        const nextProj = {
                          id: Date.now(),
                          category: cat,
                          order: projects.filter(p => p.category === cat).length,
                          title: newTitle,
                          link: newLink,
                          enabled: true,
                          orientation: "vertical"
                        };
                        const nextList = [...projects, nextProj];
                        setProjects(nextList);
                        handleSave(undefined, undefined, undefined, nextList);
                      }}
                    >
                      Add Video
                    </Button>
                  </div>

                  {/* Categories */}
                  <Card>
                    <CardHeader
                      title="Active Tabs Categories"
                      action={
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Plus size={11} />}
                          onClick={() => {
                            const label = window.prompt("Enter new category name:");
                            if (!label?.trim()) return;
                            const nextCats = [...categories, { id: label.toLowerCase().trim().replace(/\s+/g, "-"), label: label.trim(), enabled: true }];
                            setCategories(nextCats);
                          }}
                        >
                          Add Category
                        </Button>
                      }
                    />

                    {/* Category filter tabs — reordering (below) is only
                        available while a single category is selected, since
                        that's the actual display grouping on the public site. */}
                    <div className="flex flex-wrap items-center gap-2">
                      {[{ id: "all", label: "All" }, ...categories].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setPortfolioFilterCat(cat.id)}
                          className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold cursor-pointer transition-colors border ${
                            portfolioFilterCat === cat.id ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                      {portfolioFilterCat === "all" && (
                        <span className="text-zinc-600 text-[11px]">Select a single category to drag-and-drop reorder.</span>
                      )}
                    </div>
                  </Card>

                  {/* Portfolio Video List — grouped by category when viewing
                      "All"; a single sortable list when a category is picked. */}
                  {(() => {
                    const withOrder = (list: any[]) => [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

                    const renderProjectRow = (proj: any, dragHandle?: ReactNode) => (
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/10 transition-colors">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          {dragHandle}
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={getEditValue(`proj_title_${proj.id}`, proj.title)}
                              onChange={(e) => startEdit(`proj_title_${proj.id}`, e.target.value)}
                              onBlur={() => {
                                const val = getEditValue(`proj_title_${proj.id}`, proj.title);
                                const next = projects.map(p => p.id === proj.id ? { ...p, title: val } : p);
                                setProjects(next);
                                endEdit(`proj_title_${proj.id}`);
                              }}
                              className="bg-transparent border-none text-xs font-bold text-white focus:ring-1 focus:ring-red-500 rounded px-1.5 py-0.5 w-full outline-none"
                            />
                            <input
                              type="text"
                              value={getEditValue(`proj_link_${proj.id}`, proj.link)}
                              onChange={(e) => startEdit(`proj_link_${proj.id}`, e.target.value)}
                              onBlur={() => {
                                const val = getEditValue(`proj_link_${proj.id}`, proj.link);
                                const next = projects.map(p => p.id === proj.id ? { ...p, link: val } : p);
                                setProjects(next);
                                endEdit(`proj_link_${proj.id}`);
                              }}
                              className="bg-transparent border-none text-[10px] text-zinc-500 font-mono focus:ring-1 focus:ring-red-500 rounded px-1.5 py-0.5 w-full mt-1 outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap">
                          <select
                            value={proj.category}
                            onChange={(e) => {
                              const val = e.target.value;
                              const next = projects.map(p => p.id === proj.id ? { ...p, category: val, order: projects.filter(x => x.category === val).length } : p);
                              setProjects(next);
                            }}
                            className="bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] font-mono text-zinc-400 outline-none"
                          >
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                          </select>

                          <button
                            onClick={() => {
                              const nextOrient = proj.orientation === "horizontal" ? "vertical" : "horizontal";
                              const next = projects.map(p => p.id === proj.id ? { ...p, orientation: nextOrient } : p);
                              setProjects(next);
                            }}
                            className="bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer"
                          >
                            {proj.orientation === "horizontal" ? "16:9" : "9:16"}
                          </button>

                          <button
                            onClick={() => {
                              const nextVis = !proj.enabled;
                              const next = projects.map(p => p.id === proj.id ? { ...p, enabled: nextVis } : p);
                              setProjects(next);
                            }}
                            className="cursor-pointer"
                          >
                            <Badge toneKey={proj.enabled ? "success" : "neutral"}>{proj.enabled ? "Show" : "Hide"}</Badge>
                          </button>

                          <button
                            onClick={async () => {
                              if (await confirmDialog({ title: "Delete this video?", danger: true, confirmLabel: "Delete" })) {
                                const next = projects.filter(p => p.id !== proj.id);
                                setProjects(next);
                              }
                            }}
                            className="p-1.5 text-zinc-500 hover:text-red-400 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );

                    if (portfolioFilterCat === "all") {
                      const uncategorized = withOrder(projects.filter(p => !categories.some(c => c.id === p.category)));
                      return (
                        <div className="space-y-5">
                          {categories.map(cat => {
                            const catItems = withOrder(projects.filter(p => p.category === cat.id));
                            if (catItems.length === 0) return null;
                            return (
                              <Card key={cat.id}>
                                <CardHeader title={cat.label} />
                                <div className="space-y-3">
                                  {catItems.map(proj => <div key={proj.id}>{renderProjectRow(proj)}</div>)}
                                </div>
                              </Card>
                            );
                          })}
                          {uncategorized.length > 0 && (
                            <Card>
                              <CardHeader title="Uncategorized" />
                              <div className="space-y-3">
                                {uncategorized.map(proj => <div key={proj.id}>{renderProjectRow(proj)}</div>)}
                              </div>
                            </Card>
                          )}
                          {projects.length === 0 && (
                            <Card><EmptyState title="No portfolio videos yet" description="Add a video to showcase it on the homepage." /></Card>
                          )}
                        </div>
                      );
                    }

                    const catItems = withOrder(projects.filter(p => p.category === portfolioFilterCat));
                    return (
                      <Card>
                        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handlePortfolioDragEnd}>
                          <SortableContext items={catItems.map(p => p.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                              {catItems.map(proj => (
                                <SortableProductCard key={proj.id} id={proj.id}>
                                  {(drag) => renderProjectRow(
                                    proj,
                                    <button
                                      ref={drag.setActivatorNodeRef}
                                      {...drag.attributes}
                                      {...drag.listeners}
                                      className="mt-1 shrink-0 w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-zinc-300 rounded-lg cursor-grab active:cursor-grabbing touch-none"
                                      title="Drag to reorder"
                                    >
                                      <GripVertical size={13} />
                                    </button>
                                  )}
                                </SortableProductCard>
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                        {catItems.length === 0 && (
                          <EmptyState title="No videos in this category yet" description="Add a video and set its category, or switch categories above." />
                        )}
                      </Card>
                    );
                  })()}
                </div>
              )}

              {/* 9. CUSTOM QUOTE BUILDER CONFIGS */}
              {activeTab === "quote" && (
                <div className="space-y-6">

                  <div className="border-b border-white/5 pb-4">
                    <h1 className="text-2xl font-bold tracking-tight">Custom Quote Builder</h1>
                    <p className="text-xs text-zinc-500 font-light mt-0.5">Configure bulk discount tiers, quick add-ons, and per-style pricing for the custom quote flow.</p>
                  </div>

                  {/* Bulk discount parameters */}
                  <Card>
                    <CardHeader title="Bulk Discount Parameters" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
                        <div className="text-xs font-bold text-amber-500 tracking-wider">TIER 1 MULTI-VIDEO DISCOUNT</div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <Field label="Min Videos">
                            <Input type="number" value={discountSettings.tier1.minVideos}
                              onChange={(e) => setDiscountSettings({ ...discountSettings, tier1: { ...discountSettings.tier1, minVideos: Number(e.target.value) } })}
                              className="text-center font-mono" />
                          </Field>
                          <Field label="Max Videos">
                            <Input type="number" value={discountSettings.tier1.maxVideos}
                              onChange={(e) => setDiscountSettings({ ...discountSettings, tier1: { ...discountSettings.tier1, maxVideos: Number(e.target.value) } })}
                              className="text-center font-mono" />
                          </Field>
                          <Field label="Discount %">
                            <Input type="number" value={discountSettings.tier1.discountPercent}
                              onChange={(e) => setDiscountSettings({ ...discountSettings, tier1: { ...discountSettings.tier1, discountPercent: Number(e.target.value) } })}
                              className="text-center font-mono text-amber-400 font-bold" />
                          </Field>
                        </div>
                      </div>

                      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
                        <div className="text-xs font-bold text-[#25D366] tracking-wider">TIER 2 MULTI-VIDEO DISCOUNT</div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <Field label="Min Videos">
                            <Input type="number" value={discountSettings.tier2.minVideos}
                              onChange={(e) => setDiscountSettings({ ...discountSettings, tier2: { ...discountSettings.tier2, minVideos: Number(e.target.value) } })}
                              className="text-center font-mono" />
                          </Field>
                          <Field label="Max Videos">
                            <Input type="number" value={discountSettings.tier2.maxVideos}
                              onChange={(e) => setDiscountSettings({ ...discountSettings, tier2: { ...discountSettings.tier2, maxVideos: Number(e.target.value) } })}
                              className="text-center font-mono" />
                          </Field>
                          <Field label="Discount %">
                            <Input type="number" value={discountSettings.tier2.discountPercent}
                              onChange={(e) => setDiscountSettings({ ...discountSettings, tier2: { ...discountSettings.tier2, discountPercent: Number(e.target.value) } })}
                              className="text-center font-mono text-[#25D366] font-bold" />
                          </Field>
                        </div>
                      </div>

                    </div>
                  </Card>

                  {/* Quote Add-ons list */}
                  <Card>
                    <CardHeader
                      title="Quote Quick Add-ons"
                      action={
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Plus size={11} />}
                          onClick={() => {
                            const label = window.prompt("Enter new add-on name:");
                            const price = Number(window.prompt("Price per video:"));
                            if (!label) return;
                            setAddons([...addons, { id: Date.now().toString(), label: label.trim(), enabled: true, price }]);
                          }}
                        >
                          Add Add-on
                        </Button>
                      }
                    />

                    <div className="space-y-3">
                      {addons.map((add) => (
                        <div key={add.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 flex items-center justify-between gap-3 flex-wrap">
                          <span className="text-xs font-semibold text-zinc-300">{add.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-zinc-500">₹</span>
                            <input
                              type="number"
                              value={add.price}
                              onChange={(e) => setAddons(addons.map(a => a.id === add.id ? { ...a, price: Number(e.target.value) } : a))}
                              className="bg-zinc-950 border border-white/10 rounded text-center text-xs font-mono font-bold text-red-400 w-16 px-1 py-0.5 outline-none"
                            />
                            <button
                              onClick={() => setAddons(addons.map(a => a.id === add.id ? { ...a, enabled: !a.enabled } : a))}
                              className="cursor-pointer"
                            >
                              <Badge toneKey={add.enabled ? "success" : "neutral"}>{add.enabled ? "Active" : "Disabled"}</Badge>
                            </button>
                            <button
                              onClick={() => setAddons(addons.filter(a => a.id !== add.id))}
                              className="p-1 text-zinc-600 hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {addons.length === 0 && (
                      <EmptyState title="No add-ons configured" description="Add optional extras buyers can attach to their custom quote." />
                    )}
                  </Card>

                  {/* Style Config Categories panel */}
                  <Card>
                    <CardHeader
                      title="Quote Style Options"
                      action={
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<Plus size={11} />}
                          onClick={() => {
                            const label = window.prompt("New style category title:");
                            if (!label) return;
                            setStyleCategories([...styleCategories, { id: label.toLowerCase().trim().replace(/\s+/g, "-"), label: label.trim(), enabled: true, styles: [] }]);
                          }}
                        >
                          Add Style Tab
                        </Button>
                      }
                    />

                    <div className="space-y-4">
                      {styleCategories.map((cat) => (
                        <div key={cat.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
                            <span className="font-bold text-xs tracking-wider uppercase font-mono text-zinc-300">{cat.label}</span>
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<Plus size={10} />}
                              onClick={() => {
                                const newLabel = window.prompt("Enter new style option name:");
                                const price = Number(window.prompt("Base price (₹):"));
                                if (!newLabel) return;
                                setStyleCategories(styleCategories.map(c => c.id === cat.id ? { ...c, styles: [...c.styles, { id: `s-${Date.now()}`, label: newLabel, price, enabled: true, videoUrl: "", description: "" }] } : c));
                              }}
                            >
                              Add Style Card
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {cat.styles.map((styleItem: any) => (
                              <div key={styleItem.id} className="bg-zinc-950/40 border border-white/5 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex-1 space-y-1.5 min-w-0">
                                  <input
                                    type="text"
                                    value={styleItem.label}
                                    onChange={(e) => {
                                      const label = e.target.value;
                                      setStyleCategories(styleCategories.map(c => c.id === cat.id ? { ...c, styles: c.styles.map((s: any) => s.id === styleItem.id ? { ...s, label } : s) } : c));
                                    }}
                                    className="bg-transparent border-none text-xs font-semibold text-white focus:ring-0 p-0 outline-none w-full"
                                  />
                                  <input
                                    type="text"
                                    value={styleItem.videoUrl}
                                    onChange={(e) => {
                                      const videoUrl = e.target.value;
                                      setStyleCategories(styleCategories.map(c => c.id === cat.id ? { ...c, styles: c.styles.map((s: any) => s.id === styleItem.id ? { ...s, videoUrl } : s) } : c));
                                    }}
                                    placeholder="Add Preview video url link..."
                                    className="bg-transparent border-none text-[10px] text-zinc-500 font-mono focus:ring-0 p-0 block w-full outline-none"
                                  />
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-xs text-zinc-500">₹</span>
                                  <input
                                    type="number"
                                    value={styleItem.price}
                                    onChange={(e) => {
                                      const price = Number(e.target.value);
                                      setStyleCategories(styleCategories.map(c => c.id === cat.id ? { ...c, styles: c.styles.map((s: any) => s.id === styleItem.id ? { ...s, price } : s) } : c));
                                    }}
                                    className="bg-zinc-950 border border-white/10 rounded text-center text-xs font-mono font-bold text-rose-500 w-20 px-1 py-0.5 outline-none"
                                  />
                                  <button
                                    onClick={() => {
                                      setStyleCategories(styleCategories.map(c => c.id === cat.id ? { ...c, styles: c.styles.filter((s: any) => s.id !== styleItem.id) } : c));
                                    }}
                                    className="p-1 text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {cat.styles.length === 0 && (
                              <div className="text-center py-4 text-[11px] text-zinc-600 border border-dashed border-white/5 rounded-xl">
                                No style cards in this tab yet.
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {styleCategories.length === 0 && (
                      <EmptyState title="No style tabs yet" description="Add a style tab to group pricing options in the quote builder." />
                    )}
                  </Card>

                </div>
              )}

              {/* 10. SYSTEM SETTINGS & CREDENTIALS */}
              {activeTab === "settings" && (
                <Card className="max-w-xl">
                  <CardHeader title="Creator Studio Settings" />
                  <Field
                    label="Admin Password"
                    hint="If set, only logins meeting this master credentials code will grant admin access roles."
                  >
                    <Input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="font-mono text-sm py-3"
                    />
                  </Field>
                </Card>
              )}

            </div>
          )}

        </main>
      </div>

    </div>
  );
}
