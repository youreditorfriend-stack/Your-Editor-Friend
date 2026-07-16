import { useEffect, useState } from "react";
import { db } from "../firebase";
import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { SEED_STORE, StoreData, Product, Course, ProductCategory, PageConfig, mergePages } from "../lib/store";
import { ImageField } from "./ImageField";

// ─── shared atoms (same visual language as Admin.tsx) ─────────────────────────
const IS: React.CSSProperties = { background:"#0d0d0d",border:"1px solid #2a2a2a",borderRadius:8,padding:"7px 11px",color:"#fff",fontSize:13,outline:"none" };

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button onClick={() => onChange(!value)} style={{
    width:44, height:24, borderRadius:12, border:"none", cursor:"pointer", flexShrink:0,
    background:value?"#e63027":"#333", position:"relative", transition:"background .2s",
  }}>
    <div style={{ width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:value?23:3,transition:"left .2s" }}/>
  </button>
);

const Btn = ({ children, onClick, color="#e63027", style={} }: any) => (
  <button onClick={onClick} style={{
    background:color+"18", color, border:`1px solid ${color}44`,
    borderRadius:8, padding:"6px 14px", cursor:"pointer", fontWeight:700,
    fontSize:13, display:"flex", alignItems:"center", gap:5, ...style,
  }}>{children}</button>
);

const SectionCard = ({ title, icon, children, action }: any) => (
  <div style={{ background:"#111",border:"1px solid #1e1e1e",borderRadius:16,marginBottom:20,overflow:"hidden" }}>
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 22px",borderBottom:"1px solid #1a1a1a",background:"#0d0d0d" }}>
      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
        <span style={{ fontSize:17 }}>{icon}</span>
        <span style={{ fontFamily:"'Bebas Neue',cursive",fontSize:19,color:"#fff",letterSpacing:2 }}>{title}</span>
      </div>
      {action}
    </div>
    <div style={{ padding:20 }}>{children}</div>
  </div>
);

const Empty = ({ children }: any) => (
  <div style={{ textAlign:"center",color:"#444",padding:"22px",border:"1px dashed #222",borderRadius:10,fontSize:13 }}>{children}</div>
);

const FieldLabel = ({ children }: any) => (
  <div style={{ color:"#666",fontSize:10,letterSpacing:1,fontWeight:700,marginBottom:4 }}>{children}</div>
);

const toId = (s: string) => s.toLowerCase().trim().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"") || `item-${Date.now()}`;

// ─── store data hook (admin: load once, edit locally, explicit save) ──────────
function useAdminStore() {
  const [data, setData] = useState<StoreData | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "store", "data"));
        if (snap.exists()) {
          const d = snap.data() as Partial<StoreData>;
          setData({
            products: d.products || SEED_STORE.products,
            courses: d.courses || SEED_STORE.courses,
            productCategories: d.productCategories || SEED_STORE.productCategories,
            pages: mergePages(d.pages),
          });
        } else {
          setData(SEED_STORE);
        }
      } catch (e) {
        console.error(e);
        setData(SEED_STORE);
      }
    })();
  }, []);

  const save = async () => {
    if (!data) return;
    try {
      await setDoc(doc(db, "store", "data"), data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
      alert("Failed to save store data.");
    }
  };

  return { data, setData, save, saved };
}

const SaveBar = ({ saved, onSave }: { saved: boolean; onSave: () => void }) => (
  <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:20 }}>
    <button onClick={onSave} style={{ background:"#e63027",color:"#fff",border:"none",borderRadius:8,padding:"8px 22px",cursor:"pointer",fontWeight:700,fontSize:14 }}>
      Save Store Changes
    </button>
    {saved && <span style={{ background:"#0d2a0d",border:"1px solid #22c55e44",color:"#22c55e",borderRadius:7,padding:"5px 14px",fontSize:13,fontWeight:600 }}>✓ Saved!</span>}
    <span style={{ color:"#555",fontSize:12 }}>Changes go live only after saving.</span>
  </div>
);

