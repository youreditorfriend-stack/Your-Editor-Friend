import { useEffect, useState, type ReactNode } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_PAGES, mergePages, useStore, type PageConfig, type SiteLayout } from "../lib/store";
import { Button, useToast } from "./admin/ui";

const Sw: React.FC<{ on: boolean; onClick: () => void }> = ({ on, onClick }) => (
  <button type="button" onClick={onClick} aria-pressed={on}
    className={`relative w-[58px] h-8 rounded-full shrink-0 transition-colors cursor-pointer ${on ? "bg-[#25D366]" : "bg-zinc-700"}`}>
    <span className={`absolute top-1 w-6 h-6 rounded-full transition-all ${on ? "left-[30px] bg-black" : "left-1 bg-zinc-400"}`} />
    <span className={`absolute top-2 text-[9px] font-extrabold ${on ? "left-2 text-black" : "right-2 text-zinc-200"}`}>{on ? "ON" : "OFF"}</span>
  </button>
);

const HOME_SECTIONS: [keyof NonNullable<SiteLayout["home"]>, string, string][] = [
  ["fan", "Hero fan cards", "the 5 tilted product cards at the top"],
  ["pills", "Trust pills", "Instant download · UPI · Lifetime access"],
  ["shop", "Shop grid", "all products with category chips"],
  ["bundles", "Bundle offers", "the big bundle block"],
  ["courses", "Courses", "course cards / coming soon"],
  ["reviews", "Reviews strip", "“What editors say” — text & voice notes"],
  ["creator", "Creator strip", "Made by Janish · Portfolio · YouTube · Hire me"],
];
const PRODUCTS_SECTIONS: [keyof NonNullable<SiteLayout["products"]>, string, string][] = [
  ["bundles", "Bundle offers", "under the product grid"],
  ["help", "WhatsApp help box", "“Not sure which one fits you?”"],
];
const PAGE_ICON: Record<string, string> = { products: "🛍", courses: "🎓", services: "💼", portfolio: "🎬", about: "👤", contact: "✉️", youtube: "▶️" };

