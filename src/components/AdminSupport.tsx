import { useEffect, useState } from "react";
import { arrayUnion, collection, doc, getDocs, limit, query, updateDoc, where } from "firebase/firestore";
import { Copy, Gift, Search } from "lucide-react";
import { db } from "../firebase";
import { useStore } from "../lib/store";
import { ago, CheckoutEvent, eventsForEmail, STAGE } from "../lib/checkoutEvents";
import { Button, useToast } from "./admin/ui";

const SITE = "youreditorfriend.in";
const toDate = (v: any) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);

// Paste a customer's email → see their account, what they own, every
// checkout step, a plain-English diagnosis and a ready WhatsApp reply.
export function AdminSupport({ initialEmail = "" }: { initialEmail?: string }) {
  const { store } = useStore();
  const toast = useToast();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<null | { user: any | null; uid?: string; events: CheckoutEvent[] }>(null);
  const [giveId, setGiveId] = useState("");

  const run = async (e = email) => {
    const em = e.trim().toLowerCase();
    if (!em.includes("@")) return;
    setBusy(true);
    try {
      const [us, events] = await Promise.all([
        getDocs(query(collection(db, "users"), where("email", "==", em), limit(1))),
        eventsForEmail(em).catch(() => [] as CheckoutEvent[]),
      ]);
      setRes({ user: us.empty ? null : us.docs[0].data(), uid: us.empty ? undefined : us.docs[0].id, events });
    } catch (err) { console.error(err); toast.error("Lookup failed"); }
    setBusy(false);
  };
  useEffect(() => { if (initialEmail) { setEmail(initialEmail); run(initialEmail); } /* eslint-disable-next-line */ }, [initialEmail]);

  const items = [...(store?.products || []).map(p => ({ id: p.id, name: p.name, img: p.image, price: p.price })), ...(store?.courses || []).map(c => ({ id: c.id, name: c.title, img: c.thumbnail, price: c.price }))];
  const nameOf = (id: string) => items.find(i => i.id === id)?.name || id;

  // ── diagnosis
  let verdict = "", fix: "give" | "login" | "none" = "none", reply = "", stuckItem = "";
  if (res) {
    const first = (res.user?.name || "").split(" ")[0] || "there";
    const owned: string[] = res.user?.purchases || [];
    const stuck = res.events.find(e => e.stage === "verify_failed" && !owned.includes(e.itemId));
    const declined = res.events.find(e => e.stage === "payment_failed");
    const cancelled = res.events.find(e => e.stage === "dismissed");
    if (!res.user) {
      verdict = "This email has never logged in to the site. They may have paid you on GPay/WhatsApp, or they're using a different Gmail on their phone.";
      fix = "login";
      reply = `Hi! I can't find ${email.trim()} on the site yet 🙏 Please open ${SITE}, tap Login and choose this same Gmail once. Then message me here and I'll unlock it right away.`;
    } else if (stuck) {
      stuckItem = stuck.itemId;
      verdict = `They PAID ₹${stuck.amount} for “${stuck.itemName}” (${ago(stuck.at)}) but the unlock failed${stuck.reason ? ` — ${stuck.reason}` : ""}. Give them the product.`;
      fix = "give";
      reply = `Hi ${first}! Sorry about that 🙏 Your payment for ${stuck.itemName} came through — I've unlocked it now. Open My Library on ${SITE} (same Google login) and it's there.`;
    } else if (declined && !res.events.some(e => e.stage === "paid" && e.at > declined.at)) {
      verdict = `Their bank/UPI declined the payment for “${declined.itemName}”${declined.reason ? ` — ${declined.reason}` : ""}. No money was taken.`;
      reply = `Hi ${first}! The payment didn't go through from the bank side (no money was taken). Please try once more with UPI/GPay on ${SITE} — or tell me and I'll send a direct payment link.`;
    } else if (cancelled && !res.events.some(e => e.stage === "paid" && e.at > cancelled.at)) {
      verdict = `They opened the payment window for “${cancelled.itemName}” and closed it without paying. Probably needs help or a nudge.`;
      reply = `Hi ${first}! Saw you were checking out ${cancelled.itemName} 🙂 Any doubt I can help with? If the payment page gave trouble, I can send a direct link.`;
    } else {
      verdict = `Everything looks fine: account active, owns ${owned.length} item(s). If they can't see files, they're probably logged in with a different Gmail.`;
      reply = `Hi ${first}! Your items are in My Library on ${SITE} 😊 Just make sure you log in with ${res.user.email} — if your phone picks another Google account the library looks empty.`;
    }
    if (!giveId && stuckItem) setTimeout(() => setGiveId(stuckItem), 0);
  }

  const give = async () => {
    if (!res?.uid || !giveId) return;
    try {
      await updateDoc(doc(db, "users", res.uid), { purchases: arrayUnion(giveId) });
      toast.success(`Unlocked “${nameOf(giveId)}”`);
      run();
    } catch (e: any) { toast.error("Could not unlock: " + (e?.message || "")); }
  };

  const u = res?.user;
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">Support helper</h1>
        <p className="text-xs text-zinc-500 mt-1">Someone says “it's not working”? Paste their email.</p>
      </div>
      <form onSubmit={e => { e.preventDefault(); run(); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="customer@gmail.com" inputMode="email" autoCapitalize="none"
            className="w-full h-12 rounded-2xl bg-[#131313] border border-white/10 pl-10 pr-3 text-base outline-none focus:border-[#FF7A1A]" />
        </div>
        <Button variant="primary" disabled={busy}>{busy ? "…" : "Check"}</Button>
      </form>

      {res && (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className={`rounded-2xl border p-4 bg-[#131313] ${u ? "border-[#25D366]/40" : "border-red-500/40"}`}>
              <div className="text-lg">{u ? "✅" : "⚠️"}</div>
              <b className="block mt-1">{u ? "Account found" : "No account"}</b>
              <small className="text-xs text-zinc-500">{u ? `${u.name || ""} · last login ${toDate(u.lastLogin)?.toLocaleDateString("en-IN") || "—"}` : "never logged in with this email"}</small>
            </div>
            <div className="rounded-2xl border border-white/10 p-4 bg-[#131313]">
              <div className="text-lg">📦</div>
              <b className="block mt-1">Owns {(u?.purchases || []).length}</b>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {(u?.purchases || []).slice(0, 8).map((id: string) => {
                  const it = items.find(i => i.id === id);
                  return it?.img ? <img key={id} src={it.img} title={it.name} alt="" className="w-7 h-7 rounded-md object-cover" /> : null;
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 p-4 bg-[#131313]">
              <div className="text-lg">💳</div>
              <b className="block mt-1">{res.events.length} checkout steps</b>
              <small className="text-xs text-zinc-500">{res.events[0] ? `last: ${STAGE[res.events[0].stage]?.label || res.events[0].stage} · ${ago(res.events[0].at)}` : "no attempts recorded"}</small>
            </div>
          </div>

          <div className="rounded-2xl border border-[#FF7A1A]/50 bg-[#1d1208] p-4 space-y-3">
            <div className="text-sm"><b className="text-[#FF7A1A]">What happened: </b>{verdict}</div>
            {res.uid && (
              <div className="flex gap-2 flex-wrap items-center">
                <select value={giveId} onChange={e => setGiveId(e.target.value)} className="h-10 flex-1 min-w-[200px] rounded-xl bg-black border border-white/15 px-3 text-sm">
                  <option value="">Choose a product to give…</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name}{(u?.purchases || []).includes(i.id) ? " (owned)" : ""}</option>)}
                </select>
                <Button variant="primary" size="sm" icon={<Gift size={13} />} onClick={give} disabled={!giveId}>Give product</Button>
              </div>
            )}
            <div className="relative font-mono text-[12px] bg-black/50 border border-white/10 rounded-xl p-3 pr-12 whitespace-pre-wrap text-zinc-200">
              {reply}
              <button onClick={() => { navigator.clipboard?.writeText(reply); toast.success("Reply copied — paste in WhatsApp"); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-[#FF7A1A] text-black grid place-items-center cursor-pointer" title="Copy reply"><Copy size={14} /></button>
            </div>
          </div>

          {res.events.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#131313] p-4">
              <div className="text-xs font-bold tracking-wider text-zinc-500 mb-2">TIMELINE</div>
              <div className="border-l-2 border-white/10 ml-1.5 pl-4 space-y-2">
                {res.events.map(e => {
                  const t = STAGE[e.stage];
                  return (
                    <div key={e.id} className="relative text-xs">
                      <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${t?.tone === "good" ? "bg-[#25D366]" : t?.tone === "bad" ? "bg-red-500" : t?.tone === "warn" ? "bg-amber-400" : "bg-zinc-500"}`} />
                      <b>{t?.label || e.stage}</b> · {e.itemName}{e.amount ? ` · ₹${e.amount}` : ""} <span className="text-zinc-500">· {ago(e.at)} · {e.device}</span>
                      {e.reason && <div className="text-zinc-500">{e.reason}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