// ═══ PAGES / SECTIONS VISIBILITY PANEL ═════════════════════════════════════════
export function AdminPagesPanel() {
  const { data, setData, save, saved } = useAdminStore();
  if (!data) return <div style={{ color:"#555" }}>Loading…</div>;

  const setPages = (pages: PageConfig[]) => setData({ ...data, pages });
  const toggle = (id: string, v: boolean) =>
    setPages(data.pages.map(p => (p.id === id ? { ...p, enabled: v } : p)));
  const setAll = (v: boolean) => setPages(data.pages.map(p => ({ ...p, enabled: v })));

  const onCount = data.pages.filter(p => p.enabled).length;

  return (
    <div>
      <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:30,letterSpacing:3,margin:"0 0 4px" }}>
        PAGES &amp; <span style={{ color:"#e63027" }}>SECTIONS</span>
      </h1>
      <p style={{ color:"#555",fontSize:13,marginBottom:18 }}>
        Switch any page off and it disappears from the menu, from the home page, and its link stops working — visitors get sent back home.
      </p>
      <SaveBar saved={saved} onSave={save} />

      <SectionCard
        title={`VISIBLE ON SITE (${onCount}/${data.pages.length})`}
        icon="👁️"
        action={
          <div style={{ display:"flex",gap:8 }}>
            <Btn onClick={() => setAll(true)} color="#22c55e">Show all</Btn>
            <Btn onClick={() => setAll(false)} color="#e63027">Hide all</Btn>
          </div>
        }
      >
        {/* Home is the landing page — always on */}
        <div style={{ display:"flex",alignItems:"center",gap:12,background:"#0d0d0d",border:"1px dashed #222",borderRadius:10,padding:"12px 14px",marginBottom:8,opacity:0.7 }}>
          <span style={{ fontSize:16 }}>🏠</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700,color:"#888",fontSize:14 }}>Home</div>
            <div style={{ color:"#555",fontSize:11 }}>Always on — it's your landing page</div>
          </div>
          <span style={{ color:"#555",fontSize:11,fontWeight:700,letterSpacing:1 }}>LOCKED</span>
        </div>

        {data.pages.map(p => (
          <div key={p.id} style={{ display:"flex",alignItems:"center",gap:12,background:"#161616",border:`1px solid ${p.enabled?"#222":"#1a1a1a"}`,borderRadius:10,padding:"12px 14px",marginBottom:8,opacity:p.enabled?1:0.55 }}>
            <span style={{ fontSize:16 }}>{p.path ? "📄" : "🧩"}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700,color:p.enabled?"#fff":"#555",fontSize:14 }}>{p.label}</div>
              <div style={{ color:"#555",fontSize:11,fontFamily:"monospace" }}>{p.path || "home page section"}</div>
            </div>
            <span style={{
              fontSize:10,fontWeight:700,letterSpacing:1,borderRadius:20,padding:"3px 10px",
              background:p.enabled?"#0d2a0d":"#2a0a0a",
              color:p.enabled?"#22c55e":"#e63027",
              border:`1px solid ${p.enabled?"#22c55e33":"#e6302733"}`,
            }}>
              {p.enabled ? "VISIBLE" : "HIDDEN"}
            </span>
            <Toggle value={p.enabled} onChange={v => toggle(p.id, v)}/>
          </div>
        ))}
      </SectionCard>

      <SaveBar saved={saved} onSave={save} />
    </div>
  );
}

