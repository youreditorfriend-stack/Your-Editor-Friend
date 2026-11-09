import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Copy, Download, ExternalLink, Plus, Trash2, Upload, X } from "lucide-react";
import { useStore } from "../lib/store";
import { addTestimonial, uploadAnyFile } from "../lib/testimonials";
import {
  DEFAULT_OFFER, ORIGINAL_HERO, adminConfig, adminList, adminUpdate, priceForSlot, sortedTiers,
  useTitleCardOffer, type Batch, type Pose, type TitleCardOffer,
} from "../lib/titlecard";
import { Toggle, useToast } from "./admin/ui";

export interface EditOrder {
  id: string; slot: number; uid: string; userEmail?: string; name: string; phone: string; email?: string;
  top: string; big: string; pose: string; photos: string[]; note?: string; showOk?: boolean; shown?: boolean;
  upgrade?: boolean; paid: number; batch?: string; deliverBy?: string; status: "new" | "editing" | "delivered";
  revisionsUsed?: number; finalUrl?: string; createdAt: string; deliveredAt?: string; paymentId?: string;
}
export interface WaitItem { id: string; name: string; phone: string; email?: string; position?: number; at: string; notified?: boolean }

const SEEN_KEY = "yef-tc-seen";
const readSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; } };
const writeSeen = (ids: string[]) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-500))); } catch { /* ignore */ } };

// Short two-note chime, made in the browser (no sound file needed).
let actx: AudioContext | null = null;
export function unlockSound() {
  try { actx = actx || new (window.AudioContext || (window as any).webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); } catch { /* ignore */ }
}
export function playChime() {
  try {
    unlockSound(); if (!actx) return;
    const t = actx.currentTime;
    [[880, 0], [1320, 0.16], [1760, 0.32]].forEach(([f, d]) => {
      const o = actx!.createOscillator(), g = actx!.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.35, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.45);
      o.connect(g).connect(actx!.destination); o.start(t + d); o.stop(t + d + 0.5);
    });
    navigator.vibrate?.([120, 60, 120]);
  } catch { /* ignore */ }
}

/** Polls orders every 20s while the admin app is open; rings on every new booking. */
export function useTitleCardOrders() {
  const [orders, setOrders] = useState<EditOrder[]>([]);
  const [waitlist, setWaitlist] = useState<WaitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seen, setSeen] = useState<string[]>(readSeen);
  const known = useRef<Set<string> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await adminList();
      const list = (d.orders || []) as EditOrder[];
      if (known.current) {
        const fresh = list.filter(o => !known.current!.has(o.id));
        if (fresh.length) {
          playChime();
          if ("Notification" in window && Notification.permission === "granted") {
            fresh.forEach(o => { try { new Notification(`New booking ${o.id} · ₹${o.paid}`, { body: `${o.top} ${o.big} · ${o.name}`, icon: "/titlecard/face.jpg", tag: o.id }); } catch { /* ignore */ } });
          }
        }
      } else if (!localStorage.getItem(SEEN_KEY)) {
        // first ever open: treat existing orders as seen
        writeSeen(list.map(o => o.id)); setSeen(list.map(o => o.id));
      }
      known.current = new Set(list.map(o => o.id));
      setOrders(list); setWaitlist((d.waitlist || []) as WaitItem[]); setError("");
    } catch (e: any) { setError(e?.message || "Couldn't load orders"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 20000);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [refresh]);

  const unseen = orders.filter(o => !seen.includes(o.id)).length;
  const markSeen = (id: string) => { if (seen.includes(id)) return; const n = [...seen, id]; setSeen(n); writeSeen(n); };
  return { orders, setOrders, waitlist, setWaitlist, loading, error, refresh, unseen, seen, markSeen };
}

