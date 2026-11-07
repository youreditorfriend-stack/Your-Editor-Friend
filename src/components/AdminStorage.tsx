import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { adminAuthBody } from "../lib/adminAuth";
import { Button } from "./admin/ui";

const fmt = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(2)} GB` : b >= 1024 ** 2 ? `${(b / 1024 ** 2).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);
const FOLDER: Record<string, string> = { thumbnails: "Images & thumbnails", files: "Product files, voice notes" };

// Cloudflare R2 free plan: how much is used, what's biggest, and what the
// limits mean — plus what triggers an alert.
export function AdminStorage() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "r2-usage", ...(await adminAuthBody()) }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok || b.error) throw new Error(b.error || `Failed (${r.status})`);
      setD(b);
    } catch (e: any) { setErr(e?.message || "Could not load storage"); }
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const pct = d ? Math.min(100, (d.bytes / d.freeLimitBytes) * 100) : 0;
  const tone = pct > 80 ? "bg-red-500" : pct > 60 ? "bg-amber-400" : "bg-[#25D366]";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">Storage & alerts</h1>
          <p className="text-xs text-zinc-500 mt-1">Cloudflare R2 free plan · resets every month</p>
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw size={13} className={busy ? "animate-spin" : ""} />} onClick={load} disabled={busy}>Refresh</Button>
      </div>

      {err && <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.06] p-4 text-sm text-amber-200">{err === "R2 not configured" ? "Storage meter works on the live site only (Cloudflare keys live in Vercel)." : err}</div>}

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/[0.08] bg-[#131313] p-4">
          <div className="text-xs text-zinc-400 font-semibold">Storage used</div>
          <div className="text-[26px] font-extrabold mt-1">{d ? fmt(d.bytes) : "—"} <span className="text-sm text-zinc-500 font-semibold">/ 10 GB free</span></div>
          <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden mt-2"><i className={`block h-full ${tone} transition-all duration-700`} style={{ width: `${pct}%` }} /></div>
          <div className="text-xs text-zinc-500 mt-1.5">{d ? (pct > 80 ? "⚠ Almost full — delete old files or expect a small bill" : `Safe · ${fmt(d.freeLimitBytes - d.bytes)} left`) : ""}</div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#131313] p-4">
          <div className="text-xs text-zinc-400 font-semibold">Files stored</div>
          <div className="text-[26px] font-extrabold mt-1">{d ? d.count.toLocaleString("en-IN") : "—"}</div>
          <div className="text-xs text-zinc-500 mt-1.5">{d && Object.entries(d.byFolder || {}).map(([k, v]) => `${FOLDER[k] || k}: ${fmt(v as number)}`).join(" · ")}</div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#131313] p-4">
          <div className="text-xs text-zinc-400 font-semibold">Downloads</div>
          <div className="text-[26px] font-extrabold mt-1 text-[#25D366]">Free</div>
          <div className="text-xs text-zinc-500 mt-1.5">Cloudflare never charges for people downloading your files.</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className="rounded-2xl border border-white/[0.08] bg-[#131313] p-4">
          <b className="text-sm">BIGGEST FILES</b>
          <div className="mt-2">
            {!d && <div className="text-xs text-zinc-500">—</div>}
            {d?.biggest?.map((f: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.05] last:border-0 text-xs">
                <span className="w-6 text-zinc-500">{i + 1}</span>
                {f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:text-[#FF7A1A]">{f.name}</a> : <span className="flex-1 truncate">{f.name}</span>}
                <b>{fmt(f.size)}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#131313] p-4 text-sm space-y-3">
          <b>WHAT THE FREE LIMITS MEAN</b>
          <ul className="text-xs text-zinc-400 space-y-1.5 list-disc pl-4">
            <li><b className="text-zinc-200">10 GB storage</b> — all your images, product zips and voice notes together.</li>
            <li><b className="text-zinc-200">1 million uploads / changes</b> a month — you'll never get close.</li>
            <li><b className="text-zinc-200">10 million reads</b> a month — page views of images; very safe.</li>
            <li>Going over is <b className="text-zinc-200">a small bill, not a shutdown</b> (about ₹1.25 per extra GB per month).</li>
          </ul>
          <b className="block pt-1">YOU GET ALERTED WHEN</b>
          <ul className="text-xs text-zinc-400 space-y-1.5 list-disc pl-4">
            <li>Someone pays but the product doesn't unlock → <b className="text-zinc-200">email to you</b> + red 🔔 in admin.</li>
            <li>A bank / UPI payment fails or a checkout is closed → red 🔔 in Payments & alerts.</li>
            <li>Storage passes 80% → this page turns red.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