// ═══ PRODUCTS + CATEGORIES PANEL ═══════════════════════════════════════════════
export function AdminProductsPanel() {
  const { data, setData, save, saved } = useAdminStore();
  if (!data) return <div style={{ color:"#555" }}>Loading…</div>;

  const setCats = (cats: ProductCategory[]) => setData({ ...data, productCategories: cats });
  const setProds = (ps: Product[]) => setData({ ...data, products: ps });

  const addCategory = () => {
    const label = window.prompt("Category name? (e.g. Transitions)");
    if (!label?.trim()) return;
    setCats([...data.productCategories, { id: toId(label), label: label.trim(), enabled: true }]);
  };

  const addProduct = () => {
    setProds([
      {
        id: `product-${Date.now()}`,
        name: "New Product",
        tagline: "",
        price: 0,
        image: "",
        category: data.productCategories[0]?.id || "",
        free: true,
        downloadUrl: "",
        featured: false,
        enabled: false,
      },
      ...data.products,
    ]);
  };

  const upProd = (id: string, ch: Partial<Product>) =>
    setProds(data.products.map(p => (p.id === id ? { ...p, ...ch } : p)));

  return (
    <div>
      <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:30,letterSpacing:3,margin:"0 0 4px" }}>
        STORE <span style={{ color:"#e63027" }}>PRODUCTS</span>
      </h1>
      <p style={{ color:"#555",fontSize:13,marginBottom:18 }}>Square thumbnails shown on site • Free products are claimable instantly after login • Paid products are granted from the Users tab</p>
      <SaveBar saved={saved} onSave={save} />

      {/* Categories */}
      <SectionCard title="PRODUCT CATEGORIES" icon="🗂️" action={<Btn onClick={addCategory} color="#3b82f6">+ Add Category</Btn>}>
        {data.productCategories.map(cat => (
          <div key={cat.id} style={{ display:"flex",alignItems:"center",gap:9,background:"#161616",border:"1px solid #222",borderRadius:10,padding:"10px 12px",marginBottom:8 }}>
            <input
              value={cat.label}
              onChange={e => setCats(data.productCategories.map(c => c.id === cat.id ? { ...c, label: e.target.value } : c))}
              style={{ ...IS, flex:1, fontWeight:700 }}
            />
            <Toggle value={cat.enabled} onChange={v => setCats(data.productCategories.map(c => c.id === cat.id ? { ...c, enabled: v } : c))}/>
            <button onClick={() => { if (window.confirm(`Delete category "${cat.label}"?`)) setCats(data.productCategories.filter(c => c.id !== cat.id)); }}
              style={{ background:"#2a0a0a",color:"#e63027",border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:13 }}>🗑</button>
          </div>
        ))}
        {data.productCategories.length === 0 && <Empty>No categories yet</Empty>}
      </SectionCard>

      {/* Products */}
      <SectionCard title="PRODUCTS" icon="📦" action={<Btn onClick={addProduct} color="#22c55e">+ Add Product</Btn>}>
        {data.products.map(p => (
          <div key={p.id} style={{ background:"#0d0d0d",border:"1px solid #222",borderRadius:12,padding:16,marginBottom:12,opacity:p.enabled?1:0.6 }}>
            <div style={{ marginBottom:14 }}>
              <ImageField
                label="THUMBNAIL"
                aspect="square"
                value={p.image}
                onChange={url => upProd(p.id, { image: url })}
              />
            </div>
            <div style={{ display:"flex",gap:14 }}>
              <div style={{ flex:1,display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10 }}>
                <div>
                  <FieldLabel>NAME</FieldLabel>
                  <input value={p.name} onChange={e=>upProd(p.id,{name:e.target.value})} style={{...IS,width:"100%"}}/>
                </div>
                <div>
                  <FieldLabel>PRICE ₹ (0 = free)</FieldLabel>
                  <input type="number" value={p.price} onChange={e=>{const v=Number(e.target.value);upProd(p.id,{price:v,free:v===0});}} style={{...IS,width:"100%"}}/>
                </div>
                <div>
                  <FieldLabel>ORIGINAL ₹ (optional)</FieldLabel>
                  <input type="number" value={p.originalPrice ?? ""} onChange={e=>upProd(p.id,{originalPrice:e.target.value?Number(e.target.value):undefined})} style={{...IS,width:"100%"}}/>
                </div>
                <div style={{ gridColumn:"1 / -1" }}>
                  <FieldLabel>TAGLINE</FieldLabel>
                  <input value={p.tagline} onChange={e=>upProd(p.id,{tagline:e.target.value})} style={{...IS,width:"100%"}}/>
                </div>
                <div>
                  <FieldLabel>CATEGORY</FieldLabel>
                  <select value={p.category} onChange={e=>upProd(p.id,{category:e.target.value})} style={{...IS,width:"100%"}}>
                    {data.productCategories.map(c=>(<option key={c.id} value={c.id}>{c.label}</option>))}
                  </select>
                </div>
                <div style={{ gridColumn:"1 / 3" }}>
                  <FieldLabel>DOWNLOAD URL (delivered in My Library)</FieldLabel>
                  <input value={p.downloadUrl} onChange={e=>upProd(p.id,{downloadUrl:e.target.value})} placeholder="Google Drive / Dropbox link" style={{...IS,width:"100%"}}/>
                </div>
                <div>
                  <FieldLabel>BADGE (optional)</FieldLabel>
                  <input value={p.badge ?? ""} onChange={e=>upProd(p.id,{badge:e.target.value||undefined})} placeholder="Best Seller" style={{...IS,width:"100%"}}/>
                </div>
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:18,marginTop:12,paddingTop:12,borderTop:"1px solid #1a1a1a" }}>
              <label style={{ display:"flex",alignItems:"center",gap:8,color:"#888",fontSize:12,fontWeight:700 }}>FREE <Toggle value={p.free} onChange={v=>upProd(p.id,{free:v,price:v?0:p.price})}/></label>
              <label style={{ display:"flex",alignItems:"center",gap:8,color:"#888",fontSize:12,fontWeight:700 }}>FEATURED (home) <Toggle value={!!p.featured} onChange={v=>upProd(p.id,{featured:v})}/></label>
              <label style={{ display:"flex",alignItems:"center",gap:8,color:"#888",fontSize:12,fontWeight:700 }}>VISIBLE <Toggle value={p.enabled} onChange={v=>upProd(p.id,{enabled:v})}/></label>
              <div style={{ flex:1 }}/>
              <button onClick={()=>{ if(window.confirm(`Delete "${p.name}"?`)) setProds(data.products.filter(x=>x.id!==p.id)); }}
                style={{ background:"#2a0a0a",color:"#e63027",border:"none",borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:700 }}>🗑 Delete</button>
            </div>
          </div>
        ))}
        {data.products.length === 0 && <Empty>No products — click + Add Product</Empty>}
      </SectionCard>

      <SaveBar saved={saved} onSave={save} />
    </div>
  );
}

