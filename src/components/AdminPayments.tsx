import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Smartphone, Monitor, XCircle } from "lucide-react";
import { useStore } from "../lib/store";
import { ago, groupAttempts, isProblem, STAGE, useCheckoutEvents } from "../lib/checkoutEvents";

const TONE = {
  good: "bg-[#25D366]/15 text-[#25D366] border-[#25D366]/30",
  bad: "bg-red-500/15 text-red-400 border-red-500/30",
  warn: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  info: "bg-white/[0.06] text-zinc-300 border-white/10",
};

const FILTERS = [
  { id: "problems", label: "⚠ Problems" },
  { id: "verify_failed", label: "Paid but not unlocked" },
  { id: "payment_failed", label: "Payment failed" },
  { id: "dismissed", label: "Cancelled / closed" },
  { id: "paid", label: "Paid ✓" },
  { id: "all", label: "All" },
] as const;

// Every Buy click, step by step: did they close the window, did the bank
// decline, or did they pay and the unlock fail?
export function AdminPayments({ onOpenSupport }: { onOpenSupport?: (email: string) => void }) {
  const { events, loading, blocked } = useCheckoutEvents(500);
  const { store } = useStore();
  const [f, setF] = useState<(typeof FILTERS)[number]["id"]>("problems");
  const attempts = useMemo(() => groupAttempts(events), [events]);

  const dayAgo = Date.now() - 86400000;
  const today = attempts.filter(a => new Date(a.last.at).getTime() > dayAgo);
  const kpi = {
    paid: today.filter(a => a.steps.some(s => s.stage === "paid")).length,
    cancelled: today.filter(a => a.last.stage === "dismissed").length,
    failed: today.filter(a => a.steps.some(s => s.stage === "payment_failed")).length,
    stuck: attempts.filter(a => a.steps.some(s => s.stage === "verify_failed") && !a.steps.some(s => s.stage === "paid")).length,
  };

  const shown = attempts.filter(a => {
    if (f === "all") return true;
    if (f === "problems") return a.steps.some(s => isProblem(s.stage)) && !a.steps.some(s => s.stage === "paid");
    if (f === "dismissed") return a.last.stage === "dismissed";
    return a.steps.some(s => s.stage === f);
  });
  const img = (id: string) => store?.products.find(p => p.id === id)?.image || store?.courses.find(c => c.id === id)?.thumbnail;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">Payments & alerts</h1>
        <p className="text-xs text-zinc-500 mt-1">Every Buy click, step by step. Recording started with this update — older purchases aren't listed here.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Paid (24h)", kpi.paid, "text-[#25D366]", <CheckCircle2 size={16} />],
          ["Cancelled (24h)", kpi.cancelled, "text-amber-400", <XCircle size={16} />],
          ["Bank declined (24h)", kpi.failed, "text-red-400", <AlertTriangle size={16} />],
          ["Paid but not unlocked", kpi.stuck, kpi.stuck ? "text-red-400" : "text-zinc-300", <AlertTriangle size={16} />],
        ].map(([l, v, c, ic], i) => (
          <div key={i} className={`rounded-2xl border bg-[#131313] p-4 ${i === 3 && kpi.stuck ? "border-red-500/40" : "border-white/[0.08]"}`}>
            <div className="text-xs text-zinc-500 flex items-center gap-1.5"><span className={c as string}>{ic as any}</span>{l as string}</div>
            <div className={`text-3xl font-extrabold mt-1 ${c}`}>{v as number}</div>
          </div>
        ))}
      </div>
      {kpi.stuck > 0 && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/[0.06] p-4 text-sm">
          <b className="text-red-400">{kpi.stuck} {kpi.stuck === 1 ? "person" : "people"} paid but the product didn't unlock.</b> Open them below and press “Give product”.
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {FILTERS.map(x => (
          <button key={x.id} onClick={() => setF(x.id)}
            className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-bold border cursor-pointer ${f === x.id ? "bg-white text-black border-white" : "border-white/10 text-zinc-400"}`}>{x.label}</button>
        ))}
      </div>

      {blocked ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.06] p-4 text-sm text-amber-200">
          Can't read payment steps yet. Publish the new <b>Firestore rules</b> in Firebase Console → Firestore → Rules (copy from <code>firestore.rules</code>), then reload.
        </div>
      ) : loading ? <div className="text-xs text-zinc-500">Loading…</div> : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">Nothing here 🎉</div>
      ) : (
        <div className="space-y-3">
          {shown.slice(0, 150).map(a => {
            const st = STAGE[a.last.stage] || { label: a.last.stage, tone: "info" as const };
            const problem = a.steps.find(s => s.reason && (isProblem(s.stage) || s.stage === "dismissed"));
            return (
              <div key={a.key} className="rounded-2xl border border-white/[0.08] bg-[#131313] p-3.5">
                <div className="flex items-center gap-3">
                  {img(a.itemId) ? <img src={img(a.itemId)} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" /> : <div className="w-11 h-11 rounded-lg bg-zinc-800 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate">{a.userName || a.email}</div>
                    <div className="text-[11px] text-zinc-500 truncate">{a.email} · {a.itemName}{a.amount ? ` · ₹${a.amount}` : ""}</div>
                  </div>
                  <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${TONE[st.tone]}`}>{st.label}</span>
                </div>
                {/* step trail */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3 text-[11px]">
                  {a.steps.map((s, i) => {
                    const t = STAGE[s.stage] || { label: s.stage, tone: "info" as const };
                    return (
                      <span key={s.id} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-zinc-600">→</span>}
                        <span className={`px-2 py-0.5 rounded-md border ${TONE[t.tone]}`}>{t.label}</span>
                      </span>
                    );
                  })}
                  <span className="ml-auto text-zinc-500 flex items-center gap-1">{a.last.device === "mobile" ? <Smartphone size={11} /> : <Monitor size={11} />}{ago(a.last.at)}</span>
                </div>
                {problem?.reason && <div className="mt-2 text-xs text-zinc-400 bg-black/30 rounded-lg px-3 py-2">Why: {problem.reason}</div>}
                {onOpenSupport && (a.steps.some(s => isProblem(s.stage)) || a.last.stage === "dismissed") && (
                  <button onClick={() => onOpenSupport(a.email)} className="mt-2 text-xs font-bold text-[#FF7A1A] cursor-pointer">Open in Support helper →</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Small count for the sidebar badge / bell: unresolved problems in the last 3 days.
export function useProblemCount() {
  const { events } = useCheckoutEvents(300);
  return useMemo(() => {
    const since = Date.now() - 3 * 86400000;
    return groupAttempts(events).filter(a =>
      new Date(a.last.at).getTime() > since &&
      a.steps.some(s => s.stage === "verify_failed" || s.stage === "payment_failed" || s.stage === "order_failed") &&
      !a.steps.some(s => s.stage === "paid")
    ).length;
  }, [events]);
}
