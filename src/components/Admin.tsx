import { useEffect, useState, type ReactNode } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { SEED_STORE, StoreData, Product, Course, ProductCategory, PageConfig, Coupon, getProductCategories, getDiscountPercent } from "../lib/store";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImageField } from "./ImageField";
import { FileField } from "./FileField";
import { StudioAnalytics } from "./StudioAnalytics";
import { StudioComments } from "./StudioComments";
import { AdminPagesPanel, AdminProductsPanel, AdminCoursesPanel, AdminUsersPanel, AdminCouponsPanel } from "./AdminStore";
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
} from "lucide-react";

// Types
type TabType = "overview" | "products" | "courses" | "projects" | "pages" | "comments" | "users" | "coupons" | "quote" | "settings";

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

const NAV_CORE = [
  { id: "overview", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { id: "products", label: "Digital Products", icon: <FolderEdit size={16} /> },
  { id: "courses", label: "Academy Courses", icon: <BookOpen size={16} /> },
  { id: "projects", label: "Portfolio Videos", icon: <ExternalLink size={16} /> },
  { id: "comments", label: "Public Comments", icon: <MessageSquare size={16} /> },
  { id: "users", label: "Users & Licensing", icon: <Users size={16} /> },
  { id: "coupons", label: "Discount Coupons", icon: <Tag size={16} /> },
] as const;

const NAV_CONFIG = [
  { id: "pages", label: "Page Visibility", icon: <Eye size={16} /> },
  { id: "quote", label: "Custom Quote", icon: <Sliders size={16} /> },
  { id: "settings", label: "Studio Settings", icon: <Settings size={16} /> },
] as const;

export default function Admin({ onLogout }: { onLogout?: () => void }) {
  const toast = useToast();
  const confirmDialog = useConfirm();

  // Navigation & Shell States
  const [activeTab, setActiveTab] = useState<TabType>("overview");
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
  const [users, setUsers] = useState<any[]>([]);

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
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleProductDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = storeProducts.findIndex(p => p.id === active.id);
    const newIndex = storeProducts.findIndex(p => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setStoreProducts(arrayMove(storeProducts, oldIndex, newIndex));
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
        const [portfolioSnap, storeSnap, usersSnap] = await Promise.all([
          getDoc(doc(db, "portfolio", "data")),
          getDoc(doc(db, "store", "data")),
          getDocs(collection(db, "users")),
        ]);

        if (portfolioSnap.exists()) {
          const d = portfolioSnap.data();
          setCategories(d.portfolio || []);
          setProjects(d.portfolio?.flatMap((c: any) => c.projects) || []);
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
        pages: pageConfigs,
        coupons: activeCoupons
      };

      await Promise.all([
        setDoc(doc(db, "portfolio", "data"), pData),
        setDoc(doc(db, "store", "data"), sData)
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
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#E50914] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-[#E50914] text-sm">EF</div>
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
  const productMetricsMap: { [key: string]: { name: string; count: number; rev: number } } = {};

  storeProducts.forEach(p => {
    productMetricsMap[p.id] = { name: p.name, count: 0, rev: 0 };
  });
  storeCourses.forEach(c => {
    productMetricsMap[c.id] = { name: c.title, count: 0, rev: 0 };
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
        productMetricsMap[p.itemId] = { name: p.itemName || p.itemId, count: 1, rev: amt };
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

  const chartData = Object.keys(productMetricsMap).map(id => ({
    name: productMetricsMap[id].name,
    sales: productMetricsMap[id].count,
    revenue: productMetricsMap[id].rev,
  })).filter(item => item.sales > 0 || item.revenue > 0);

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

  const revenueTrendData = Object.keys(dailyRev).length > 0
    ? Object.keys(dailyRev).map(date => ({ date, revenue: dailyRev[date] })).slice(-8)
    : [
        { date: "Jul 10", revenue: 2400 },
        { date: "Jul 11", revenue: 4200 },
        { date: "Jul 12", revenue: 3800 },
        { date: "Jul 13", revenue: 5600 },
        { date: "Jul 14", revenue: 7100 },
        { date: "Jul 15", revenue: 6400 },
        { date: "Jul 16", revenue: 8900 },
        { date: "Jul 17", revenue: totalRevenue > 0 ? totalRevenue : 10400 },
      ];

  const productChartData = chartData.length > 0
    ? chartData
    : [
        { name: "Super LUT Pack", sales: 42, revenue: 12600 },
        { name: "Premiere Transition Presets", sales: 28, revenue: 8400 },
        { name: "Sound FX Library Pro", sales: 15, revenue: 4500 },
        { name: "Full-Time Bootcamp", sales: 8, revenue: 16000 },
      ];

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="space-y-1 px-3">
        <div className="text-[10px] font-bold text-zinc-500 px-3 uppercase tracking-widest mb-2.5">Studio Core</div>
        {NAV_CORE.map((menu) => (
          <button
            key={menu.id}
            onClick={() => { setActiveTab(menu.id as TabType); onNavigate?.(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all text-left cursor-pointer ${
              activeTab === menu.id
                ? "bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/15"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            {menu.icon}
            {menu.label}
          </button>
        ))}

        <div className="text-[10px] font-bold text-zinc-500 px-3 uppercase tracking-widest pt-5 mb-2.5">Configurations</div>
        {NAV_CONFIG.map((menu) => (
          <button
            key={menu.id}
            onClick={() => { setActiveTab(menu.id as TabType); onNavigate?.(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all text-left cursor-pointer ${
              activeTab === menu.id
                ? "bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/15"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            {menu.icon}
            {menu.label}
          </button>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-white/[0.05] text-[10px] text-zinc-600 font-mono mt-4">
        Workspace v2.2.0<br />Creator Studio
      </div>
    </>
  );

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
          <div className="w-8 h-8 rounded-lg bg-[#E50914] flex items-center justify-center font-bold text-white text-base font-mono shrink-0">
            S
          </div>
          <span className="font-semibold text-sm tracking-wider uppercase font-mono hidden sm:inline">
            Creator <span className="text-[#E50914]">Studio</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSave()}
            disabled={saving}
            icon={saving ? <Spinner size={13} /> : <Save size={13} />}
          >
            <span className="hidden sm:inline">{saving ? "Saving…" : "Save Workspace"}</span>
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

      {/* ── WORKSPACE SHELL ── */}
      <div className="flex flex-1 min-h-[calc(100vh-56px)]">

        {/* SIDEBAR NAVIGATION — desktop */}
        {!activeWorkspace && (
          <aside className="w-56 shrink-0 bg-zinc-950/60 border-r border-white/5 hidden lg:flex flex-col justify-between py-4">
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
                  <span className="font-semibold text-sm tracking-wider uppercase font-mono">
                    Creator <span className="text-[#E50914]">Studio</span>
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
        <main className="flex-1 bg-zinc-900/10 p-4 sm:p-6 overflow-y-auto max-w-full">

          {/* A. ITEM DEDICATED WORKSPACE IF SELECTED */}
          {activeWorkspace ? (
            <div className="space-y-6">

              {/* Back Bar & Quick Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveWorkspace(null)}
                    className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                  >
                    <ArrowLeft size={16} /> Content
                  </button>
                  <div className="h-6 w-[1px] bg-white/10 hidden sm:block"></div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
                      {activeWorkspace.type === "product" ? "Product Workspace" : "Course Workspace"}
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-1.5 mt-0.5 truncate">
                      {activeWorkspace.item.name || activeWorkspace.item.title}
                    </h2>
                  </div>
                </div>

                {/* Sub Tab selection */}
                <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/5 self-start sm:self-auto overflow-x-auto no-scrollbar">
                  {[
                    { id: "details", label: "Details" },
                    { id: "analytics", label: "Analytics & Sales" },
                    { id: "comments", label: "Q&A Discussion" },
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

              {/* Workspace Tab Render: Details Editor */}
              {activeWorkspace.workspaceTab === "details" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                  {/* Left edit column */}
                  <div className="lg:col-span-2 space-y-5">

                    {/* Core description block */}
                    <Card>
                      <CardHeader title="Primary Information" />
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Display Title">
                            <Input
                              value={activeWorkspace.type === "product" ? activeWorkspace.item.name : activeWorkspace.item.title}
                              onChange={(e) => {
                                const title = e.target.value;
                                setActiveWorkspace(prev => {
                                  if (!prev) return null;
                                  const updated = { ...prev.item };
                                  if (prev.type === "product") updated.name = title; else updated.title = title;
                                  return { ...prev, item: updated };
                                });
                                if (activeWorkspace.type === "product") {
                                  setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, name: title } : p));
                                } else {
                                  setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, title } : c));
                                }
                              }}
                            />
                          </Field>

                          <Field label="Pricing (₹, 0 = Free)">
                            <Input
                              type="number"
                              value={activeWorkspace.item.price}
                              onChange={(e) => {
                                const price = Number(e.target.value);
                                setActiveWorkspace(prev => {
                                  if (!prev) return null;
                                  const updated = { ...prev.item, price, free: price === 0 };
                                  return { ...prev, item: updated };
                                });
                                if (activeWorkspace.type === "product") {
                                  setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, price, free: price === 0 } : p));
                                } else {
                                  setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, price, free: price === 0 } : c));
                                }
                              }}
                              className="font-mono"
                            />
                          </Field>
                        </div>

                        {activeWorkspace.type === "product" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Original Price ₹ (strike-through, optional)">
                              <Input
                                type="number"
                                value={activeWorkspace.item.originalPrice ?? ""}
                                onChange={(e) => updateActiveProduct({ originalPrice: e.target.value ? Number(e.target.value) : undefined })}
                                className="font-mono"
                              />
                            </Field>
                            <Field label="Discount %" hint={getDiscountPercent(activeWorkspace.item.price, activeWorkspace.item.originalPrice) != null ? undefined : "Set an original price to auto-compute this"}>
                              <div className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs font-mono font-bold flex items-center justify-center h-[38px]">
                                {getDiscountPercent(activeWorkspace.item.price, activeWorkspace.item.originalPrice) != null ? (
                                  <span className="text-[#25D366]">-{getDiscountPercent(activeWorkspace.item.price, activeWorkspace.item.originalPrice)}%</span>
                                ) : (
                                  <span className="text-zinc-600">—</span>
                                )}
                              </div>
                            </Field>
                          </div>
                        )}

                        {activeWorkspace.type === "product" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Rating (0-5, optional)">
                              <Input
                                type="number"
                                min={0}
                                max={5}
                                step={0.5}
                                value={activeWorkspace.item.rating ?? ""}
                                onChange={(e) => updateActiveProduct({ rating: e.target.value ? Math.max(0, Math.min(5, Number(e.target.value))) : undefined })}
                                className="font-mono"
                              />
                            </Field>
                            <Field label="Review count (optional)">
                              <Input
                                type="number"
                                min={0}
                                value={activeWorkspace.item.reviewCount ?? ""}
                                onChange={(e) => updateActiveProduct({ reviewCount: e.target.value ? Number(e.target.value) : undefined })}
                                className="font-mono"
                              />
                            </Field>
                          </div>
                        )}

                        {activeWorkspace.type === "product" && (
                          <Field label="Categories (select one or more)">
                            <div className="flex flex-wrap gap-1.5">
                              {productCategories.map((cat) => {
                                const selected = getProductCategories(activeWorkspace.item as Product);
                                const on = selected.includes(cat.id);
                                return (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                      const next = on ? selected.filter(id => id !== cat.id) : [...selected, cat.id];
                                      updateActiveProduct({ categories: next, category: next[0] || "" });
                                    }}
                                    className={`rounded-full px-3 py-1 text-[11px] font-bold cursor-pointer transition-colors border ${
                                      on ? "bg-[#E50914]/20 border-[#E50914] text-[#E50914]" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                                    }`}
                                  >
                                    {on ? "✓ " : ""}{cat.label}
                                  </button>
                                );
                              })}
                              {productCategories.length === 0 && <span className="text-zinc-600 text-xs">Add a category in the Store Catalog Categories panel first.</span>}
                            </div>
                          </Field>
                        )}

                        <Field label="Tagline">
                          <Input
                            value={activeWorkspace.item.tagline || ""}
                            onChange={(e) => {
                              const tagline = e.target.value;
                              setActiveWorkspace(prev => {
                                if (!prev) return null;
                                return { ...prev, item: { ...prev.item, tagline } };
                              });
                              if (activeWorkspace.type === "product") {
                                setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, tagline } : p));
                              } else {
                                setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, tagline } : c));
                              }
                            }}
                          />
                        </Field>

                        {/* File field delivered in My Library */}
                        <div className="pt-2">
                          <FileField
                            label={activeWorkspace.type === "product" ? "Product File Link / Document" : "Academy Link / Playlist Link"}
                            hint="Drop a file, upload, or paste Google Drive / course hosting link"
                            value={activeWorkspace.type === "product" ? activeWorkspace.item.downloadUrl : activeWorkspace.item.accessUrl}
                            onChange={(url) => {
                              setActiveWorkspace(prev => {
                                if (!prev) return null;
                                const updated = { ...prev.item };
                                if (prev.type === "product") updated.downloadUrl = url; else updated.accessUrl = url;
                                return { ...prev, item: updated };
                              });
                              if (activeWorkspace.type === "product") {
                                setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, downloadUrl: url } : p));
                              } else {
                                setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, accessUrl: url } : c));
                              }
                            }}
                          />
                        </div>
                      </div>
                    </Card>

                    {/* Markdown description and video preview URL */}
                    <Card>
                      <CardHeader title="Description & Video Preview" />
                      <div className="space-y-4">
                        <Field label="Video Preview Link (Optional)">
                          <Input
                            value={activeWorkspace.item.previewVideo || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setActiveWorkspace(prev => prev ? { ...prev, item: { ...prev.item, previewVideo: val } } : null);
                              if (activeWorkspace.type === "product") {
                                setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, previewVideo: val } : p));
                              } else {
                                setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, previewVideo: val } : c));
                              }
                            }}
                            placeholder="YouTube watch link or Instagram reels url"
                            className="font-mono"
                          />
                        </Field>

                        <Field label="Markdown description (Detail page)">
                          <Textarea
                            value={activeWorkspace.item.description || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setActiveWorkspace(prev => prev ? { ...prev, item: { ...prev.item, description: val } } : null);
                              if (activeWorkspace.type === "product") {
                                setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, description: val } : p));
                              } else {
                                setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, description: val } : c));
                              }
                            }}
                            rows={6}
                            placeholder="## What you learn..."
                            className="font-mono"
                          />
                        </Field>
                      </div>
                    </Card>

                    {/* FAQ Pair configuration */}
                    <Card>
                      <CardHeader
                        title="Frequently Asked Questions"
                        action={
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Plus size={12} />}
                            onClick={() => {
                              const currentFaq = activeWorkspace.item.faq || [];
                              const nextFaq = [...currentFaq, { q: "", a: "" }];
                              setActiveWorkspace(prev => prev ? { ...prev, item: { ...prev.item, faq: nextFaq } } : null);
                              if (activeWorkspace.type === "product") {
                                setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, faq: nextFaq } : p));
                              } else {
                                setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, faq: nextFaq } : c));
                              }
                            }}
                          >
                            Add FAQ
                          </Button>
                        }
                      />

                      {(!activeWorkspace.item.faq || activeWorkspace.item.faq.length === 0) ? (
                        <EmptyState title="No FAQs configured" description="Add a question and answer pair students see on the detail page." />
                      ) : (
                        <div className="space-y-3.5">
                          {(activeWorkspace.item.faq || []).map((faqRow: any, i: number) => (
                            <div key={i} className="bg-zinc-900/30 border border-white/5 p-4 rounded-xl space-y-2.5 relative">
                              <button
                                onClick={() => {
                                  const currentFaq = activeWorkspace.item.faq || [];
                                  const nextFaq = currentFaq.filter((_: any, idx: number) => idx !== i);
                                  setActiveWorkspace(prev => prev ? { ...prev, item: { ...prev.item, faq: nextFaq } } : null);
                                  if (activeWorkspace.type === "product") {
                                    setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, faq: nextFaq } : p));
                                  } else {
                                    setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, faq: nextFaq } : c));
                                  }
                                }}
                                className="absolute top-2.5 right-2.5 p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>

                              <div className="pr-6 space-y-2">
                                <Input
                                  value={faqRow.q}
                                  placeholder="Question"
                                  onChange={(e) => {
                                    const currentFaq = [...(activeWorkspace.item.faq || [])];
                                    currentFaq[i] = { ...currentFaq[i], q: e.target.value };
                                    setActiveWorkspace(prev => prev ? { ...prev, item: { ...prev.item, faq: currentFaq } } : null);
                                    if (activeWorkspace.type === "product") {
                                      setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, faq: currentFaq } : p));
                                    } else {
                                      setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, faq: currentFaq } : c));
                                    }
                                  }}
                                  className="font-semibold"
                                />
                                <Textarea
                                  value={faqRow.a}
                                  placeholder="Answer"
                                  rows={2}
                                  onChange={(e) => {
                                    const currentFaq = [...(activeWorkspace.item.faq || [])];
                                    currentFaq[i] = { ...currentFaq[i], a: e.target.value };
                                    setActiveWorkspace(prev => prev ? { ...prev, item: { ...prev.item, faq: currentFaq } } : null);
                                    if (activeWorkspace.type === "product") {
                                      setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, faq: currentFaq } : p));
                                    } else {
                                      setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, faq: currentFaq } : c));
                                    }
                                  }}
                                  className="text-zinc-300 font-light"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* Right asset sidebar column */}
                  <div className="space-y-5">

                    {/* Primary Listing Thumbnail */}
                    <Card>
                      <CardHeader title="Main Media Asset" />
                      <ImageField
                        label="PRIMARY COVER/THUMBNAIL"
                        aspect={activeWorkspace.type === "product" ? "square" : "video"}
                        value={activeWorkspace.type === "product" ? activeWorkspace.item.image : activeWorkspace.item.thumbnail}
                        onChange={(url) => {
                          setActiveWorkspace(prev => {
                            if (!prev) return null;
                            const updated = { ...prev.item };
                            if (prev.type === "product") updated.image = url; else updated.thumbnail = url;
                            return { ...prev, item: updated };
                          });
                          if (activeWorkspace.type === "product") {
                            setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, image: url } : p));
                          } else {
                            setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, thumbnail: url } : c));
                          }
                        }}
                      />
                    </Card>

                    {/* Screenshot Gallery */}
                    <Card>
                      <CardHeader
                        title="Screenshot Gallery"
                        action={
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Plus size={12} />}
                            onClick={() => {
                              const currentGal = activeWorkspace.item.gallery || [];
                              const nextGal = [...currentGal, ""];
                              setActiveWorkspace(prev => prev ? { ...prev, item: { ...prev.item, gallery: nextGal } } : null);
                              if (activeWorkspace.type === "product") {
                                setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, gallery: nextGal } : p));
                              } else {
                                setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, gallery: nextGal } : c));
                              }
                            }}
                          >
                            Add Shot
                          </Button>
                        }
                      />

                      {(!activeWorkspace.item.gallery || activeWorkspace.item.gallery.length === 0) ? (
                        <EmptyState title="No gallery items" description="Add screenshots to show off details on the item page." />
                      ) : (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                          {(activeWorkspace.item.gallery || []).map((galUrl: string, idx: number) => (
                            <div key={idx} className="bg-zinc-900/40 border border-white/5 p-3 rounded-xl relative">
                              <button
                                onClick={() => {
                                  const currentGal = activeWorkspace.item.gallery || [];
                                  const nextGal = currentGal.filter((_: any, j: number) => j !== idx);
                                  setActiveWorkspace(prev => prev ? { ...prev, item: { ...prev.item, gallery: nextGal } } : null);
                                  if (activeWorkspace.type === "product") {
                                    setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, gallery: nextGal } : p));
                                  } else {
                                    setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, gallery: nextGal } : c));
                                  }
                                }}
                                className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-red-400 bg-black/40 hover:bg-red-500/10 rounded-md transition-all z-20 cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>

                              <ImageField
                                label={`GALLERY SCREENSHOT ${idx + 1}`}
                                aspect="any"
                                value={galUrl}
                                onChange={(url) => {
                                  const currentGal = [...(activeWorkspace.item.gallery || [])];
                                  currentGal[idx] = url;
                                  setActiveWorkspace(prev => prev ? { ...prev, item: { ...prev.item, gallery: currentGal } } : null);
                                  if (activeWorkspace.type === "product") {
                                    setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, gallery: currentGal } : p));
                                  } else {
                                    setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, gallery: currentGal } : c));
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    {/* Listing Status and visibility controls */}
                    <Card>
                      <CardHeader title="Visibility Settings" />
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-xs font-semibold">Active Listing</div>
                            <div className="text-[10px] text-zinc-500 font-light mt-0.5">Toggle visibility on the main catalog</div>
                          </div>
                          <Toggle
                            value={activeWorkspace.item.enabled}
                            onChange={(v) => {
                              setActiveWorkspace(prev => prev ? { ...prev, item: { ...prev.item, enabled: v } } : null);
                              if (activeWorkspace.type === "product") {
                                setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, enabled: v } : p));
                              } else {
                                setStoreCourses(storeCourses.map(c => c.id === activeWorkspace.id ? { ...c, enabled: v } : c));
                              }
                            }}
                          />
                        </div>

                        {activeWorkspace.type === "product" && (
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="text-xs font-semibold">Featured Carousel</div>
                              <div className="text-[10px] text-zinc-500 font-light mt-0.5">Pins product to top homepage carousel</div>
                            </div>
                            <Toggle
                              value={!!activeWorkspace.item.featured}
                              onChange={(v) => {
                                setActiveWorkspace(prev => prev ? { ...prev, item: { ...prev.item, featured: v } } : null);
                                setStoreProducts(storeProducts.map(p => p.id === activeWorkspace.id ? { ...p, featured: v } : p));
                              }}
                            />
                          </div>
                        )}

                        {activeWorkspace.type === "product" && (
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <Pin size={13} className="text-amber-400" />
                              <div className="text-xs font-semibold">Pinned</div>
                            </div>
                            <Toggle value={!!activeWorkspace.item.pinned} onChange={(v) => updateActiveProduct({ pinned: v })} />
                          </div>
                        )}

                        {activeWorkspace.type === "product" && (
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <Star size={13} className="text-amber-400" />
                              <div className="text-xs font-semibold">Best Seller Badge</div>
                            </div>
                            <Toggle value={!!activeWorkspace.item.bestSeller} onChange={(v) => updateActiveProduct({ bestSeller: v })} />
                          </div>
                        )}

                        {activeWorkspace.type === "product" && (
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <Sparkles size={13} className="text-blue-400" />
                              <div className="text-xs font-semibold">New Badge</div>
                            </div>
                            <Toggle value={!!activeWorkspace.item.isNew} onChange={(v) => updateActiveProduct({ isNew: v })} />
                          </div>
                        )}

                        {activeWorkspace.type === "product" && (
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <Flame size={13} className="text-orange-400" />
                              <div className="text-xs font-semibold">Trending Badge</div>
                            </div>
                            <Toggle value={!!activeWorkspace.item.trending} onChange={(v) => updateActiveProduct({ trending: v })} />
                          </div>
                        )}
                      </div>
                    </Card>

                  </div>
                </div>
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

              {/* 1. OVERVIEW DASHBOARD */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div>
                    <Badge toneKey="danger" dot><Sparkles size={9} /> Live Creative Business Dashboard</Badge>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-3">Channel Performance Workspace</h1>
                    <p className="text-xs text-zinc-500 mt-1.5 font-light max-w-2xl">Monitor, adjust, and edit your digital shop assets and course academy pipelines in a high-density, centralized interface.</p>
                  </div>

                  {/* Channel stats row */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
                    {[
                      { label: "Total Revenue", count: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: <DollarSign size={18} />, color: "text-[#25D366]" },
                      { label: "Academy Courses", count: totalCourses, icon: <BookOpen size={18} />, color: "text-amber-400" },
                      { label: "Digital Products", count: totalProducts, icon: <FolderEdit size={18} />, color: "text-emerald-400" },
                      { label: "Portfolio Videos", count: totalVideos, icon: <ExternalLink size={18} />, color: "text-blue-400" },
                      { label: "Active Visibilities", count: activeVisibilityCount, icon: <Eye size={18} />, color: "text-purple-400" },
                    ].map((st, idx) => (
                      <Card key={idx} hoverable className="!p-4 sm:!p-5 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight text-white mb-1 truncate">
                            {st.count}
                          </div>
                          <span className="text-[11px] text-zinc-500 font-light">{st.label}</span>
                        </div>
                        <span className={`${st.color} bg-white/[0.03] p-2.5 rounded-xl shrink-0`}>{st.icon}</span>
                      </Card>
                    ))}
                  </div>

                  {/* Dynamic Revenue Trends & Product Analytics Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                    {/* Left: Revenue Trends */}
                    <Card>
                      <div className="mb-4">
                        <h2 className="text-sm font-semibold text-zinc-300">Revenue Growth Trends</h2>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Real-time dynamic store revenue timeline based on purchases and manual grants</p>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#25D366" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#25D366" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                            <XAxis dataKey="date" stroke="#444" fontSize={10} tickLine={false} />
                            <YAxis stroke="#444" fontSize={10} tickLine={false} />
                            <Tooltip
                              contentStyle={{ background: "#0d0d0d", borderColor: "#333", borderRadius: 10 }}
                              labelStyle={{ color: "#888", fontSize: 11 }}
                              itemStyle={{ color: "#fff", fontSize: 12 }}
                            />
                            <Area type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#25D366" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    {/* Right: Product Popularity and Sales */}
                    <Card>
                      <div className="mb-4">
                        <h2 className="text-sm font-semibold text-zinc-300">Product Analytics</h2>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Individual asset performance, claims, sales quantities and active revenue contributions</p>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={productChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                            <XAxis dataKey="name" stroke="#444" fontSize={9} tickLine={false} tickFormatter={(v) => v.length > 12 ? `${v.substring(0, 10)}...` : v} />
                            <YAxis stroke="#444" fontSize={10} tickLine={false} />
                            <Tooltip
                              contentStyle={{ background: "#0d0d0d", borderColor: "#333", borderRadius: 10 }}
                              labelStyle={{ color: "#888", fontSize: 11 }}
                              itemStyle={{ color: "#fff", fontSize: 12 }}
                            />
                            <Bar dataKey="sales" name="Sales (Qty)" fill="#e63027" radius={[4, 4, 0, 0]}>
                              {productChartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#E50914" : "#f87171"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>

                  {/* Navigation shortcuts strip */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Card>
                      <h2 className="text-sm font-semibold tracking-wide text-zinc-300 mb-4">Quick Content Shortcuts</h2>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setActiveTab("products")} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl text-left hover:border-[#E50914]/50 hover:bg-white/[0.04] transition-all cursor-pointer group">
                          <FolderEdit size={20} className="text-[#E50914] mb-2 group-hover:scale-110 transition-transform" />
                          <div className="text-xs font-semibold">Store Catalog</div>
                          <div className="text-[10px] text-zinc-500 font-light mt-0.5">Manage products and categories</div>
                        </button>
                        <button onClick={() => setActiveTab("courses")} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl text-left hover:border-amber-400/50 hover:bg-white/[0.04] transition-all cursor-pointer group">
                          <BookOpen size={20} className="text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                          <div className="text-xs font-semibold">Academy Library</div>
                          <div className="text-[10px] text-zinc-500 font-light mt-0.5">Edit courses and student guides</div>
                        </button>
                      </div>
                    </Card>

                    <Card>
                      <h2 className="text-sm font-semibold tracking-wide text-zinc-300 mb-4">System Visibility Options</h2>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setActiveTab("pages")} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl text-left hover:border-purple-400/50 hover:bg-white/[0.04] transition-all cursor-pointer group">
                          <Eye size={20} className="text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                          <div className="text-xs font-semibold">Page Visibility</div>
                          <div className="text-[10px] text-zinc-500 font-light mt-0.5">Toggle live/draft site pages</div>
                        </button>
                        <button onClick={() => setActiveTab("comments")} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl text-left hover:border-rose-400/50 hover:bg-white/[0.04] transition-all cursor-pointer group">
                          <MessageSquare size={20} className="text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
                          <div className="text-xs font-semibold">Discussion Board</div>
                          <div className="text-[10px] text-zinc-500 font-light mt-0.5">Moderate customer public Q&amp;As</div>
                        </button>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* 2. PRODUCTS MASTER LIST */}
              {activeTab === "products" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">Store Catalog</h1>
                      <p className="text-xs text-zinc-500 font-light mt-0.5 max-w-xl">Add, reorder, or edit individual digital products. Click any item to launch its detailed analytics, sales records, and FAQ configurations.</p>
                    </div>
                    <Button
                      variant="success"
                      icon={<Plus size={14} />}
                      className="shrink-0"
                      onClick={() => {
                        const newProd: Product = {
                          id: `product-${Date.now()}`,
                          name: "New Asset Pack",
                          tagline: "High-quality premium editor presets",
                          price: 499,
                          image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500",
                          category: productCategories[0]?.id || "presets",
                          categories: productCategories[0] ? [productCategories[0].id] : [],
                          free: false,
                          downloadUrl: "",
                          pinned: false,
                          enabled: false,
                        };
                        const nextProds = [newProd, ...storeProducts];
                        setStoreProducts(nextProds);
                        handleSave(nextProds);
                      }}
                    >
                      Add Product
                    </Button>
                  </div>

                  {/* High Density Store Categories Setup */}
                  <Card>
                    <CardHeader
                      title="Store Catalog Categories"
                      action={
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Plus size={11} />}
                          onClick={() => {
                            const label = window.prompt("Enter new category name:");
                            if (!label?.trim()) return;
                            const nextCats = [...productCategories, { id: label.toLowerCase().trim().replace(/\s+/g, "-"), label: label.trim(), enabled: true }];
                            setProductCategories(nextCats);
                          }}
                        >
                          Add Category
                        </Button>
                      }
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {productCategories.map((cat) => (
                        <div key={cat.id} className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold font-mono tracking-wider text-zinc-300">{cat.label}</span>
                          <button
                            onClick={async () => {
                              if (await confirmDialog({ title: `Delete category "${cat.label}"?`, danger: true, confirmLabel: "Delete" })) {
                                setProductCategories(productCategories.filter(c => c.id !== cat.id));
                              }
                            }}
                            className="p-1 text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {productCategories.length === 0 && (
                      <EmptyState title="No categories yet" description="Add a category to organize your products." />
                    )}
                  </Card>

                  {/* Category filter tabs */}
                  <div className="flex flex-wrap items-center gap-2">
                    {[{ id: "all", label: "All" }, ...productCategories].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setProductFilterCat(cat.id)}
                        className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold cursor-pointer transition-colors border ${
                          productFilterCat === cat.id ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                    {productFilterCat !== "all" && (
                      <span className="text-zinc-600 text-[11px]">Switch to "All" to drag-and-drop reorder.</span>
                    )}
                  </div>

                  {/* Grid layout of high-density product cards (draggable to reorder while viewing "All") */}
                  {(() => {
                    const visibleProducts = productFilterCat === "all"
                      ? storeProducts
                      : storeProducts.filter(p => getProductCategories(p).includes(productFilterCat));

                    const renderProductCard = (p: Product, dragHandle?: ReactNode) => {
                      const discountPercent = getDiscountPercent(p.price, p.originalPrice);
                      return (
                        <Card hoverable className="!p-4 flex flex-col justify-between group">
                          <div>
                            {/* Square Thumbnail Preview */}
                            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/5 mb-3.5">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                <Badge toneKey={p.enabled ? "success" : "neutral"}>{p.enabled ? "Live" : "Draft"}</Badge>
                                {discountPercent != null && <Badge toneKey="danger">-{discountPercent}%</Badge>}
                              </div>
                              <div className="absolute top-2 left-2 flex items-center gap-1">
                                {dragHandle}
                                {p.pinned && (
                                  <span className="w-6 h-6 flex items-center justify-center bg-black/60 text-amber-400 rounded-lg" title="Pinned">
                                    <Pin size={12} />
                                  </span>
                                )}
                              </div>
                              <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                                {p.bestSeller && <Badge toneKey="amber">Best Seller</Badge>}
                                {p.isNew && <Badge toneKey="info">New</Badge>}
                                {p.trending && <Badge toneKey="danger"><Flame size={9} /> Trending</Badge>}
                              </div>
                            </div>

                            <h3 className="font-semibold text-xs tracking-wide text-white group-hover:text-[#E50914] transition-colors line-clamp-1">
                              {p.name}
                            </h3>
                            {typeof p.rating === "number" && p.rating > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <Star size={11} fill="#facc15" className="text-yellow-400" />
                                <span className="text-[10px] text-zinc-400 font-semibold">{p.rating.toFixed(1)}</span>
                                {!!p.reviewCount && <span className="text-[10px] text-zinc-600">({p.reviewCount})</span>}
                              </div>
                            )}
                            <p className="text-[10px] text-zinc-500 font-light mt-1 line-clamp-2 h-7 leading-relaxed">
                              {p.tagline || "No description tagline provided."}
                            </p>
                          </div>

                          <div className="border-t border-white/[0.04] mt-3.5 pt-3 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-zinc-300 font-mono flex items-center gap-1.5">
                              {p.price === 0 ? "FREE" : `₹${p.price}`}
                              {p.originalPrice ? <span className="text-zinc-600 font-normal line-through">₹{p.originalPrice}</span> : null}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  if (await confirmDialog({ title: `Delete "${p.name}"?`, description: "This removes it from the store permanently.", danger: true, confirmLabel: "Delete" })) {
                                    const next = storeProducts.filter(x => x.id !== p.id);
                                    setStoreProducts(next);
                                    handleSave(next);
                                  }
                                }}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 size={13} />
                              </button>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => setActiveWorkspace({ id: p.id, type: "product", item: p, workspaceTab: "details" })}
                              >
                                Edit Details <ChevronRight size={11} />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    };

                    return productFilterCat === "all" ? (
                      <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleProductDragEnd}>
                        <SortableContext items={storeProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {storeProducts.map((p) => (
                              <SortableProductCard key={p.id} id={p.id}>
                                {(drag) => renderProductCard(
                                  p,
                                  <button
                                    ref={drag.setActivatorNodeRef}
                                    {...drag.attributes}
                                    {...drag.listeners}
                                    className="w-6 h-6 flex items-center justify-center bg-black/60 text-zinc-300 hover:text-white rounded-lg cursor-grab active:cursor-grabbing touch-none"
                                    title="Drag to reorder"
                                  >
                                    <GripVertical size={12} />
                                  </button>
                                )}
                              </SortableProductCard>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {visibleProducts.map((p) => <div key={p.id}>{renderProductCard(p)}</div>)}
                      </div>
                    );
                  })()}

                  {storeProducts.length === 0 && (
                    <EmptyState
                      icon={<FolderEdit size={32} />}
                      title="No products yet"
                      description="Your digital store shelf is empty — add your first product to start selling."
                    />
                  )}

                </div>
              )}

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
                <Card>
                  <AdminUsersPanel />
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
                <Card>
                  <AdminPagesPanel />
                </Card>
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
                        const nextProj = {
                          id: Date.now(),
                          category: categories[0]?.id || "personal_branding",
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

                  {/* Portfolio Video List Container */}
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

                    <div className="space-y-3">
                      {projects.map((proj) => (
                        <div key={proj.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/10 transition-colors">
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

                          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap">
                            <select
                              value={proj.category}
                              onChange={(e) => {
                                const val = e.target.value;
                                const next = projects.map(p => p.id === proj.id ? { ...p, category: val } : p);
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
                      ))}
                    </div>
                    {projects.length === 0 && (
                      <EmptyState title="No portfolio videos yet" description="Add a video to showcase it on the homepage." />
                    )}
                  </Card>
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