// ═══ COURSES PANEL ═════════════════════════════════════════════════════════════
export function AdminCoursesPanel() {
  const { data, setData, save, saved } = useAdminStore();
  if (!data) return <div style={{ color:"#555" }}>Loading…</div>;

  const setCourses = (cs: Course[]) => setData({ ...data, courses: cs });
  const upCourse = (id: string, ch: Partial<Course>) =>
    setCourses(data.courses.map(c => (c.id === id ? { ...c, ...ch } : c)));

  const addCourse = () => {
    setCourses([
      {
        id: `course-${Date.now()}`,
        title: "New Course",
        tagline: "",
        thumbnail: "",
        price: 0,
        features: [],
        free: true,
        accessUrl: "",
        enabled: false,
      },
      ...data.courses,
    ]);
  };

  return (
    <div>
      <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:30,letterSpacing:3,margin:"0 0 4px" }}>
        MY <span style={{ color:"#e63027" }}>COURSES</span>
      </h1>
      <p style={{ color:"#555",fontSize:13,marginBottom:18 }}>16:9 YouTube-style thumbnails • One feature per line • Access URL is shown to enrolled users in My Library</p>
      <SaveBar saved={saved} onSave={save} />

      <SectionCard title="COURSES" icon="🎓" action={<Btn onClick={addCourse} color="#22c55e">+ Add Course</Btn>}>
        {data.courses.map(c => (
          <div key={c.id} style={{ background:"#0d0d0d",border:"1px solid #222",borderRadius:12,padding:16,marginBottom:12,opacity:c.enabled?1:0.6 }}>
            <div style={{ marginBottom:14 }}>
              <ImageField
                label="THUMBNAIL"
                aspect="video"
                value={c.thumbnail}
                onChange={url => upCourse(c.id, { thumbnail: url })}
              />
            </div>
            <div style={{ display:"flex",gap:14 }}>
              <div style={{ flex:1,display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10 }}>
                <div>
                  <FieldLabel>TITLE</FieldLabel>
                  <input value={c.title} onChange={e=>upCourse(c.id,{title:e.target.value})} style={{...IS,width:"100%"}}/>
                </div>
                <div>
                  <FieldLabel>PRICE ₹ (0 = free)</FieldLabel>
                  <input type="number" value={c.price} onChange={e=>{const v=Number(e.target.value);upCourse(c.id,{price:v,free:v===0});}} style={{...IS,width:"100%"}}/>
                </div>
                <div>
                  <FieldLabel>ORIGINAL ₹ (optional)</FieldLabel>
                  <input type="number" value={c.originalPrice ?? ""} onChange={e=>upCourse(c.id,{originalPrice:e.target.value?Number(e.target.value):undefined})} style={{...IS,width:"100%"}}/>
                </div>
                <div style={{ gridColumn:"1 / -1" }}>
                  <FieldLabel>TAGLINE</FieldLabel>
                  <input value={c.tagline} onChange={e=>upCourse(c.id,{tagline:e.target.value})} style={{...IS,width:"100%"}}/>
                </div>
                <div>
                  <FieldLabel>BADGE (optional)</FieldLabel>
                  <input value={c.badge ?? ""} onChange={e=>upCourse(c.id,{badge:e.target.value||undefined})} placeholder="New" style={{...IS,width:"100%"}}/>
                </div>
                <div style={{ gridColumn:"1 / -1" }}>
                  <FieldLabel>COURSE ACCESS URL (delivered in My Library)</FieldLabel>
                  <input value={c.accessUrl} onChange={e=>upCourse(c.id,{accessUrl:e.target.value})} placeholder="Course platform / unlisted playlist link" style={{...IS,width:"100%"}}/>
                </div>
                <div style={{ gridColumn:"1 / -1" }}>
                  <FieldLabel>FEATURES — one per line</FieldLabel>
                  <textarea
                    value={c.features.join("\n")}
                    onChange={e=>upCourse(c.id,{features:e.target.value.split("\n")})}
                    onBlur={e=>upCourse(c.id,{features:e.target.value.split("\n").map(f=>f.trim()).filter(Boolean)})}
                    rows={4}
                    style={{...IS,width:"100%",resize:"vertical",fontFamily:"inherit"}}
                  />
                </div>
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:18,marginTop:12,paddingTop:12,borderTop:"1px solid #1a1a1a" }}>
              <label style={{ display:"flex",alignItems:"center",gap:8,color:"#888",fontSize:12,fontWeight:700 }}>FREE <Toggle value={c.free} onChange={v=>upCourse(c.id,{free:v,price:v?0:c.price})}/></label>
              <label style={{ display:"flex",alignItems:"center",gap:8,color:"#888",fontSize:12,fontWeight:700 }}>VISIBLE <Toggle value={c.enabled} onChange={v=>upCourse(c.id,{enabled:v})}/></label>
              <div style={{ flex:1 }}/>
              <button onClick={()=>{ if(window.confirm(`Delete "${c.title}"?`)) setCourses(data.courses.filter(x=>x.id!==c.id)); }}
                style={{ background:"#2a0a0a",color:"#e63027",border:"none",borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:700 }}>🗑 Delete</button>
            </div>
          </div>
        ))}
        {data.courses.length === 0 && <Empty>No courses — click + Add Course</Empty>}
      </SectionCard>

      <SaveBar saved={saved} onSave={save} />
    </div>
  );
}

