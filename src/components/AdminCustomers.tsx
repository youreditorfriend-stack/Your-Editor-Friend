import { useEffect, useMemo, useState } from "react";
import { arrayRemove, arrayUnion, collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { Download, Gift, Mail, Search, X } from "lucide-react";
import { db } from "../firebase";
import { netAfterFees, useStore } from "../lib/store";
import { Button, useConfirm, useToast } from "./admin/ui";

const COL = ["#FF7A1A", "#25D366", "#5ab0ff", "#ffc35a", "#ff8fb1", "#b99cff"];
const toMs = (v: any) => (v?.toDate ? v.toDate().getTime() : v ? new Date(v).getTime() : 0);
const rs = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const day = 86400000;

type Seg = "all" | "paid" | "free" | "never" | "top" | "recent" | "inactive" | "coupon" | "bought";

// Customers: filter chips, the products each person owns (as pictures),
// paid vs profit, and a side panel to give / remove products or email them.
export function AdminCustomers({ onEmail }: { onEmail: (emails: string[]) => void }) {
  const { store } = useStore();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seg, setSeg] = useState<Seg>("all");
  const [boughtId, setBoughtId] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [giveId, setGiveId] = useState("");

  const load = async () => {
    try {
      const s = await getDocs(collection(db, "users"));
      setUsers(s.docs.map(d => ({ uid: d.id, ...d.data() })));
    } catch (e) { console.error(e); toast.error("Could not load customers"); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const items = useMemo(() => [
    ...(store?.products || []).map(p => ({ id: p.id, name: p.name, img: p.image, price: p.price })),
    ...(store?.courses || []).map(c => ({ id: c.id, name: c.title, img: c.thumbnail, price: c.price })),
  ], [store]);
  const item = (id: string) => items.find(i => i.id === id);

  const rows = useMemo(() => users.map(u => {
    const pays = (u.payments || []) as any[];
    const paid = pays.reduce((s, p) => s + (p.amount || 0) / 100, 0);
    const owned: string[] = (u.purchases || []).filter((id: string) => !id.includes("::"));
    return {
      ...u, owned, paid, profit: netAfterFees(paid), pays,
      joined: toMs(u.createdAt) || toMs(pays[0]?.at) || 0,
      last: toMs(u.lastLogin),
      coupon: pays.some(p => p.couponCode),
    };
  }), [users]);

  const now = Date.now();
  const has = (r: (typeof rows)[number], s: Seg) =>
    s === "all" ? true :
    s === "paid" ? r.paid > 0 :
    s === "free" ? r.paid === 0 && r.owned.length > 0 :
    s === "never" ? r.owned.length === 0 :
    s === "top" ? r.paid > 0 :
    s === "recent" ? r.joined > now - 30 * day :
    s === "inactive" ? r.last > 0 && r.last < now - 30 * day :
    s === "coupon" ? r.coupon :
    s === "bought" ? (!!boughtId && r.owned.includes(boughtId)) : true;

  let list = rows.filter(r => has(r, seg));
  const qq = q.trim().toLowerCase();
  if (qq) list = list.filter(r => (r.name || "").toLowerCase().includes(qq) || (r.email || "").toLowerCase().includes(qq));
  list = seg === "top" ? [...list].sort((a, b) => b.paid - a.paid) : [...list].sort((a, b) => (b.last || b.joined) - (a.last || a.joined));
  const maxPaid = Math.max(1, ...rows.map(r => r.paid));
  const cur = list.find(r => r.uid === sel) || list[0];

  const kpi = {
    paid: rows.filter(r => r.paid > 0).length,
    free: rows.filter(r => r.paid === 0 && r.owned.length > 0).length,
    never: rows.filter(r => r.owned.length === 0).length,
    avg: (() => { const p = rows.filter(r => r.paid > 0); return p.length ? p.reduce((s, r) => s + r.profit, 0) / p.length : 0; })(),
  };

  const SEGS: [Seg, string][] = [["all", "All"], ["paid", "💰 Paid"], ["free", "🎁 Free only"], ["never", "∅ Never downloaded"], ["top", "🏆 Top profit"], ["recent", "🆕 Joined 30d"], ["inactive", "😴 Inactive 30d"], ["coupon", "🏷 Used coupon"]];

  const give = async (uid: string, id: string) => {
    try { await updateDoc(doc(db, "users", uid), { purchases: arrayUnion(id) }); toast.success(`Gave “${item(id)?.name || id}”`); setGiveId(""); load(); }
    catch (e: any) { toast.error("Could not give: " + (e?.message || "")); }
  };
  const remove = async (uid: string, id: string) => {
    if (!(await confirmDialog({ title: `Remove “${item(id)?.name || id}” from this customer?`, danger: true, confirmLabel: "Remove" }))) return;
    try { await updateDoc(doc(db, "users", uid), { purchases: arrayRemove(id) }); toast.success("Removed"); load(); }
    catch (e: any) { toast.error("Could not remove: " + (e?.message || "")); }
  };
  const exportCsv = () => {
    const head = "name,email,paid,profit,products,joined,last_login\n";
    const body = list.map(r => [r.name, r.email, Math.round(r.paid), r.profit, r.owned.map((id: string) => item(id)?.name || id).join(" | "), r.joined ? new Date(r.joined).toISOString().slice(0, 10) : "", r.last ? new Date(r.last).toISOString().slice(0, 10) : ""]
      .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([head + body], { type: "text/csv" }));
    a.download = `customers-${seg}.csv`; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">Customers</h1>
          <p className="text-xs text-zinc-500 mt-1">Tap a person to see everything about them.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={exportCsv}>Export</Button>
          <Button variant="primary" size="sm" icon={<Mail size={13} />} onClick={() => onEmail(list.map(r => r.email).filter(Boolean))}>Email these {list.length}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Paid with real money", kpi.paid, ""], ["Took only free", kpi.free, ""], ["Never downloaded", kpi.never, ""], ["Avg profit / paid buyer", rs(kpi.avg), "text-[#25D366]"]].map(([l, v, c], i) => (
          <div key={i} className={`rounded-2xl border p-4 bg-[#131313] ${i === 3 ? "border-[#25D366]/35" : "border-white/[0.08]"}`}>
            <div className="text-xs text-zinc-400 font-semibold">{l}</div>
            <div className={`text-[26px] font-extrabold tracking-tight mt-1 ${c}`}>{typeof v === "number" ? v.toLocaleString("en-IN") : v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or email" className="w-full h-10 rounded-xl bg-[#131313] border border-white/10 pl-9 pr-3 text-sm outline-none focus:border-[#FF7A1A]" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {SEGS.map(([k, l]) => (
            <button key={k} onClick={() => { setSeg(k); setSel(null); }}
              className={`shrink-0 h-10 px-3 rounded-full text-xs font-bold border cursor-pointer ${seg === k ? "bg-white text-black border-white" : "border-white/10 text-zinc-400"}`}>
              {l} <span className={seg === k ? "text-zinc-500" : "text-zinc-600"}>{rows.filter(r => has(r, k)).length}</span>
            </button>
          ))}
          <select value={boughtId} onChange={e => { setBoughtId(e.target.value); setSeg(e.target.value ? "bought" : "all"); }}
            className={`shrink-0 h-10 rounded-full px-3 text-xs font-bold border cursor-pointer bg-transparent ${seg === "bought" ? "border-[#FF7A1A] text-[#FF7A1A]" : "border-white/10 text-zinc-400"}`}>
            <option value="">Bought… ▾</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <div className="rounded-2xl border border-white/[0.08] bg-[#131313] overflow-hidden">
          {loading && <div className="p-4 text-xs text-zinc-500">Loading…</div>}
          {!loading && list.length === 0 && <div className="p-6 text-sm text-zinc-500 text-center">No one here.</div>}
          {list.slice(0, 300).map((r, i) => {
            const on = cur?.uid === r.uid;
            return (
              <button key={r.uid} onClick={() => setSel(r.uid)}
                className={`w-full grid grid-cols-[40px_1fr_auto] sm:grid-cols-[40px_1fr_auto_150px] gap-3 items-center px-3.5 py-3 border-b border-white/[0.05] text-left cursor-pointer ${on ? "bg-[#FF7A1A]/[0.07]" : "hover:bg-white/[0.02]"}`}>
                {r.photo ? <img src={r.photo} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full" />
                  : <span className="w-10 h-10 rounded-full grid place-items-center font-extrabold text-black" style={{ background: COL[i % 6] }}>{(r.name || r.email || "?")[0]?.toUpperCase()}</span>}
                <span className="min-w-0">
                  <b className="block text-[13px] truncate">{r.name || "—"}</b>
                  <small className="block text-[11px] text-zinc-500 truncate">{r.email}{r.last ? ` · ${new Date(r.last).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}</small>
                </span>
                <span className="hidden sm:flex items-center">
                  {r.owned.slice(0, 4).map((id: string, k: number) => { const it = item(id); return it?.img ? <img key={id} src={it.img} alt="" title={it.name} className={`w-7 h-7 rounded-md object-cover border-2 border-[#131313] ${k ? "-ml-2" : ""}`} /> : null; })}
                  <em className="not-italic text-[11px] text-zinc-500 ml-1.5">{r.owned.length ? `${r.owned.length}` : "—"}</em>
                </span>
                <span className="text-right">
                  {r.paid > 0 ? (
                    <>
                      <span className="text-[13px] font-extrabold">{rs(r.paid)} <span className="text-[#25D366] text-xs">→ {rs(r.profit)}</span></span>
                      <span className="flex h-1.5 rounded-full bg-zinc-800 overflow-hidden mt-1"><i className="block bg-[#25D366]" style={{ width: `${(r.profit / maxPaid) * 100}%` }} /><i className="block bg-red-500" style={{ width: `${((r.paid - r.profit) / maxPaid) * 100}%` }} /></span>
                    </>
                  ) : <span className="text-xs text-zinc-500">{r.owned.length ? "free user" : "no downloads"}</span>}
                </span>
              </button>
            );
          })}
        </div>

        {cur && (
          <div className="lg:sticky lg:top-20 rounded-2xl border border-white/[0.08] bg-[#131313] p-4">
            <div className="flex items-center gap-3">
              {cur.photo ? <img src={cur.photo} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-full" /> : <span className="w-12 h-12 rounded-full bg-[#FF7A1A] text-black grid place-items-center font-extrabold text-lg">{(cur.name || cur.email || "?")[0]?.toUpperCase()}</span>}
              <div className="min-w-0"><b className="block truncate">{cur.name || "—"}</b><small className="block text-xs text-zinc-500 truncate">{cur.email}</small></div>
            </div>
            <div className="grid grid-cols-3 gap-2 my-4 text-center">
              <div className="rounded-xl bg-zinc-950 p-2.5"><b className="block">{rs(cur.paid)}</b><small className="text-[10px] text-zinc-500">paid</small></div>
              <div className="rounded-xl bg-zinc-950 p-2.5"><b className="block text-[#25D366]">{rs(cur.profit)}</b><small className="text-[10px] text-zinc-500">your profit</small></div>
              <div className="rounded-xl bg-zinc-950 p-2.5"><b className="block">{cur.owned.length}</b><small className="text-[10px] text-zinc-500">products</small></div>
            </div>
            <div className="text-[11px] font-bold tracking-wider text-zinc-500 mb-2">OWNS</div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {cur.owned.length === 0 && <span className="col-span-4 text-xs text-zinc-500">Nothing yet</span>}
              {cur.owned.map((id: string) => {
                const it = item(id); const paidFor = cur.pays.some((p: any) => p.itemId === id);
                return (
                  <div key={id} className="relative group">
                    {it?.img ? <img src={it.img} alt="" title={it?.name} className="w-full aspect-square rounded-lg object-cover" /> : <div className="w-full aspect-square rounded-lg bg-zinc-800 text-[9px] p-1">{id}</div>}
                    <small className={`text-[10px] ${paidFor ? "text-[#25D366]" : "text-zinc-500"}`}>{paidFor ? "paid" : "free/given"}</small>
                    <button onClick={() => remove(cur.uid, id)} title="Remove" className="absolute top-1 right-1 w-5 h-5 rounded bg-black/80 text-zinc-300 grid place-items-center opacity-0 group-hover:opacity-100 cursor-pointer"><X size={11} /></button>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] font-bold tracking-wider text-zinc-500 mb-2">TIMELINE</div>
            <div className="border-l-2 border-white/10 ml-1.5 pl-3.5 space-y-1.5 text-xs mb-4">
              {cur.joined > 0 && <div className="relative"><span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-[#FF7A1A]" />Joined · {new Date(cur.joined).toLocaleDateString("en-IN")}</div>}
              {cur.pays.slice(-5).map((p: any, i: number) => (
                <div key={i} className="relative"><span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-[#25D366]" />Paid ₹{Math.round((p.amount || 0) / 100)} · {item(p.itemId)?.name || p.itemId}{p.couponCode ? ` · ${p.couponCode}` : ""} <span className="text-zinc-500">{p.at ? new Date(p.at).toLocaleDateString("en-IN") : ""}</span></div>
              ))}
              {cur.last > 0 && <div className="relative"><span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-500" />Last login · {new Date(cur.last).toLocaleDateString("en-IN")}</div>}
            </div>
            <div className="flex gap-2">
              <select value={giveId} onChange={e => setGiveId(e.target.value)} className="flex-1 min-w-0 h-9 rounded-lg bg-black border border-white/15 px-2 text-xs">
                <option value="">Give a product…</option>
                {items.filter(i => !cur.owned.includes(i.id)).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <Button size="sm" variant="primary" icon={<Gift size={12} />} disabled={!giveId} onClick={() => give(cur.uid, giveId)}>Give</Button>
            </div>
            <Button size="sm" variant="secondary" className="w-full mt-2" icon={<Mail size={12} />} onClick={() => onEmail([cur.email])}>Email {(cur.name || "").split(" ")[0] || "them"}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