const PILL: Record<string, string> = {
  new: "bg-[#FF7A1A]/15 text-[#FF7A1A]", editing: "bg-sky-500/15 text-sky-400", delivered: "bg-[#3ddc84]/15 text-[#3ddc84]", wait: "bg-white/10 text-zinc-300",
};
const ago = (iso?: string) => {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} days ago`;
};
const wa = (phone: string, msg: string) => `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;

type Ctx = ReturnType<typeof useTitleCardOrders>;

export function AdminTitleCard({ data }: { data: Ctx }) {
  const toast = useToast();
  const { offer } = useTitleCardOffer();
  const { orders, setOrders, waitlist, setWaitlist, loading, error, refresh, seen, markSeen } = data;
  const [tab, setTab] = useState<"new" | "editing" | "delivered" | "wait" | "all">("new");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [soundOn, setSoundOn] = useState(() => { try { return localStorage.getItem("yef-tc-sound") === "1"; } catch { return false; } });
  const [busy, setBusy] = useState(false);

  const count = (s: string) => orders.filter(o => o.status === s).length;
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (tab === "wait") return [];
    return orders.filter(o => (tab === "all" || t || o.status === tab) && (!t || `${o.id} ${o.name} ${o.phone} ${o.big}`.toLowerCase().includes(t)));
  }, [orders, tab, q]);
  const cur = orders.find(o => o.id === openId) || null;
  const latestNew = orders.find(o => !seen.includes(o.id));

  const enableSound = async () => {
    unlockSound(); playChime();
    try { if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission(); } catch { /* ignore */ }
    setSoundOn(true); try { localStorage.setItem("yef-tc-sound", "1"); } catch { /* ignore */ }
    toast.success("Order sound is on — keep this app open");
  };
  useEffect(() => { if (soundOn) { const f = () => unlockSound(); window.addEventListener("pointerdown", f, { once: true }); return () => window.removeEventListener("pointerdown", f); } }, [soundOn]);

  const update = async (id: string, patch: Record<string, any>, msg?: string) => {
    setBusy(true);
    try {
      await adminUpdate(id, patch);
      setOrders(list => patch.delete ? list.filter(o => o.id !== id) : list.map(o => o.id === id ? { ...o, ...patch } : o));
      if (msg) toast.success(msg);
    } catch (e: any) { toast.error(e?.message || "Couldn't save"); }
    finally { setBusy(false); }
  };

  const addSlots = async () => {
    try { await adminConfig({ total: offer.total + 10 }); toast.success(`${offer.total + 10} slots now · tell the waiting list first`); setTab("wait"); }
    catch (e: any) { toast.error(e?.message || "Couldn't save"); }
  };

  const open = (o: EditOrder) => { setOpenId(o.id); markSeen(o.id); };

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">Edit orders</h1>
          <p className="text-xs text-zinc-500 mt-1">Title card · done-for-you bookings. Refreshes every 20 seconds.</p>
        </div>
        <div className="flex gap-2">
          <a href="/titlecard" target="_blank" rel="noreferrer" className="h-9 px-3 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300 flex items-center gap-1.5 hover:text-white"><ExternalLink size={14} />Page</a>
          <button onClick={() => setShowSettings(s => !s)} className="h-9 px-3 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white">{showSettings ? "Close settings" : "Settings"}</button>
        </div>
      </div>

      {!soundOn && (
        <button onClick={enableSound} className="w-full flex items-center gap-3 rounded-2xl border border-[#FF7A1A]/40 bg-[#FF7A1A]/10 px-4 py-3 text-left">
          <Bell size={18} className="text-[#FF7A1A] shrink-0" />
          <span className="flex-1 text-sm"><b>Turn on order sound</b><span className="block text-xs text-zinc-400">Tap once — then every new booking rings while this app is open.</span></span>
          <span className="text-xs font-bold bg-[#FF7A1A] text-black rounded-lg px-3 py-1.5">Turn on</span>
        </button>
      )}

      {latestNew && (
        <button onClick={() => open(latestNew)} className="w-full flex items-center gap-3 rounded-2xl border border-[#FF7A1A]/40 bg-gradient-to-r from-[#FF7A1A]/15 to-transparent px-3 py-2.5 text-left animate-[pulse_2s_ease-in-out_2]">
          {latestNew.photos?.[0] && <img src={latestNew.photos[0]} alt="" className="w-10 h-10 rounded-xl object-cover" />}
          <span className="flex-1 min-w-0"><b className="block text-sm truncate">New booking {latestNew.id} · {latestNew.name}</b><span className="text-xs text-zinc-400">₹{latestNew.paid} paid · {latestNew.photos?.length || 0} photos · {ago(latestNew.createdAt)}</span></span>
          <span className="text-xs font-bold bg-[#FF7A1A] text-black rounded-lg px-3 py-1.5">Open</span>
        </button>
      )}

      {showSettings && <OfferSettings offer={offer} />}

      <div className="grid grid-cols-4 gap-2">
        {([["New", count("new"), "text-[#FF7A1A]"], ["Editing", count("editing"), "text-sky-400"], ["Delivered", count("delivered"), "text-[#3ddc84]"], ["Waitlist", waitlist.length, "text-zinc-200"]] as const).map(([l, v, c]) => (
          <div key={l} className="rounded-xl bg-[#131313] border border-white/[0.07] px-2.5 py-2"><div className="text-[10.5px] text-zinc-500 font-semibold">{l}</div><div className={`text-xl font-extrabold ${c}`}>{v}</div></div>
        ))}
      </div>
      <div className="rounded-xl bg-[#131313] border border-white/[0.07] px-3 py-2.5">
        <div className="flex justify-between items-center text-xs text-zinc-400 gap-2">
          <span><b className="text-white">{offer.booked}</b> / <b className="text-white">{offer.total}</b> slots booked · next slot ₹{priceForSlot(offer, Math.min(offer.booked + 1, offer.total))}</span>
          <button onClick={addSlots} className="text-[#ff9a4d] font-bold">+10 slots</button>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] mt-2 overflow-hidden"><div className="h-full bg-[#FF7A1A] rounded-full" style={{ width: `${Math.min(100, offer.booked / Math.max(1, offer.total) * 100)}%` }} /></div>
      </div>

      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search ID (TC-063), name or number"
        className="w-full h-11 rounded-xl bg-[#1a1a1a] border border-white/10 px-3.5 text-sm outline-none focus:border-[#FF7A1A]" />
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {(["new", "editing", "delivered", "wait", "all"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border ${tab === t ? "bg-white text-black border-white" : "bg-[#131313] border-white/10 text-zinc-400"}`}>
            {({ new: "New", editing: "Editing", delivered: "Delivered", wait: "Waitlist", all: "All" })[t]} <span className="opacity-60">{t === "wait" ? waitlist.length : t === "all" ? orders.length : count(t)}</span>
          </button>
        ))}
      </div>

      {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error} <button className="underline ml-1" onClick={refresh}>Retry</button></div>}
      {loading && <div className="text-sm text-zinc-500">Loading…</div>}

      {tab !== "wait" && (
        <div className="grid gap-2 md:grid-cols-2">
          {shown.map(o => (
            <button key={o.id} onClick={() => open(o)} className="text-left rounded-2xl bg-[#131313] border border-white/[0.07] hover:border-white/20 p-3 grid grid-cols-[52px_1fr_auto] gap-3 items-center">
              <div className="w-[52px] h-[52px] rounded-xl bg-[#222] bg-cover bg-center" style={{ backgroundImage: o.photos?.[0] ? `url(${o.photos[0]})` : undefined }} />
              <div className="min-w-0">
                <div className="font-['Anton',sans-serif] text-[#FF7A1A] tracking-wide flex items-center gap-1.5">{o.id}{!seen.includes(o.id) && <span className="w-2 h-2 rounded-full bg-[#FF7A1A]" />}</div>
                <div className="font-bold text-[13.5px] truncate">{o.name}</div>
                <div className="text-[11.5px] text-zinc-500 truncate">{o.big} · {o.pose} · {o.photos?.length || 0} photos · {ago(o.createdAt)}</div>
              </div>
              <span className={`text-[10.5px] font-extrabold px-2 py-1 rounded-full ${PILL[o.status]}`}>{o.status.toUpperCase()}</span>
            </button>
          ))}
          {!loading && !shown.length && <div className="text-sm text-zinc-500 py-8 text-center md:col-span-2">No orders here yet</div>}
        </div>
      )}

      {tab === "wait" && (
        <div className="grid gap-2 md:grid-cols-2">
          {waitlist.map(w => (
            <div key={w.id} className="rounded-2xl bg-[#131313] border border-white/[0.07] p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 grid place-items-center">⏳</div>
              <div className="flex-1 min-w-0"><b className="text-sm">#{w.position} {w.name}</b><div className="text-xs text-zinc-500">+91 {w.phone} · {ago(w.at)}{w.notified ? " · told ✓" : ""}</div></div>
              <a href={wa(w.phone, `Hi ${w.name}! A title card edit slot just opened for you. Book here: https://www.youreditorfriend.in/titlecard`)} target="_blank" rel="noreferrer"
                onClick={() => { adminUpdate(w.id, { notified: true }).catch(() => {}); setWaitlist(l => l.map(x => x.id === w.id ? { ...x, notified: true } : x)); }}
                className="text-xs font-bold bg-[#25D366] text-[#06210f] rounded-lg px-3 py-2">Tell them</a>
            </div>
          ))}
          {!waitlist.length && <div className="text-sm text-zinc-500 py-8 text-center md:col-span-2">Nobody on the waiting list</div>}
        </div>
      )}

      {cur && <OrderSheet o={cur} busy={busy} onClose={() => setOpenId(null)} onUpdate={update} />}
    </div>
  );
}