// ═══ USERS PANEL ═══════════════════════════════════════════════════════════════
interface AdminUser {
  uid: string;
  name: string;
  email: string;
  photo: string;
  lastLogin?: any;
  purchases: string[];
}

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [items, setItems] = useState<{ id: string; label: string; paid: boolean }[]>([]);
  const [grantFor, setGrantFor] = useState<string | null>(null);

  const load = async () => {
    try {
      const [uSnap, sSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDoc(doc(db, "store", "data")),
      ]);
      const us: AdminUser[] = uSnap.docs.map(d => {
        const x = d.data();
        return { uid: d.id, name: x.name || "", email: x.email || "", photo: x.photo || "", lastLogin: x.lastLogin, purchases: x.purchases || [] };
      });
      us.sort((a, b) => (b.lastLogin?.seconds || 0) - (a.lastLogin?.seconds || 0));
      setUsers(us);

      const sd = sSnap.exists() ? (sSnap.data() as Partial<StoreData>) : SEED_STORE;
      setItems([
        ...(sd.products || SEED_STORE.products).map(p => ({ id: p.id, label: `📦 ${p.name}`, paid: !p.free })),
        ...(sd.courses || SEED_STORE.courses).map(c => ({ id: c.id, label: `🎓 ${c.title}`, paid: !c.free })),
      ]);
    } catch (e) {
      console.error(e);
      setUsers([]);
    }
  };

  useEffect(() => { load(); }, []);

  const grant = async (uid: string, itemId: string) => {
    await updateDoc(doc(db, "users", uid), { purchases: arrayUnion(itemId) });
    setUsers(us => us!.map(u => u.uid === uid ? { ...u, purchases: [...new Set([...u.purchases, itemId])] } : u));
    setGrantFor(null);
  };

  const revoke = async (uid: string, itemId: string) => {
    if (!window.confirm("Remove this item from the user's library?")) return;
    await updateDoc(doc(db, "users", uid), { purchases: arrayRemove(itemId) });
    setUsers(us => us!.map(u => u.uid === uid ? { ...u, purchases: u.purchases.filter(p => p !== itemId) } : u));
  };

  const labelOf = (id: string) => items.find(i => i.id === id)?.label || id;
  const fmtDate = (ts: any) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div>
      <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:30,letterSpacing:3,margin:"0 0 4px" }}>
        LOGGED-IN <span style={{ color:"#e63027" }}>USERS</span>
      </h1>
      <p style={{ color:"#555",fontSize:13,marginBottom:8 }}>Everyone who logged in on the website appears here automatically.</p>
      <p style={{ color:"#888",fontSize:13,marginBottom:18,background:"#111",border:"1px solid #1e1e1e",borderRadius:10,padding:"10px 14px" }}>
        💡 When a customer pays you on WhatsApp, click <b style={{color:"#22c55e"}}>+ Grant Access</b> on their row and pick the product/course — it instantly appears in their <b>My Library</b> with the download link.
      </p>

      <SectionCard title={`USERS (${users?.length ?? "…"})`} icon="👥" action={<Btn onClick={load} color="#3b82f6">↻ Refresh</Btn>}>
        {users === null && <div style={{ color:"#555" }}>Loading…</div>}
        {users?.length === 0 && <Empty>No users have logged in yet</Empty>}
        {users?.map(u => (
          <div key={u.uid} style={{ background:"#0d0d0d",border:"1px solid #222",borderRadius:12,padding:14,marginBottom:10 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              {u.photo
                ? <img src={u.photo} alt="" referrerPolicy="no-referrer" style={{ width:40,height:40,borderRadius:"50%",border:"2px solid #e6302760" }}/>
                : <div style={{ width:40,height:40,borderRadius:"50%",background:"#1e1e1e",display:"flex",alignItems:"center",justifyContent:"center" }}>👤</div>}
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,color:"#fff",fontSize:14 }}>{u.name || "(no name)"}</div>
                <div style={{ color:"#666",fontSize:12,overflow:"hidden",textOverflow:"ellipsis" }}>{u.email}</div>
              </div>
              <div style={{ color:"#555",fontSize:11,textAlign:"right" }}>
                <div>Last login</div>
                <div style={{ color:"#888" }}>{fmtDate(u.lastLogin)}</div>
              </div>
              <Btn onClick={() => setGrantFor(grantFor === u.uid ? null : u.uid)} color="#22c55e">+ Grant Access</Btn>
            </div>

            {/* Purchases */}
            {u.purchases.length > 0 && (
              <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginTop:10 }}>
                {u.purchases.map(pid => (
                  <span key={pid} style={{ background:"#16210f",border:"1px solid #22c55e33",color:"#22c55e",borderRadius:20,padding:"4px 10px",fontSize:12,display:"flex",alignItems:"center",gap:6 }}>
                    {labelOf(pid)}
                    <button onClick={() => revoke(u.uid, pid)} style={{ background:"none",border:"none",color:"#e63027",cursor:"pointer",fontSize:12,padding:0 }}>✕</button>
                  </span>
                ))}
              </div>
            )}

            {/* Grant dropdown */}
            {grantFor === u.uid && (
              <div style={{ marginTop:10,background:"#111",border:"1px solid #2a2a2a",borderRadius:10,padding:10,display:"flex",flexWrap:"wrap",gap:6 }}>
                {items.filter(i => !u.purchases.includes(i.id)).map(i => (
                  <button key={i.id} onClick={() => grant(u.uid, i.id)}
                    style={{ background:"#1a1a1a",border:"1px solid #333",color:"#ccc",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12 }}>
                    {i.label} {i.paid ? "" : "(free)"}
                  </button>
                ))}
                {items.filter(i => !u.purchases.includes(i.id)).length === 0 && (
                  <span style={{ color:"#555",fontSize:12 }}>User already owns everything 🎉</span>
                )}
              </div>
            )}
          </div>
        ))}
      </SectionCard>
    </div>
  );
}