// One visual map of the whole site: pages → sections, with big switches,
// plus picking exactly which products appear in the home hero fan.
export function AdminSiteMap() {
  const { store } = useStore();
  const toast = useToast();
  const [pages, setPages] = useState<PageConfig[]>(DEFAULT_PAGES);
  const [layout, setLayout] = useState<SiteLayout>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "store", "data")).then(s => {
      const d = s.data() || {};
      setPages(mergePages(d.pages));
      setLayout(d.layout || {});
    }).catch(() => {});
  }, []);

  const products = (store?.products || []).filter(p => p.enabled);
  const pageOn = (id: string) => pages.find(p => p.id === id)?.enabled !== false;
  const togglePage = (id: string) => { setPages(ps => ps.map(p => (p.id === id ? { ...p, enabled: !p.enabled } : p))); setDirty(true); };
  const secOn = (pg: "home" | "products", k: string) => (layout[pg] as any)?.[k] !== false;
  const toggleSec = (pg: "home" | "products", k: string) => {
    setLayout(l => ({ ...l, [pg]: { ...(l[pg] || {}), [k]: !secOn(pg, k) } }));
    setDirty(true);
  };
  const fan = layout.fanIds || [];
  const toggleFan = (id: string) => {
    let next = fan.includes(id) ? fan.filter(x => x !== id) : [...fan, id];
    if (next.length > 5) { toast.error("Max 5 — remove one first"); return; }
    setLayout(l => ({ ...l, fanIds: next })); setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "store", "data"), { pages, layout }, { merge: true });
      toast.success("Saved — live on the site"); setDirty(false);
    } catch (e: any) { toast.error("Could not save: " + (e?.message || "")); }
    setSaving(false);
  };

  const Row: React.FC<{ title: string; sub: string; on: boolean; onClick: () => void; children?: ReactNode }> = ({ title, sub, on, onClick, children }) => (
    <div className="py-2.5 border-t border-white/[0.05] first:border-0">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1"><b className="block text-[13px]">{title}</b><small className="block text-[11px] text-zinc-500">{sub}</small></div>
        <Sw on={on} onClick={onClick} />
      </div>
      {children}
    </div>
  );

  const PageCard: React.FC<{ id: string; title: string; img?: string; always?: boolean; children?: ReactNode }> = ({ id, title, img, always, children }) => {
    const on = always || pageOn(id);
    return (
      <div className={`rounded-2xl border bg-[#131313] overflow-hidden ${on ? "border-white/[0.08]" : "border-dashed border-white/15"}`}>
        <div className="flex items-center gap-3 p-3.5">
          <div className="w-16 h-11 rounded-lg overflow-hidden bg-zinc-800 shrink-0 grid place-items-center text-xl">{img ? <img src={img} alt="" className="w-full h-full object-cover" /> : PAGE_ICON[id] || "📄"}</div>
          <div className="min-w-0 flex-1"><b className="block text-[15px]">{title}</b><small className="block text-xs text-zinc-500">{always ? "landing page — always on" : on ? "visible in the menu & site" : "hidden from menu & site"}</small></div>
          {!always && <Sw on={on} onClick={() => togglePage(id)} />}
        </div>
        {children && <div className={`px-4 pb-3 pl-6 sm:pl-[92px] ${on ? "" : "opacity-40 pointer-events-none"}`}>{children}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">Show / hide on site</h1>
          <p className="text-xs text-zinc-500 mt-1">Pages → sections. Changes go live when you press Save.</p>
        </div>
        <Button variant="primary" onClick={save} disabled={saving || !dirty}>{saving ? "Saving…" : dirty ? "Save" : "Saved ✓"}</Button>
      </div>

      <PageCard id="home" title="Home" img={products[0]?.image} always>
        {HOME_SECTIONS.map(([k, t, s]) => (
          <Row key={k} title={t} sub={s} on={secOn("home", k)} onClick={() => toggleSec("home", k)}>
            {k === "fan" && secOn("home", "fan") && (
              <div className="mt-2">
                <div className="text-[11px] text-zinc-400 mb-1.5">Pick up to 5 (1st = centre card). {fan.length === 0 ? "None picked → shows featured / best sellers." : `${fan.length}/5 picked`}</div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {products.map(p => {
                    const i = fan.indexOf(p.id);
                    return (
                      <button key={p.id} type="button" onClick={() => toggleFan(p.id)} title={p.name}
                        className={`relative shrink-0 w-16 rounded-lg overflow-hidden border-2 transition cursor-pointer ${i >= 0 ? "border-[#FF7A1A]" : "border-transparent opacity-50 hover:opacity-80"}`}>
                        <img src={p.image} alt="" className="w-full aspect-[4/5] object-cover" />
                        {i >= 0 && <span className="absolute top-1 left-1 w-5 h-5 rounded-md bg-[#FF7A1A] text-black text-[10px] font-extrabold grid place-items-center">{i + 1}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Row>
        ))}
        <Row title="YouTube line under the buttons" sub="“Trusted by 13.9K editors on YouTube”" on={pageOn("youtube")} onClick={() => togglePage("youtube")} />
      </PageCard>

      <PageCard id="products" title="Products" img={products[1]?.image}>
        {PRODUCTS_SECTIONS.map(([k, t, s]) => <Row key={k} title={t} sub={s} on={secOn("products", k)} onClick={() => toggleSec("products", k)} />)}
      </PageCard>
      {["courses", "services", "portfolio", "about", "contact"].map(id => (
        <PageCard key={id} id={id} title={pages.find(p => p.id === id)?.label || id} />
      ))}

      {dirty && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-20 lg:bottom-4 z-[80] flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl border border-[#FF7A1A]/50 bg-[#1d1208] shadow-2xl whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-[#FF7A1A] animate-pulse" /><b className="text-sm">Unsaved changes</b>
          <button onClick={save} disabled={saving} className="h-9 px-4 rounded-xl bg-[#FF7A1A] text-black text-sm font-extrabold cursor-pointer">{saving ? "Saving…" : "Save"}</button>
        </div>
      )}
    </div>
  );
}