function OrderSheet({ o, busy, onClose, onUpdate }: { o: EditOrder; busy: boolean; onClose: () => void; onUpdate: (id: string, p: Record<string, any>, msg?: string) => Promise<void> }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [fb, setFb] = useState("");
  const copy = (t: string) => { navigator.clipboard?.writeText(t); toast.success(`Copied ${t}`); };
  const k = Math.min(1, 7 / Math.max(o.big.length, 1));

  const uploadFinal = async (f?: File) => {
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadAnyFile(f);
      await onUpdate(o.id, { finalUrl: url, status: "delivered" }, `${o.id} marked delivered`);
      window.open(wa(o.phone, `Hi ${o.name.split(" ")[0]}! Your title card ${o.id} is ready 🎬\n${url}\n\n1 free revision is included — just reply here if you want a change.`), "_blank");
    } catch (e: any) { toast.error(e?.message || "Upload failed"); }
    finally { setUploading(false); }
  };
  const saveFeedback = async () => {
    if (!fb.trim()) return;
    try {
      await addTestimonial({ name: o.name.split(" ")[0], text: fb.trim(), rating: 5, productId: "titlecard-edit", productName: "Title card edit", source: "whatsapp", featured: true, createdAt: new Date().toISOString() });
      setFb(""); toast.success("Feedback added — it scrolls on the offer page");
    } catch (e: any) { toast.error(e?.message || "Couldn't save"); }
  };

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:w-[480px] h-[94dvh] md:h-auto bg-[#101010] border-t md:border-l border-white/10 rounded-t-[20px] md:rounded-none flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
          <span className="font-['Anton',sans-serif] text-[22px] text-[#FF7A1A] tracking-wide">{o.id}</span>
          <div className="flex-1 min-w-0"><b className="block truncate">{o.name}</b><span className="text-[11.5px] text-zinc-500">{o.batch || "—"}{o.deliverBy ? ` · by ${o.deliverBy}` : ""} · ₹{o.paid}{o.upgrade ? " (upgrade)" : ""} · {ago(o.createdAt)}</span></div>
          <button onClick={onClose} className="text-zinc-400"><X size={22} /></button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="grid grid-cols-3 gap-1.5">
            {(["new", "editing", "delivered"] as const).map(s => (
              <button key={s} disabled={busy} onClick={() => onUpdate(o.id, { status: s }, `${o.id} → ${s}`)}
                className={`py-2.5 rounded-xl text-xs font-bold border ${o.status === s ? PILL[s] + " border-current" : "bg-[#131313] border-white/10 text-zinc-500"}`}>
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="relative aspect-[2.4/1] rounded-xl overflow-hidden" style={{ background: "repeating-linear-gradient(115deg,rgba(255,255,255,.05) 0 34px,transparent 34px 70px),radial-gradient(120% 140% at 70% 40%,#ff3b3b 0%,#d81f36 45%,#8f0f22 100%)" }}>
            {o.photos?.[0] && <div className="absolute left-0 inset-y-0 w-[36%] bg-cover bg-center" style={{ backgroundImage: `url(${o.photos[0]})`, WebkitMaskImage: "linear-gradient(90deg,#000 70%,transparent)", maskImage: "linear-gradient(90deg,#000 70%,transparent)" }} />}
            <div className="absolute left-[36%] right-[4%] inset-y-0 flex flex-col items-center justify-center">
              <div className="font-['Anton',sans-serif] text-black/30 tracking-[3px] text-sm">{o.top}</div>
              <div className="font-['Anton',sans-serif] text-[#fff4d6] leading-none whitespace-nowrap" style={{ fontSize: 44 * k, transform: "skew(-12deg) rotate(-4deg)" }}>{o.big}</div>
            </div>
          </div>

          <Block title="What to type in AE">
            <Row l="Top text" v={o.top || "—"} act={o.top ? <CopyBtn onClick={() => copy(o.top)} /> : null} />
            <Row l="Big name" v={o.big} act={<CopyBtn onClick={() => copy(o.big)} />} />
            <Row l="Pose" v={o.pose} />
            {o.note && <Row l="Note" v={o.note} />}
          </Block>

          <div>
            <div className="text-[11px] font-bold tracking-[1.2px] uppercase text-zinc-500 mb-2">Photos ({o.photos?.length || 0}) · tap to open full size</div>
            <div className="grid grid-cols-5 gap-1.5">
              {(o.photos || []).map((p, i) => (
                <a key={p} href={p} target="_blank" rel="noreferrer" download={`${o.id}-${i + 1}.jpg`} className="relative aspect-square rounded-lg bg-cover bg-center border border-white/10" style={{ backgroundImage: `url(${p})` }}>
                  <Download size={12} className="absolute bottom-1 right-1 text-white drop-shadow" />
                </a>
              ))}
            </div>
          </div>

          <Block title="Client">
            <Row l="WhatsApp" v={`+91 ${o.phone}`} act={<CopyBtn onClick={() => copy(o.phone)} />} />
            <Row l="Email" v={o.email || o.userEmail || "—"} />
            <Row l="Revision" v={`${o.revisionsUsed || 0} / 1 used`} act={<button className="text-[11.5px] font-bold text-[#ff9a4d]" onClick={() => onUpdate(o.id, { revisionsUsed: (o.revisionsUsed || 0) + 1 }, "Revision counted")}>+1</button>} />
            <Row l="Payment" v={o.paymentId || "—"} />
          </Block>

          {o.status === "delivered" && (
            <Block title="Showcase & feedback">
              <Row l="Client allows" v={o.showOk ? "Yes" : "No — keep private"} />
              {o.showOk && <div className="flex items-center justify-between px-3 py-2.5 text-[13px]"><span className="text-zinc-500">Show on offer page</span><Toggle value={!!o.shown} onChange={v => onUpdate(o.id, { shown: v }, v ? "Now in the delivered stack" : "Removed from the page")} /></div>}
              <div className="px-3 py-2.5 flex gap-2">
                <input value={fb} onChange={e => setFb(e.target.value)} placeholder="Paste their feedback (WhatsApp message)…" className="flex-1 h-9 rounded-lg bg-[#1a1a1a] border border-white/10 px-2.5 text-[13px] outline-none" />
                <button onClick={saveFeedback} className="text-xs font-bold bg-[#FF7A1A] text-black rounded-lg px-3">Add</button>
              </div>
            </Block>
          )}

          <div className="grid gap-2">
            <a href={wa(o.phone, `Hi ${o.name.split(" ")[0]}! About your title card ${o.id}:`)} target="_blank" rel="noreferrer" className="h-12 rounded-xl bg-[#25D366] text-[#06210f] font-bold grid place-items-center">Chat on WhatsApp</a>
            {o.finalUrl && <a href={o.finalUrl} target="_blank" rel="noreferrer" className="h-11 rounded-xl bg-[#1d1d1d] border border-white/10 font-bold grid place-items-center text-sm">▶ Final video</a>}
            <label className="relative block rounded-xl border-[1.5px] border-dashed border-white/20 p-3.5 text-center text-[13px] text-zinc-400 cursor-pointer">
              <input type="file" accept="video/mp4,video/*" className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} onChange={e => uploadFinal(e.target.files?.[0])} />
              <b className="block text-white text-sm"><Upload size={14} className="inline -mt-0.5 mr-1" />{uploading ? "Uploading…" : o.finalUrl ? "Replace final 1080p MP4" : "Upload final 1080p MP4"}</b>
              Marks Delivered and opens WhatsApp with the link for the client
            </label>
            <button onClick={async () => { if (!confirm(`Delete ${o.id}? Only for test orders — this can't be undone.`)) return; await onUpdate(o.id, { delete: true }, `${o.id} deleted`); onClose(); }}
              className="text-xs text-zinc-500 hover:text-red-400 py-2">Delete (test order)</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div><div className="text-[11px] font-bold tracking-[1.2px] uppercase text-zinc-500 mb-2">{title}</div>
    <div className="rounded-xl bg-[#131313] border border-white/[0.07] divide-y divide-white/[0.07]">{children}</div></div>
);
const Row = ({ l, v, act }: { l: string; v: string; act?: React.ReactNode }) => (
  <div className="flex items-center gap-3 px-3 py-2.5 text-[13px]"><span className="text-zinc-500 w-[86px] shrink-0">{l}</span><b className="flex-1 break-words">{v}</b>{act}</div>
);
const CopyBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="text-[11.5px] font-bold text-[#ff9a4d] bg-[#FF7A1A]/10 rounded-md px-2 py-1 flex items-center gap-1"><Copy size={11} />Copy</button>
);

// ── Offer settings: prices, batches, poses, file product, home page bar/card/hero ──
function OfferSettings({ offer }: { offer: TitleCardOffer }) {
  const toast = useToast();
  const { store } = useStore();
  const [d, setD] = useState<TitleCardOffer>(offer);
  const [saving, setSaving] = useState(false);
  const [poseBusy, setPoseBusy] = useState(false);
  useEffect(() => { setD(offer); }, [offer.booked, offer.total]); // eslint-disable-line react-hooks/exhaustive-deps
  const hero = d.hero || ORIGINAL_HERO;
  const set = <K extends keyof TitleCardOffer>(k: K, v: TitleCardOffer[K]) => setD(x => ({ ...x, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await adminConfig({
        ...(d.booked !== offer.booked ? { booked: d.booked } : {}),
        open: d.open, total: d.total, tiers: sortedTiers(d), batches: d.batches, filePrice: d.filePrice, fileProductId: d.fileProductId,
        poses: d.poses, demoVideo: d.demoVideo, poster: d.poster, bar: d.bar, homeCard: d.homeCard, hero: d.hero,
      });
      toast.success("Saved · live now");
    } catch (e: any) { toast.error(e?.message || "Couldn't save"); }
    finally { setSaving(false); }
  };
  const addPose = async (f?: File) => {
    if (!f) return;
    setPoseBusy(true);
    try {
      const url = await uploadAnyFile(f);
      const name = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 30) || `Pose ${d.poses.length + 1}`;
      set("poses", [...d.poses, { id: Date.now().toString(36), name, img: url }]);
    } catch (e: any) { toast.error(e?.message || "Upload failed"); }
    finally { setPoseBusy(false); }
  };
  const uploadDemo = async (f?: File) => {
    if (!f) return;
    try { const url = await uploadAnyFile(f); set("demoVideo", url); toast.info("Demo video uploaded — press Save"); }
    catch (e: any) { toast.error(e?.message || "Upload failed"); }
  };
  const inp = "w-full h-10 rounded-lg bg-[#1a1a1a] border border-white/10 px-3 text-sm outline-none focus:border-[#FF7A1A]";
  const H = ({ t, s }: { t: string; s?: string }) => <div className="mb-2"><b className="text-sm">{t}</b>{s && <span className="block text-xs text-zinc-500">{s}</span>}</div>;

  return (
    <div className="rounded-2xl bg-[#0e0e0e] border border-white/10 divide-y divide-white/[0.07]">
      <div className="p-4 flex items-center justify-between"><H t="Booking open" s="Turn off to pause new bookings" /><Toggle value={d.open} onChange={v => set("open", v)} /></div>

      <div className="p-4">
        <H t="₹499 project file product" s="Pick the product buyers get (also given free with every edit)" />
        <select value={d.fileProductId} onChange={e => set("fileProductId", e.target.value)} className={inp}>
          <option value="">— not ready yet (Buy shows “Soon”) —</option>
          {(store?.products || []).map(p => <option key={p.id} value={p.id}>{p.name} · ₹{p.price}</option>)}
        </select>
      </div>

      <div className="p-4">
        <H t="Prices & batches" s="Price for each batch of slots, and the delivery date shown to buyers" />
        <div className="space-y-2">
          {d.batches.map((b: Batch, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px_70px_80px] gap-1.5 items-center text-xs">
              <input className={inp} value={b.date} placeholder={`${b.name} delivery date`} onChange={e => set("batches", d.batches.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} />
              <input className={inp} type="number" value={b.from} onChange={e => set("batches", d.batches.map((x, j) => j === i ? { ...x, from: +e.target.value } : x))} />
              <input className={inp} type="number" value={b.to} onChange={e => set("batches", d.batches.map((x, j) => j === i ? { ...x, to: +e.target.value } : x))} />
              <input className={inp} type="number" value={priceForSlot(d, b.from)} onChange={e => {
                const tiers = d.batches.map((x, j) => ({ upTo: x.to, price: j === i ? +e.target.value : priceForSlot(d, x.from) }));
                set("tiers", tiers);
              }} />
            </div>
          ))}
          <div className="grid grid-cols-[1fr_70px_70px_80px] gap-1.5 text-[10.5px] text-zinc-500 px-1"><span>Delivery date</span><span>From</span><span>To</span><span>Price ₹</span></div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-zinc-400 flex-wrap">
          Total slots <input className={inp + " w-20"} type="number" value={d.total} onChange={e => set("total", +e.target.value)} />
          Booked <input className={inp + " w-20"} type="number" value={d.booked} onChange={e => set("booked", +e.target.value)} />
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">Change “Booked” only to undo a test booking.</p>
      </div>

      <div className="p-4">
        <H t="Poses" s="Upload pose images — buyers pick one. “Use my photo as it is” is always there." />
        <div className="grid grid-cols-4 gap-2">
          {d.poses.map((p: Pose, i) => (
            <div key={p.id} className="relative">
              <div className="aspect-[3/4] rounded-lg bg-cover bg-center border border-white/10" style={{ backgroundImage: `url(${p.img})` }} />
              <input className="mt-1 w-full h-7 rounded-md bg-[#1a1a1a] border border-white/10 px-1.5 text-[11px]" value={p.name} onChange={e => set("poses", d.poses.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <button onClick={() => set("poses", d.poses.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black border border-white/20 grid place-items-center"><Trash2 size={11} /></button>
            </div>
          ))}
          <label className="aspect-[3/4] rounded-lg border-[1.5px] border-dashed border-white/20 grid place-items-center text-xs text-zinc-400 cursor-pointer relative">
            <input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={e => addPose(e.target.files?.[0])} />
            {poseBusy ? "…" : <span className="text-center"><Plus size={16} className="mx-auto" />Add pose</span>}
          </label>
        </div>
      </div>

      <div className="p-4">
        <H t="Demo video" s="Short loop at the top of the offer page. Upload here to serve it from R2 (free bandwidth)." />
        <input className={inp} value={d.demoVideo} onChange={e => set("demoVideo", e.target.value)} />
        <label className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#ff9a4d] cursor-pointer relative"><input type="file" accept="video/mp4" className="absolute inset-0 opacity-0" onChange={e => uploadDemo(e.target.files?.[0])} /><Upload size={13} />Upload new demo video</label>
      </div>

      <div className="p-4 space-y-3">
        <H t="Home page" s="Sale bar at the top + offer card under the hero" />
        <div className="flex items-center justify-between text-sm"><span>Top sale bar</span><Toggle value={d.bar.on} onChange={v => set("bar", { ...d.bar, on: v })} /></div>
        <input className={inp} value={d.bar.text} maxLength={70} onChange={e => set("bar", { ...d.bar, text: e.target.value })} />
        <p className="text-[11px] text-zinc-500">{"{left}"} = live slots left · {"{price}"} = current price</p>
        <div className="flex items-center justify-between text-sm"><span>Offer card under the hero</span><Toggle value={d.homeCard.on} onChange={v => set("homeCard", { on: v })} /></div>
        <div className="pt-2">
          <b className="text-sm">Hero text</b>
          <div className="grid gap-1.5 mt-2">
            <input className={inp} value={hero.tag} onChange={e => set("hero", { ...hero, tag: e.target.value })} placeholder="Small tag" />
            <input className={inp} value={hero.l1} onChange={e => set("hero", { ...hero, l1: e.target.value })} placeholder="Line 1" />
            <input className={inp} value={hero.l2} onChange={e => set("hero", { ...hero, l2: e.target.value })} placeholder="Line 2 (orange)" />
            <input className={inp} value={hero.sub} onChange={e => set("hero", { ...hero, sub: e.target.value })} placeholder="Sub line" />
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <button className="text-xs font-bold rounded-lg px-3 py-2 bg-[#1d1d1d] border border-white/10" onClick={() => set("hero", { tag: "🔥 LAUNCH OFFER LIVE", l1: "Your name.", l2: "This title card.", sub: "Send your photo — I edit it for you. Only 100 slots." })}>Use offer text</button>
            <button className="text-xs font-bold rounded-lg px-3 py-2 bg-[#1d1d1d] border border-white/10" onClick={() => set("hero", null)}>↺ Restore original</button>
          </div>
        </div>
      </div>

      <div className="p-4 flex justify-end gap-2">
        <button className="text-xs font-semibold text-zinc-400 px-3" onClick={() => setD({ ...DEFAULT_OFFER, ...offer })}>Undo changes</button>
        <button disabled={saving} onClick={save} className="h-10 px-5 rounded-xl bg-[#FF7A1A] text-black font-bold text-sm">{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}
