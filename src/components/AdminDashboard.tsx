import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Zap } from "lucide-react";
import type { Course, Product } from "../lib/store";
import { netAfterFees } from "../lib/store";
import { ago, groupAttempts, useCheckoutEvents } from "../lib/checkoutEvents";

type Analytics = Record<string, { impressions: number; views: number; uniqueViewers: number; revisits: number }>;
type Range = "month" | "7d" | "all";

const rs = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const toMs = (v: any) => (v?.toDate ? v.toDate().getTime() : v ? new Date(v).getTime() : 0);

// Owner dashboard: real profit, who pays, what to fix next, top products
// with their pictures, alerts and live activity — readable at a glance.
export function AdminDashboard({ products, courses, users, analytics, onGo, onOpenProduct }: {
  products: Product[];
  courses: Course[];
  users: any[];
  analytics: Analytics;
  onGo: (tab: string) => void;
  onOpenProduct: (p: Product) => void;
}) {
  const [range, setRange] = useState<Range>("month");
  const { events, blocked } = useCheckoutEvents(200);

  const items = useMemo(() => {
    const m = new Map<string, { id: string; name: string; img: string; price: number; enabled: boolean; product?: Product }>();
    products.forEach(p => m.set(p.id, { id: p.id, name: p.name, img: p.image, price: p.price, enabled: p.enabled, product: p }));
    courses.forEach(c => m.set(c.id, { id: c.id, name: c.title, img: c.thumbnail, price: c.price, enabled: c.enabled }));
    return m;
  }, [products, courses]);

  const now = Date.now();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const startPrevMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getTime();
  const from = range === "month" ? startOfMonth : range === "7d" ? now - 7 * 86400000 : 0;
  const prevFrom = range === "month" ? startPrevMonth : range === "7d" ? now - 14 * 86400000 : 0;

  const stats = useMemo(() => {
    const payments = users.flatMap(u => (u.payments || []).map((p: any) => ({ ...p, uid: u.uid, name: u.name, email: u.email, t: toMs(p.at || p.purchasedAt), rupees: (p.amount || 0) / 100 })));
    const inRange = payments.filter(p => p.t >= from);
    const prev = payments.filter(p => p.t >= prevFrom && p.t < from);
    const revenue = inRange.reduce((s, p) => s + p.rupees, 0);
    const prevRevenue = prev.reduce((s, p) => s + p.rupees, 0);
    const profit = netAfterFees(revenue);
    const prevProfit = netAfterFees(prevRevenue);
    const paidUsers = users.filter(u => (u.payments || []).length > 0);
    const freeOnly = users.filter(u => !(u.payments || []).length && (u.purchases || []).length > 0);
    const never = users.filter(u => !(u.purchases || []).length);
    const newPaid = paidUsers.filter(u => (u.payments || []).some((p: any) => toMs(p.at) >= from)).length;

    // per item: views (analytics) vs buys (paid) vs free claims, profit in range
    const per = new Map<string, { buys: number; free: number; rev: number }>();
    users.forEach(u => {
      const paidIds = new Set((u.payments || []).map((p: any) => p.itemId));
      (u.purchases || []).forEach((id: string) => { if (!paidIds.has(id)) { const r = per.get(id) || { buys: 0, free: 0, rev: 0 }; r.free++; per.set(id, r); } });
    });
    payments.forEach(p => { const r = per.get(p.itemId) || { buys: 0, free: 0, rev: 0 }; r.buys++; if (p.t >= from) r.rev += p.rupees; per.set(p.itemId, r); });

    return { revenue, profit, prevProfit, fee: revenue - profit, paidUsers: paidUsers.length, freeOnly: freeOnly.length, never: never.length, newPaid, per, recent: payments.sort((a, b) => b.t - a.t).slice(0, 8) };
  }, [users, from, prevFrom]);

  const change = stats.prevProfit > 0 ? Math.round(((stats.profit - stats.prevProfit) / stats.prevProfit) * 100) : null;
  const conv = stats.paidUsers + stats.freeOnly > 0 ? ((stats.paidUsers / (stats.paidUsers + stats.freeOnly)) * 100).toFixed(1) : "0";

  // ── Focus cards (what to do next)
  const rows = [...items.values()].map(it => {
    const a = analytics[it.id] || { views: 0, uniqueViewers: 0 } as any;
    const r = stats.per.get(it.id) || { buys: 0, free: 0, rev: 0 };
    return { ...it, views: a.uniqueViewers || a.views || 0, ...r };
  });
  const paidRows = rows.filter(r => r.price > 0 && r.enabled);
  const focus: { it: (typeof rows)[number]; title: string; tip: string; tag: string; tone: string }[] = [];
  const weak = paidRows.filter(r => r.views >= 50).sort((a, b) => a.buys / Math.max(1, a.views) - b.buys / Math.max(1, b.views))[0];
  if (weak) focus.push({ it: weak, title: `${weak.views} views but only ${weak.buys} buys`, tip: "Try a lower price or a better preview video", tag: "FIX PAGE", tone: "bg-[#FF7A1A]/15 text-[#FF7A1A]" });
  const freeStar = rows.filter(r => r.price === 0).sort((a, b) => b.free - a.free)[0];
  if (freeStar && freeStar.free > 0) focus.push({ it: freeStar, title: `${freeStar.free.toLocaleString("en-IN")} free downloads`, tip: "Email these people a paid upgrade", tag: "UPSELL", tone: "bg-sky-500/15 text-sky-400" });
  const best = [...paidRows].sort((a, b) => b.rev - a.rev)[0];
  if (best && best.rev > 0) focus.push({ it: best, title: `Top earner · ${rs(netAfterFees(best.rev))}`, tip: "Make a bundle with it", tag: "DOUBLE DOWN", tone: "bg-[#25D366]/15 text-[#25D366]" });
  const noViews = paidRows.filter(r => r.views < 5)[0];
  if (noViews) focus.push({ it: noViews, title: "Almost nobody has seen this", tip: "Share it on Instagram / YouTube description", tag: "PROMOTE", tone: "bg-purple-500/15 text-purple-300" });
  const draft = rows.find(r => !r.enabled);
  if (draft) focus.push({ it: draft, title: "Hidden from the shop", tip: "Still a draft — put it live?", tag: "HIDDEN", tone: "bg-red-500/15 text-red-400" });

  const top = [...rows].sort((a, b) => (b.rev - a.rev) || (b.free - a.free)).slice(0, 6);
  const maxViews = Math.max(1, ...top.map(t => t.views));

  const problems = groupAttempts(events).filter(a =>
    a.steps.some(s => ["verify_failed", "payment_failed", "order_failed"].includes(s.stage)) && !a.steps.some(s => s.stage === "paid")
  ).slice(0, 3);
  const cancelledToday = groupAttempts(events).filter(a => a.last.stage === "dismissed" && now - new Date(a.last.at).getTime() < 86400000);

  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">{hello}, Janish 👋</h1>
          <p className="text-xs text-zinc-500 mt-1">{range === "month" ? new Date().toLocaleString("en-IN", { month: "long" }) + " so far" : range === "7d" ? "Last 7 days" : "All time"} · live data</p>
        </div>
        <div className="flex gap-1.5">
          {([["month", "This month"], ["7d", "Last 7 days"], ["all", "All time"]] as [Range, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setRange(k)} className={`h-9 px-3.5 rounded-full text-xs font-bold border cursor-pointer ${range === k ? "bg-white text-black border-white" : "border-white/10 text-zinc-400"}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#25D366]/35 bg-[#25D366]/[0.05] p-4">
          <div className="text-xs text-zinc-400 font-semibold">Real profit <span className="text-zinc-600">(after Razorpay fee)</span></div>
          <div className="text-[28px] sm:text-[32px] font-extrabold text-[#25D366] tracking-tight mt-1">{rs(stats.profit)}</div>
          {change !== null && range !== "all" && (
            <div className={`text-xs font-bold flex items-center gap-1 ${change >= 0 ? "text-[#25D366]" : "text-red-400"}`}>
              {change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(change)}% vs {range === "month" ? "last month" : "previous 7 days"}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#131313] p-4">
          <div className="text-xs text-zinc-400 font-semibold">Money received</div>
          <div className="text-[28px] font-extrabold tracking-tight mt-1">{rs(stats.revenue)}</div>
          <div className="text-xs text-zinc-500">Razorpay fee {rs(stats.fee)}</div>
        </div>
        <button onClick={() => onGo("users")} className="text-left rounded-2xl border border-white/[0.08] bg-[#131313] p-4 hover:border-white/20 cursor-pointer">
          <div className="text-xs text-zinc-400 font-semibold">Paid customers</div>
          <div className="text-[28px] font-extrabold tracking-tight mt-1">{stats.paidUsers}</div>
          <div className="text-xs text-[#25D366] font-bold">+{stats.newPaid} {range === "all" ? "total" : "new"}</div>
        </button>
        <button onClick={() => onGo("users")} className="text-left rounded-2xl border border-white/[0.08] bg-[#131313] p-4 hover:border-white/20 cursor-pointer">
          <div className="text-xs text-zinc-400 font-semibold">Free-only users</div>
          <div className="text-[28px] font-extrabold tracking-tight mt-1">{stats.freeOnly.toLocaleString("en-IN")}</div>
          <div className="text-xs text-zinc-500">{conv}% of downloaders paid</div>
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          {/* Focus */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#131313] p-4">
            <div className="flex items-center justify-between mb-3"><b className="text-sm flex items-center gap-1.5"><Zap size={15} className="text-[#FF7A1A]" /> FOCUS HERE</b><span className="text-[11px] text-zinc-500">what to fix first</span></div>
            {focus.length === 0 && <div className="text-xs text-zinc-500">Nothing urgent 🎉</div>}
            <div className="space-y-2">
              {focus.slice(0, 4).map((f, i) => (
                <button key={i} onClick={() => f.it.product && onOpenProduct(f.it.product)} className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.06] hover:border-white/20 text-left cursor-pointer">
                  {f.it.img ? <img src={f.it.img} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" /> : <div className="w-12 h-12 rounded-lg bg-zinc-800 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <b className="block text-[13px]">{f.title}</b>
                    <span className="block text-xs text-zinc-500 truncate">{f.it.name} · {f.tip}</span>
                  </div>
                  <span className={`shrink-0 text-[10px] font-extrabold px-2 py-1 rounded-md ${f.tone}`}>{f.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Top products */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#131313] p-4">
            <div className="flex items-center justify-between mb-2"><b className="text-sm">TOP PRODUCTS</b><span className="text-[11px] text-zinc-500">views → buys · profit</span></div>
            {top.map(t => (
              <button key={t.id} onClick={() => t.product && onOpenProduct(t.product)} className="w-full grid grid-cols-[44px_1fr_auto] gap-3 items-center py-2.5 border-b border-white/[0.05] last:border-0 text-left cursor-pointer">
                {t.img ? <img src={t.img} alt="" className="w-11 h-11 rounded-lg object-cover" /> : <div className="w-11 h-11 rounded-lg bg-zinc-800" />}
                <div className="min-w-0">
                  <b className="block text-[13px] truncate">{t.name}</b>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-zinc-500">
                    <i className="block h-1.5 rounded bg-zinc-600" style={{ width: Math.max(4, (t.views / maxViews) * 110) }} />{t.views} views
                    <i className="block h-1.5 rounded bg-[#FF7A1A] ml-1.5" style={{ width: Math.max(4, ((t.buys || t.free) / maxViews) * 110) }} />{t.price ? `${t.buys} buys` : `${t.free} free`}
                  </div>
                </div>
                <div className="text-right">
                  <b className={`text-sm ${t.price ? "text-[#25D366]" : ""}`}>{t.price ? rs(netAfterFees(t.rev)) : "FREE"}</b>
                  <small className="block text-[11px] text-zinc-500">{t.price ? "profit" : `${t.free} users`}</small>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          {/* Alerts */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#131313] p-4">
            <div className="flex items-center justify-between mb-2"><b className="text-sm">🔔 ALERTS</b><button onClick={() => onGo("payments")} className="text-[11px] text-[#FF7A1A] font-bold cursor-pointer">All payments →</button></div>
            {blocked && <div className="text-xs text-amber-300">Publish the Firestore rules to see payment alerts.</div>}
            {!blocked && problems.length === 0 && cancelledToday.length === 0 && <div className="text-xs text-zinc-500">No problems right now ✓</div>}
            {problems.map(a => (
              <button key={a.key} onClick={() => onGo("payments")} className="w-full text-left flex items-start gap-2 rounded-xl border border-red-500/35 bg-red-500/[0.06] p-2.5 mb-2 text-xs cursor-pointer">
                <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <span><b>{a.steps.some(s => s.stage === "verify_failed") ? "Paid but not unlocked" : "Payment failed"}</b> · {a.email} · {a.itemName}{a.amount ? ` · ₹${a.amount}` : ""} · {ago(a.last.at)}</span>
              </button>
            ))}
            {cancelledToday.length > 0 && (
              <button onClick={() => onGo("payments")} className="w-full text-left rounded-xl border border-amber-500/35 bg-amber-500/[0.06] p-2.5 text-xs cursor-pointer">
                ⏳ <b>{cancelledToday.length} checkout{cancelledToday.length > 1 ? "s" : ""} closed without paying</b> today
              </button>
            )}
          </div>

          {/* Activity */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#131313] p-4">
            <b className="text-sm">LIVE ACTIVITY</b>
            <div className="mt-2">
              {stats.recent.length === 0 && <div className="text-xs text-zinc-500">No sales yet.</div>}
              {stats.recent.map((p, i) => {
                const it = items.get(p.itemId);
                return (
                  <div key={i} className="flex items-center gap-2.5 py-2 border-b border-white/[0.05] last:border-0 text-xs">
                    {it?.img ? <img src={it.img} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" /> : <div className="w-8 h-8 rounded-md bg-zinc-800 shrink-0" />}
                    <span className="min-w-0 truncate"><b>{(p.name || p.email || "Someone").split(" ")[0]}</b> bought {it?.name || p.itemId} <b className="text-[#25D366]">{rs(p.rupees)}</b></span>
                    <time className="ml-auto text-zinc-500 whitespace-nowrap">{p.t ? ago(new Date(p.t).toISOString()) : ""}</time>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
