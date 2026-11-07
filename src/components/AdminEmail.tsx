import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Send } from "lucide-react";
import { db } from "../firebase";
import { useStore, formatPrice, bundleProducts, bundleValue } from "../lib/store";
import { adminAuthBody } from "../lib/adminAuth";
import { Button, useConfirm, useToast } from "./admin/ui";

const SITE = "https://www.youreditorfriend.in";
const inputCls = "w-full h-11 bg-zinc-950 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-[#FF7A1A]";
type Aud = "picked" | "paid" | "free" | "all" | "bought";

// Personalised email: pick who, pick a product or bundle to show, write once
// with {name} / {last_product}, preview as a real person, then send.
export function AdminEmail({ preset }: { preset: string[] }) {
  const { store } = useStore();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [users, setUsers] = useState<any[]>([]);
  const [aud, setAud] = useState<Aud>(preset.length ? "picked" : "paid");
  const [boughtId, setBoughtId] = useState("");
  const [show, setShow] = useState("");
  const [subject, setSubject] = useState("{name}, something new just dropped 🔥");
  const [body, setBody] = useState("Hi {name},\n\nSince you liked {last_product}, I made something new for you. Check it out below 👇");
  const [cta, setCta] = useState("Get it now →");
  const [sending, setSending] = useState(false);

  useEffect(() => { getDocs(collection(db, "users")).then(s => setUsers(s.docs.map(d => ({ uid: d.id, ...d.data() })))).catch(() => {}); }, []);
  useEffect(() => { if (preset.length) setAud("picked"); }, [preset]);

  const products = store?.products || [];
  const bundles = (store?.bundles || []).filter(b => b.enabled);
  const nameOf = (id: string) => products.find(p => p.id === id)?.name || store?.courses.find(c => c.id === id)?.title || "";

  const recipients = useMemo(() => {
    const list = users.filter(u => u.email && (
      aud === "picked" ? preset.includes(u.email) :
      aud === "paid" ? (u.payments || []).length > 0 :
      aud === "free" ? !(u.payments || []).length && (u.purchases || []).length > 0 :
      aud === "bought" ? (u.purchases || []).includes(boughtId) : true));
    return list.map(u => {
      const lastPay = (u.payments || []).slice(-1)[0];
      const lastId = lastPay?.itemId || (u.purchases || []).filter((x: string) => !x.includes("::")).slice(-1)[0];
      return { email: String(u.email).toLowerCase(), name: u.name || "", last: lastId ? nameOf(lastId) : "" };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, aud, preset, boughtId, store]);

  // product or bundle card
  const card = useMemo(() => {
    if (show.startsWith("b:")) {
      const b = bundles.find(x => x.id === show.slice(2));
      if (!b || !store) return undefined;
      const items = bundleProducts(store, b);
      return { image: items[0]?.image, name: `${b.name} — ${items.length} in 1`, price: `₹${b.price}  (separately ₹${bundleValue(items)})`, url: SITE };
    }
    const p = products.find(x => x.id === show);
    return p ? { image: p.image, name: p.name, price: formatPrice(p.price), url: `${SITE}/products/${p.id}` } : undefined;
  }, [show, products, bundles, store]);

  const sample = recipients[0] || { name: "Arun", last: "Thalapathy title card" };
  const fill = (s: string) => s.replace(/\{name\}/gi, (sample.name || "").split(" ")[0] || "there").replace(/\{last_product\}/gi, sample.last || "our templates");

  const send = async (to: { email: string; name: string; last: string }[], test = false) => {
    if (!to.length) { toast.error("No one to send to"); return; }
    if (!test && !(await confirmDialog({ title: `Send to ${to.length} ${to.length === 1 ? "person" : "people"}?`, description: to.length > 100 ? "Free email plan sends about 100 a day — big lists may be cut off. Consider smaller groups." : "Each person gets their own name.", confirmLabel: "Send" }))) return;
    setSending(true);
    try {
      let sent = 0; const failed: string[] = [];
      for (let i = 0; i < to.length; i += 450) {
        const chunk = to.slice(i, i + 450);
        const res = await fetch("/api/send-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: chunk.map(c => c.email), people: chunk, subject, body, ctaLabel: card ? cta : undefined, ctaUrl: card?.url, card, ...(await adminAuthBody()) }),
        });
        const b = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(b.error || `Failed (${res.status})`);
        sent += b.sent || 0; failed.push(...(b.failed || []));
      }
      toast.success(test ? "Test sent to you" : `Sent ${sent}${failed.length ? ` · ${failed.length} failed` : ""}`);
    } catch (e: any) { toast.error(e?.message || "Send failed"); }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">Send email</h1>
        <p className="text-xs text-zinc-500 mt-1">Each person gets their own name. Launch a product or a bundle offer.</p>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
        <div className="rounded-2xl border border-white/[0.08] bg-[#131313] p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block"><span className="text-[11px] font-bold tracking-wider text-zinc-400">TO</span>
              <select className={inputCls + " mt-1"} value={aud} onChange={e => setAud(e.target.value as Aud)}>
                {preset.length > 0 && <option value="picked">Picked from Customers ({preset.length})</option>}
                <option value="paid">Paid buyers</option>
                <option value="free">Free-only users</option>
                <option value="bought">Bought a product…</option>
                <option value="all">Everyone</option>
              </select>
            </label>
            <label className="block"><span className="text-[11px] font-bold tracking-wider text-zinc-400">SHOW IN EMAIL</span>
              <select className={inputCls + " mt-1"} value={show} onChange={e => setShow(e.target.value)}>
                <option value="">No product card</option>
                {bundles.length > 0 && <optgroup label="Bundle offers">{bundles.map(b => <option key={b.id} value={`b:${b.id}`}>🧩 {b.name} — ₹{b.price}</option>)}</optgroup>}
                <optgroup label="Products">{products.filter(p => p.enabled).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
              </select>
            </label>
          </div>
          {aud === "bought" && (
            <select className={inputCls} value={boughtId} onChange={e => setBoughtId(e.target.value)}>
              <option value="">Which product did they get?</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div className="rounded-xl bg-[#FF7A1A]/[0.08] border border-[#FF7A1A]/30 px-3 py-2 text-sm"><b className="text-[#FF7A1A]">{recipients.length}</b> people will get this</div>
          <label className="block"><span className="text-[11px] font-bold tracking-wider text-zinc-400">SUBJECT</span>
            <input className={inputCls + " mt-1"} value={subject} onChange={e => setSubject(e.target.value)} /></label>
          <label className="block"><span className="text-[11px] font-bold tracking-wider text-zinc-400">MESSAGE · tags: {"{name}"} {"{last_product}"}</span>
            <textarea rows={6} className="w-full mt-1 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF7A1A]" value={body} onChange={e => setBody(e.target.value)} /></label>
          {card && <label className="block"><span className="text-[11px] font-bold tracking-wider text-zinc-400">BUTTON TEXT</span>
            <input className={inputCls + " mt-1"} value={cta} onChange={e => setCta(e.target.value)} /></label>}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="secondary" disabled={sending} onClick={() => send([{ email: "youreditorfriend@gmail.com", name: sample.name || "Janish", last: sample.last || "" }], true)}>Send test to me</Button>
            <Button variant="primary" icon={<Send size={14} />} disabled={sending || !recipients.length} onClick={() => send(recipients)}>{sending ? "Sending…" : `Send to ${recipients.length}`}</Button>
          </div>
          <p className="text-[11px] text-zinc-600">Free Resend plan ≈ 100 emails/day. For bigger lists send in smaller groups (e.g. “Bought a product…”).</p>
        </div>

        <div>
          <div className="text-[11px] font-bold tracking-wider text-zinc-500 mb-2">PREVIEW AS {(sample.name || "Arun").split(" ")[0].toUpperCase()}</div>
          <div className="rounded-2xl overflow-hidden bg-[#0a0a0a] border border-white/10">
            <div className="px-5 py-4 border-b border-white/10 text-[11px] font-extrabold tracking-[3px]">YOUR EDITOR <span className="text-[#FF7A1A]">FRIEND</span></div>
            <div className="p-5">
              <b className="block text-[15px] mb-3">{fill(subject)}</b>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{fill(body)}</p>
              {card && (
                <div className="mt-4 rounded-xl border border-white/10 overflow-hidden">
                  {card.image && <img src={card.image} alt="" className="w-full max-h-64 object-cover" />}
                  <div className="p-3"><b className="block text-sm">{card.name}</b><span className="text-[#FF7A1A] text-sm font-bold">{card.price}</span></div>
                </div>
              )}
              {card && <div className="mt-3 rounded-xl bg-[#FF7A1A] text-black text-center font-extrabold py-3 text-sm">{cta}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
