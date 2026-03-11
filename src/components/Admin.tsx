import { useState, useRef, useEffect } from "react";

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────
const INIT_PROJECTS = [
  { id: 1, category: "personal_branding", title: "If You Fulfill This Need",  link: "https://youtube.com/shorts/ex1", enabled: true },
  { id: 2, category: "personal_branding", title: "Ram Music x Pink Floyd",    link: "https://youtube.com/shorts/ex2", enabled: true },
  { id: 3, category: "personal_branding", title: "Content Creator Tips",      link: "https://youtube.com/shorts/ex3", enabled: true },
  { id: 4, category: "ai_advertisement",  title: "AI Ad Campaign Vol 1",      link: "https://youtube.com/shorts/ex4", enabled: true },
  { id: 5, category: "real_estate",       title: "Luxury Villa Tour",         link: "https://youtube.com/shorts/ex5", enabled: false },
  { id: 6, category: "motion_graphics",   title: "Brand Identity Reel",       link: "https://youtube.com/shorts/ex6", enabled: true },
];
const INIT_CATEGORIES = [
  { id: "personal_branding", label: "PERSONAL BRANDING", enabled: true },
  { id: "ai_advertisement",  label: "AI ADVERTISEMENT",  enabled: true },
  { id: "real_estate",       label: "REAL ESTATE",       enabled: true },
  { id: "motion_graphics",   label: "MOTION GRAPHICS",   enabled: true },
];
const INIT_STYLES = [
  { id: "personal_branding", label: "PERSONAL BRANDING", enabled: true, title: "Personal Branding",
    description: "High-retention talking head videos with dynamic captions.", basePrice: 3000,
    previewLink: "https://youtube.com/shorts/ex1",
    variations: [
      { id: "v1", label: "Style A - Basic Captions",        price: 3000,  enabled: true },
      { id: "v2", label: "Style B - Advanced Graphics",     price: 5000,  enabled: true },
      { id: "v3", label: "Style C - Cinematic Storytelling",price: 8000,  enabled: true },
    ]},
  { id: "real_estate", label: "REAL ESTATE", enabled: true, title: "Real Estate",
    description: "Property showcase with smooth transitions and overlays.", basePrice: 4000,
    previewLink: "https://youtube.com/shorts/ex2",
    variations: [
      { id: "v1", label: "Style A - Basic Tour",        price: 4000,  enabled: true },
      { id: "v2", label: "Style B - Aerial + Ground",   price: 7000,  enabled: true },
      { id: "v3", label: "Style C - Luxury Cinematic",  price: 12000, enabled: true },
    ]},
  { id: "ai_advertisement", label: "AI ADVERTISEMENT", enabled: true, title: "AI Advertisement",
    description: "AI-powered ad creatives with motion graphics.", basePrice: 5000,
    previewLink: "https://youtube.com/shorts/ex3",
    variations: [
      { id: "v1", label: "Style A - Basic AI Ad",     price: 5000,  enabled: true },
      { id: "v2", label: "Style B - AI + VFX",        price: 8000,  enabled: true },
      { id: "v3", label: "Style C - Full Production", price: 15000, enabled: true },
    ]},
  { id: "motion_graphics", label: "MOTION GRAPHICS", enabled: true, title: "Motion Graphics",
    description: "Animated explainers, logo reveals, kinetic typography.", basePrice: 6000,
    previewLink: "https://youtube.com/shorts/ex4",
    variations: [
      { id: "v1", label: "Style A - Logo Animation",   price: 6000,  enabled: true },
      { id: "v2", label: "Style B - Explainer Video",  price: 10000, enabled: true },
      { id: "v3", label: "Style C - Full Motion Reel", price: 18000, enabled: true },
    ]},
];
const INIT_ADDONS = [
  { id: "fast_delivery", label: "Need fast delivery ⚡", enabled: true },
  { id: "thumbnails",    label: "Provide Thumbnails 🖼️", enabled: true },
];
const INIT_FORM_FIELDS = [
  { id: "slider",      label: "Videos Per Month Slider", enabled: true },
  { id: "addons_blk",  label: "Quick Add-ons Block",     enabled: true },
  { id: "refLink",     label: "Reference Video Link",    enabled: true },
  { id: "specificReq", label: "Specific Requirements",   enabled: true },
  { id: "fullName",    label: "Full Name Field",         enabled: true },
  { id: "whatsapp",    label: "WhatsApp Number Field",   enabled: true },
];

// ─── DRAG LIST HOOK ───────────────────────────────────────────────────────────
function useDragList(list: any[], setList: (list: any[]) => void) {
  const from = useRef<number | null>(null);
  return {
    onDragStart: (i) => { from.current = i; },
    onDragOver:  (e) => e.preventDefault(),
    onDrop: (i) => {
      if (from.current === null || from.current === i) { from.current = null; return; }
      const next = [...list];
      const [item] = next.splice(from.current, 1);
      next.splice(i, 0, item);
      setList(next);
      from.current = null;
    },
  };
}

// ─── ATOMS ───────────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)} style={{
    width:44, height:24, borderRadius:12, border:"none", cursor:"pointer", flexShrink:0,
    background:value?"#e63027":"#333", position:"relative", transition:"background .2s",
  }}>
    <div style={{ width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:value?23:3,transition:"left .2s" }}/>
  </button>
);

const Btn = ({ children, onClick, color="#e63027", style={} }) => (
  <button onClick={onClick} style={{
    background:color+"18", color, border:`1px solid ${color}44`,
    borderRadius:8, padding:"6px 14px", cursor:"pointer", fontWeight:700,
    fontSize:13, display:"flex", alignItems:"center", gap:5, ...style,
  }}>{children}</button>
);

const DragHandle = () => (
  <span style={{ color:"#3a3a3a",fontSize:18,cursor:"grab",userSelect:"none",flexShrink:0 }}>⠿</span>
);

const Num = ({ n }) => (
  <div style={{ width:26,height:26,borderRadius:"50%",background:"#1e1e1e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#555",flexShrink:0 }}>{n}</div>
);

const MLabel = ({ children }) => (
  <div style={{ color:"#666",fontSize:11,letterSpacing:1.2,fontWeight:700,marginBottom:6 }}>{children}</div>
);

const Empty = ({ children }) => (
  <div style={{ textAlign:"center",color:"#444",padding:"22px",border:"1px dashed #222",borderRadius:10,fontSize:13 }}>{children}</div>
);

const IS = { background:"#0d0d0d",border:"1px solid #2a2a2a",borderRadius:8,padding:"7px 11px",color:"#fff",fontSize:13,outline:"none" };

const SectionCard = ({ title, icon, children, action }) => (
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

const DragRow = ({ index, drag, children, highlight = false }: { index: number, drag: any, children: React.ReactNode, highlight?: boolean }) => (
  <div
    draggable
    onDragStart={() => drag.onDragStart(index)}
    onDragOver={drag.onDragOver}
    onDrop={() => drag.onDrop(index)}
    style={{ display:"flex",alignItems:"center",gap:9,background:highlight?"#180e0e":"#161616",border:`1px solid ${highlight?"#e63027":"#222"}`,borderRadius:10,padding:"10px 12px",marginBottom:8,cursor:"grab",transition:"border-color .12s" }}
  >{children}</div>
);

// ─── MODAL SHELL ──────────────────────────────────────────────────────────────
const Modal = ({ title, icon, onClose, children, footer, maxWidth=480 }: { title: string, icon: React.ReactNode, onClose: () => void, children: React.ReactNode, footer?: React.ReactNode, maxWidth?: number }) => {
  const bg = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return (
    <div ref={bg} onClick={e => { if (e.target===bg.current) onClose(); }} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(5px)" }}>
      <div style={{ background:"#111",border:"1px solid #2a2a2a",borderRadius:20,width:"100%",maxWidth,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,.9)",animation:"slideUp .18s ease" }}>
        <div style={{ background:"#0d0d0d",borderBottom:"1px solid #1e1e1e",padding:"18px 26px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:9 }}>
            <span style={{ fontSize:22 }}>{icon}</span>
            <span style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:2,color:"#fff" }}>{title}</span>
          </div>
          <button onClick={onClose} style={{ background:"#1a1a1a",border:"1px solid #333",borderRadius:8,color:"#777",fontSize:16,width:32,height:32,cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
        {footer && <div style={{ padding:"14px 24px 22px",borderTop:"1px solid #1a1a1a",display:"flex",gap:8,justifyContent:"flex-end" }}>{footer}</div>}
      </div>
    </div>
  );
};

// ─── MAIN ADMIN ───────────────────────────────────────────────────────────────
export default function Admin() {
  const [tab, setTab]               = useState("overview");
  const [projects,   setProjects]   = useState(INIT_PROJECTS);
  const [categories, setCategories] = useState(INIT_CATEGORIES);
  const [styles,     setStyles]     = useState(INIT_STYLES);
  const [addons,     setAddons]     = useState(INIT_ADDONS);
  const [formFields, setFormFields] = useState(INIT_FORM_FIELDS);
  const [filterCat,  setFilterCat]  = useState("all");
  const [saved,      setSaved]      = useState(false);
  const [modal,      setModal]      = useState(null);
  const [editMap,    setEditMap]    = useState({});

  const openModal = (type, data=null) => setModal({ type, data });
  const closeModal = () => setModal(null);

  // inline edit helpers
  const startEdit = (k, v) => setEditMap(m => ({ ...m, [k]: v }));
  const endEdit   = (k)    => setEditMap(m => { const n={...m}; delete n[k]; return n; });
  const isEditing = (k)    => editMap[k] !== undefined;

  // ── Projects ──────────────────────────────────────────────────────────────
  const projDragFrom = useRef(null);
  const filteredProjs = filterCat==="all" ? projects : projects.filter(p=>p.category===filterCat);
  const updateProj = (id, ch) => setProjects(ps => ps.map(p=>p.id===id?{...p,...ch}:p));
  const deleteProj = (id)     => setProjects(ps => ps.filter(p=>p.id!==id));
  const addProj    = (p)      => setProjects(ps => [...ps, { ...p, id:Date.now() }]);
  const projDragOps = {
    onDragStart: (i) => { projDragFrom.current=i; },
    onDragOver:  (e) => e.preventDefault(),
    onDrop: (dropIdx) => {
      const fi=projDragFrom.current;
      if(fi===null||fi===dropIdx){projDragFrom.current=null;return;}
      const all=[...projects];
      const fromId=filteredProjs[fi].id, toId=filteredProjs[dropIdx].id;
      const a=all.findIndex(p=>p.id===fromId), b=all.findIndex(p=>p.id===toId);
      const [item]=all.splice(a,1); all.splice(b,0,item);
      setProjects(all); projDragFrom.current=null;
    },
  };

  // ── Categories ────────────────────────────────────────────────────────────
  const catDrag   = useDragList(categories, setCategories);
  const updateCat = (id, ch)  => setCategories(cs => cs.map(c=>c.id===id?{...c,...ch}:c));
  const deleteCat = (id)      => { setCategories(cs=>cs.filter(c=>c.id!==id)); setProjects(ps=>ps.filter(p=>p.category!==id)); if(filterCat===id)setFilterCat("all"); };
  const addCat    = (c)       => setCategories(cs=>[...cs,{...c,enabled:true}]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const styleDrag   = useDragList(styles, setStyles);
  const updateStyle = (id, ch) => setStyles(ss => ss.map(s=>s.id===id?{...s,...ch}:s));
  const deleteStyle = (id)     => setStyles(ss => ss.filter(s=>s.id!==id));
  const addStyle    = (s)      => setStyles(ss => [...ss, {...s, enabled:true, variations:[]}]);

  // ── Variations ────────────────────────────────────────────────────────────
  const varDragFrom = useRef({});
  const addVariation = (sid) => setStyles(ss=>ss.map(s=>s.id!==sid?s:{...s,variations:[...s.variations,{id:Date.now().toString(),label:"New Variation",price:0,enabled:true}]}));
  const updateVar    = (sid, vid, ch) => setStyles(ss=>ss.map(s=>s.id!==sid?s:{...s,variations:s.variations.map(v=>v.id===vid?{...v,...ch}:v)}));
  const deleteVar    = (sid, vid)     => setStyles(ss=>ss.map(s=>s.id!==sid?s:{...s,variations:s.variations.filter(v=>v.id!==vid)}));
  const varDrop      = (sid, dropIdx) => {
    const fi=varDragFrom.current[sid];
    if(fi===undefined||fi===dropIdx){varDragFrom.current[sid]=undefined;return;}
    setStyles(ss=>ss.map(s=>{
      if(s.id!==sid)return s;
      const vs=[...s.variations];
      const [item]=vs.splice(fi,1); vs.splice(dropIdx,0,item);
      varDragFrom.current[sid]=undefined;
      return {...s,variations:vs};
    }));
  };

  // ── Add-ons ───────────────────────────────────────────────────────────────
  const addonDrag   = useDragList(addons, setAddons);
  const updateAddon = (id, ch) => setAddons(a=>a.map(x=>x.id===id?{...x,...ch}:x));
  const deleteAddon = (id)     => setAddons(a=>a.filter(x=>x.id!==id));
  const addAddon    = ()       => setAddons(a=>[...a,{id:Date.now().toString(),label:"New Add-on",enabled:true}]);

  // ── Form Fields ───────────────────────────────────────────────────────────
  const fieldDrag   = useDragList(formFields, setFormFields);
  const updateField = (id, ch) => setFormFields(f=>f.map(x=>x.id===id?{...x,...ch}:x));
  const deleteField = (id)     => setFormFields(f=>f.filter(x=>x.id!==id));
  const addField    = ()       => setFormFields(f=>[...f,{id:Date.now().toString(),label:"New Field",enabled:true}]);

  const handleSave = async () => {
    try {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            portfolio: categories.map(c => ({
              ...c,
              projects: projects.filter(p => p.category === c.id)
            })),
            styles: styles,
            addons: addons,
            formFields: formFields
          }
        })
      });
      if (!response.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save changes. Please try again.");
    }
  };

  const NAV = [
    { id:"overview", label:"Overview",       icon:"📊" },
    { id:"projects", label:"Recent Projects",icon:"🎬" },
    { id:"quote",    label:"Custom Quote",   icon:"💰" },
  ];

  return (
    <div style={{ minHeight:"100vh",background:"#080808",color:"#fff",fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>

      {/* MODALS */}
      {modal?.type==="add_video" && <AddVideoModal categories={categories} onAdd={p=>{addProj(p);closeModal();}} onClose={closeModal}/>}
      {modal?.type==="add_cat"   && <AddCatModal   onAdd={c=>{addCat(c);closeModal();}}   onClose={closeModal}/>}
      {modal?.type==="add_style" && <AddStyleModal  onAdd={s=>{addStyle(s);closeModal();}} onClose={closeModal}/>}

      {/* NAV */}
      <div style={{ background:"#0d0d0d",borderBottom:"1px solid #1a1a1a",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",height:60,position:"sticky",top:0,zIndex:100 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:30,height:30,background:"#e63027",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',cursive",fontSize:17,color:"#fff" }}>V</div>
          <span style={{ fontFamily:"'Bebas Neue',cursive",fontSize:21,letterSpacing:3 }}>VEDITS <span style={{ color:"#e63027" }}>ADMIN</span></span>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          {saved && <span style={{ background:"#0d2a0d",border:"1px solid #22c55e44",color:"#22c55e",borderRadius:7,padding:"5px 14px",fontSize:13,fontWeight:600 }}>✓ Saved!</span>}
          <button onClick={handleSave} style={{ background:"#e63027",color:"#fff",border:"none",borderRadius:8,padding:"7px 20px",cursor:"pointer",fontWeight:700,fontSize:14 }}>Save Changes</button>
        </div>
      </div>

      <div style={{ display:"flex",minHeight:"calc(100vh - 60px)" }}>
        {/* SIDEBAR */}
        <div style={{ width:210,background:"#0d0d0d",borderRight:"1px solid #1a1a1a",padding:"20px 10px",flexShrink:0,position:"sticky",top:60,height:"calc(100vh - 60px)",overflowY:"auto" }}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)} style={{
              width:"100%",display:"flex",alignItems:"center",gap:9,
              background:tab===n.id?"#e6302715":"transparent",
              border:tab===n.id?"1px solid #e6302740":"1px solid transparent",
              borderRadius:9,padding:"11px 13px",cursor:"pointer",
              color:tab===n.id?"#e63027":"#555",fontWeight:tab===n.id?700:400,
              fontSize:14,marginBottom:4,textAlign:"left",transition:"all .13s",
            }}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div style={{ flex:1,padding:"28px 32px",overflowY:"auto" }}>

          {/* ══ OVERVIEW ══ */}
          {tab==="overview" && (
            <div>
              <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:34,letterSpacing:3,margin:"0 0 6px" }}>WELCOME BACK <span style={{ color:"#e63027" }}>ADMIN</span></h1>
              <p style={{ color:"#555",marginBottom:28,fontSize:14 }}>Every section of your website is manageable below.</p>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:28 }}>
                {[
                  { label:"Total Videos",  v:projects.length,                       icon:"🎬",c:"#e63027"},
                  { label:"Active Videos", v:projects.filter(p=>p.enabled).length,  icon:"✅",c:"#22c55e"},
                  { label:"Active Styles", v:styles.filter(s=>s.enabled).length,    icon:"🎨",c:"#3b82f6"},
                  { label:"Form Sections", v:formFields.filter(f=>f.enabled).length,icon:"📋",c:"#f59e0b"},
                ].map(s=>(
                  <div key={s.label} style={{ background:"#111",border:"1px solid #1e1e1e",borderRadius:14,padding:"18px 20px" }}>
                    <div style={{ fontSize:26,marginBottom:6 }}>{s.icon}</div>
                    <div style={{ fontSize:30,fontWeight:800,color:s.c }}>{s.v}</div>
                    <div style={{ color:"#555",fontSize:13 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                {[
                  {label:"Manage Recent Projects",sub:"Videos, categories, ordering",t:"projects",icon:"🎬"},
                  {label:"Customize Quote Page",  sub:"Styles, pricing, form fields", t:"quote",   icon:"💰"},
                ].map(c=>(
                  <button key={c.t} onClick={()=>setTab(c.t)} style={{ background:"#111",border:"1px solid #1e1e1e",borderRadius:14,padding:20,cursor:"pointer",textAlign:"left",transition:"border-color .15s" }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor="#e63027"}
                    onMouseLeave={e=>e.currentTarget.style.borderColor="#1e1e1e"}>
                    <div style={{ fontSize:26,marginBottom:8 }}>{c.icon}</div>
                    <div style={{ color:"#fff",fontWeight:700,marginBottom:3 }}>{c.label}</div>
                    <div style={{ color:"#555",fontSize:13 }}>{c.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ══ RECENT PROJECTS ══ */}
          {tab==="projects" && (
            <div>
              <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:30,letterSpacing:3,margin:"0 0 4px" }}>RECENT <span style={{ color:"#e63027" }}>PROJECTS</span></h1>
              <p style={{ color:"#555",fontSize:13,marginBottom:22 }}>Drag ⠿ to reorder • Toggle • Edit inline • Add / Delete</p>

              {/* CATEGORIES */}
              <SectionCard title="CATEGORY TABS" icon="🗂️" action={<Btn onClick={()=>openModal("add_cat")} color="#3b82f6">+ Add Category</Btn>}>
                <p style={{ color:"#555",fontSize:12,marginBottom:12 }}>Drag to reorder tabs shown on the main site</p>
                {categories.map((cat,i) => (
                  <DragRow key={cat.id} index={i} drag={catDrag}>
                    <DragHandle/><Num n={i+1}/>
                    <div style={{ flex:1 }}>
                      {isEditing(`cat_${cat.id}`) ? (
                        <input value={editMap[`cat_${cat.id}`]}
                          onChange={e => startEdit(`cat_${cat.id}`, e.target.value)}
                          onBlur={() => { updateCat(cat.id,{label:editMap[`cat_${cat.id}`].toUpperCase()}); endEdit(`cat_${cat.id}`); }}
                          onKeyDown={e => { if(e.key==="Enter"){updateCat(cat.id,{label:editMap[`cat_${cat.id}`].toUpperCase()});endEdit(`cat_${cat.id}`);}}}
                          autoFocus style={{...IS,width:"100%"}}/>
                      ) : (
                        <span style={{ fontWeight:700,color:cat.enabled?"#fff":"#444",fontSize:14 }}>{cat.label}</span>
                      )}
                    </div>
                    <Toggle value={cat.enabled} onChange={v=>updateCat(cat.id,{enabled:v})}/>
                    <button onClick={()=>startEdit(`cat_${cat.id}`,cat.label)} style={{ background:"#1a1a2a",color:"#3b82f6",border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:13 }}>✏️</button>
                    <button onClick={()=>{if(window.confirm(`Delete "${cat.label}"? Its videos will also be removed.`))deleteCat(cat.id);}} style={{ background:"#2a0a0a",color:"#e63027",border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:13 }}>🗑</button>
                  </DragRow>
                ))}
                {categories.length===0 && <Empty>No categories — click + Add Category</Empty>}
              </SectionCard>

              {/* VIDEOS */}
              <SectionCard title="VIDEO MANAGEMENT" icon="🎬" action={<Btn onClick={()=>openModal("add_video")} color="#22c55e">+ Add Video</Btn>}>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:14 }}>
                  {[{id:"all",label:"ALL"},...categories].map(c=>(
                    <button key={c.id} onClick={()=>setFilterCat(c.id)} style={{
                      background:filterCat===c.id?"#e63027":"#1a1a1a",color:filterCat===c.id?"#fff":"#666",
                      border:"none",borderRadius:7,padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:700,letterSpacing:1,
                    }}>{c.label||c.id.toUpperCase()}</button>
                  ))}
                </div>
                <p style={{ color:"#555",fontSize:12,marginBottom:10 }}>Showing {filteredProjs.length} videos — drag ⠿ to reorder</p>
                {filteredProjs.map((p,i)=>(
                  <DragRow key={p.id} index={i} drag={projDragOps}>
                    <DragHandle/><Num n={i+1}/>
                    <div style={{ flex:1,minWidth:0 }}>
                      {isEditing(`pv_t_${p.id}`) ? (
                        <input value={editMap[`pv_t_${p.id}`]} onChange={e=>startEdit(`pv_t_${p.id}`,e.target.value)}
                          onBlur={()=>{updateProj(p.id,{title:editMap[`pv_t_${p.id}`]});endEdit(`pv_t_${p.id}`);}}
                          autoFocus style={{...IS,width:"100%",marginBottom:4}}/>
                      ) : (
                        <div style={{ fontWeight:600,color:"#fff",fontSize:14,marginBottom:2 }}>{p.title}</div>
                      )}
                      {isEditing(`pv_l_${p.id}`) ? (
                        <input value={editMap[`pv_l_${p.id}`]} onChange={e=>startEdit(`pv_l_${p.id}`,e.target.value)}
                          onBlur={()=>{updateProj(p.id,{link:editMap[`pv_l_${p.id}`]});endEdit(`pv_l_${p.id}`);}}
                          placeholder="Video link" style={{...IS,width:"100%",fontSize:12}}/>
                      ) : (
                        <div style={{ color:"#444",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.link||"No link"}</div>
                      )}
                    </div>
                    <Toggle value={p.enabled} onChange={v=>updateProj(p.id,{enabled:v})}/>
                    <button onClick={()=>{startEdit(`pv_t_${p.id}`,p.title);startEdit(`pv_l_${p.id}`,p.link);}} style={{ background:"#1a1a2a",color:"#3b82f6",border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:13,marginLeft:4 }}>✏️</button>
                    <button onClick={()=>deleteProj(p.id)} style={{ background:"#2a0a0a",color:"#e63027",border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:13 }}>🗑</button>
                  </DragRow>
                ))}
                {filteredProjs.length===0 && <Empty>No videos — click + Add Video</Empty>}
              </SectionCard>
            </div>
          )}

          {/* ══ CUSTOM QUOTE ══ */}
          {tab==="quote" && (
            <div>
              <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:30,letterSpacing:3,margin:"0 0 4px" }}>CUSTOM <span style={{ color:"#e63027" }}>QUOTE</span> PAGE</h1>
              <p style={{ color:"#555",fontSize:13,marginBottom:22 }}>Drag ⠿ to reorder • Add / Delete • Toggle on/off • Edit inline</p>

              {/* FORM FIELDS */}
              <SectionCard title="FORM FIELDS" icon="📋" action={<Btn onClick={addField} color="#f59e0b">+ Add Field</Btn>}>
                <p style={{ color:"#555",fontSize:12,marginBottom:12 }}>Drag to reorder fields shown on the quote form</p>
                {formFields.map((f,i)=>(
                  <DragRow key={f.id} index={i} drag={fieldDrag}>
                    <DragHandle/><Num n={i+1}/>
                    <div style={{ flex:1 }}>
                      {isEditing(`ff_${f.id}`) ? (
                        <input value={editMap[`ff_${f.id}`]} onChange={e=>startEdit(`ff_${f.id}`,e.target.value)}
                          onBlur={()=>{updateField(f.id,{label:editMap[`ff_${f.id}`]});endEdit(`ff_${f.id}`);}}
                          onKeyDown={e=>{if(e.key==="Enter"){updateField(f.id,{label:editMap[`ff_${f.id}`]});endEdit(`ff_${f.id}`);}}}
                          autoFocus style={{...IS,width:"100%"}}/>
                      ) : (
                        <span style={{ color:f.enabled?"#ccc":"#444",fontSize:14 }}>{f.label}</span>
                      )}
                    </div>
                    <Toggle value={f.enabled} onChange={v=>updateField(f.id,{enabled:v})}/>
                    <button onClick={()=>startEdit(`ff_${f.id}`,f.label)} style={{ background:"#1a1a2a",color:"#3b82f6",border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:13 }}>✏️</button>
                    <button onClick={()=>deleteField(f.id)} style={{ background:"#2a0a0a",color:"#e63027",border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:13 }}>🗑</button>
                  </DragRow>
                ))}
                {formFields.length===0 && <Empty>No fields — click + Add Field</Empty>}
              </SectionCard>

              {/* QUICK ADD-ONS */}
              <SectionCard title="QUICK ADD-ONS" icon="➕" action={<Btn onClick={addAddon} color="#a78bfa">+ Add Add-on</Btn>}>
                <p style={{ color:"#555",fontSize:12,marginBottom:12 }}>Drag to reorder add-on buttons on the form</p>
                {addons.map((a,i)=>(
                  <DragRow key={a.id} index={i} drag={addonDrag}>
                    <DragHandle/><Num n={i+1}/>
                    <div style={{ flex:1 }}>
                      {isEditing(`ao_${a.id}`) ? (
                        <input value={editMap[`ao_${a.id}`]} onChange={e=>startEdit(`ao_${a.id}`,e.target.value)}
                          onBlur={()=>{updateAddon(a.id,{label:editMap[`ao_${a.id}`]});endEdit(`ao_${a.id}`);}}
                          onKeyDown={e=>{if(e.key==="Enter"){updateAddon(a.id,{label:editMap[`ao_${a.id}`]});endEdit(`ao_${a.id}`);}}}
                          autoFocus style={{...IS,width:"100%"}}/>
                      ) : (
                        <span style={{ color:a.enabled?"#ccc":"#444",fontSize:14 }}>{a.label}</span>
                      )}
                    </div>
                    <Toggle value={a.enabled} onChange={v=>updateAddon(a.id,{enabled:v})}/>
                    <button onClick={()=>startEdit(`ao_${a.id}`,a.label)} style={{ background:"#1a1a2a",color:"#3b82f6",border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:13 }}>✏️</button>
                    <button onClick={()=>deleteAddon(a.id)} style={{ background:"#2a0a0a",color:"#e63027",border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:13 }}>🗑</button>
                  </DragRow>
                ))}
                {addons.length===0 && <Empty>No add-ons — click + Add Add-on</Empty>}
              </SectionCard>

              {/* STYLES */}
              <SectionCard title="STYLE CONFIGURATIONS" icon="🎨" action={<Btn onClick={()=>openModal("add_style")} color="#e63027">+ Add Style</Btn>}>
                <p style={{ color:"#555",fontSize:12,marginBottom:14 }}>Drag styles to reorder tabs • Expand each to edit pricing, variations</p>
                {styles.map((s,si)=>(
                  <div key={s.id}
                    draggable onDragStart={()=>styleDrag.onDragStart(si)} onDragOver={styleDrag.onDragOver} onDrop={()=>styleDrag.onDrop(si)}
                    style={{ background:"#0d0d0d",border:`1px solid ${s.enabled?"#252525":"#1a1a1a"}`,borderRadius:14,padding:18,marginBottom:14,opacity:s.enabled?1:0.6,cursor:"grab" }}>

                    {/* Header row */}
                    <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:14 }}>
                      <DragHandle/><Num n={si+1}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:2,color:"#fff" }}>{s.label}</div>
                        <div style={{ color:"#555",fontSize:12 }}>{s.variations.length} variations</div>
                      </div>
                      <Toggle value={s.enabled} onChange={v=>updateStyle(s.id,{enabled:v})}/>
                      <button onClick={()=>deleteStyle(s.id)} style={{ background:"#2a0a0a",color:"#e63027",border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:13 }}>🗑</button>
                    </div>

                    {/* Fields */}
                    <div style={{ display:"grid",gridTemplateColumns:"150px 1fr",gap:10,marginBottom:12 }}>
                      <div>
                        <MLabel>BASE PRICE (₹)</MLabel>
                        <input type="number" value={s.basePrice} onChange={e=>updateStyle(s.id,{basePrice:Number(e.target.value)})}
                          style={{...IS,width:"100%",fontWeight:700,color:"#e63027",fontSize:16}}/>
                      </div>
                      <div>
                        <MLabel>PREVIEW VIDEO LINK</MLabel>
                        <input value={s.previewLink} onChange={e=>updateStyle(s.id,{previewLink:e.target.value})}
                          placeholder="YouTube / Instagram link" style={{...IS,width:"100%"}}/>
                      </div>
                    </div>
                    <div style={{ marginBottom:14 }}>
                      <MLabel>DESCRIPTION</MLabel>
                      <input value={s.description} onChange={e=>updateStyle(s.id,{description:e.target.value})}
                        placeholder="Short description for clients" style={{...IS,width:"100%"}}/>
                    </div>

                    {/* Variations */}
                    <div style={{ background:"#111",borderRadius:10,padding:14 }}>
                      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                        <MLabel>VARIATIONS ({s.variations.length})</MLabel>
                        <Btn onClick={()=>addVariation(s.id)} color="#22c55e" style={{ padding:"4px 10px",fontSize:12 }}>+ Add Variation</Btn>
                      </div>
                      {s.variations.map((v,vi)=>(
                        <div key={v.id}
                          draggable
                          onDragStart={e=>{e.stopPropagation();varDragFrom.current[s.id]=vi;}}
                          onDragOver={e=>e.preventDefault()}
                          onDrop={e=>{e.stopPropagation();varDrop(s.id,vi);}}
                          style={{ display:"flex",alignItems:"center",gap:8,background:"#161616",border:"1px solid #1e1e1e",borderRadius:8,padding:"8px 10px",marginBottom:6,cursor:"grab" }}>
                          <DragHandle/><Num n={vi+1}/>
                          <input value={v.label} onChange={e=>updateVar(s.id,v.id,{label:e.target.value})}
                            style={{ flex:1,background:"transparent",border:"none",color:v.enabled?"#ccc":"#444",fontSize:13,outline:"none"}}/>
                          <span style={{ color:"#e63027",fontWeight:700,fontSize:13 }}>₹</span>
                          <input type="number" value={v.price} onChange={e=>updateVar(s.id,v.id,{price:Number(e.target.value)})}
                            style={{ width:80,background:"#0a0a0a",border:"1px solid #2a2a2a",borderRadius:6,padding:"4px 8px",color:"#e63027",fontSize:13,fontWeight:700,outline:"none"}}/>
                          <Toggle value={v.enabled} onChange={val=>updateVar(s.id,v.id,{enabled:val})}/>
                          <button onClick={()=>deleteVar(s.id,v.id)} style={{ background:"#2a0a0a",color:"#e63027",border:"none",borderRadius:6,width:26,height:26,cursor:"pointer",fontSize:12 }}>✕</button>
                        </div>
                      ))}
                      {s.variations.length===0 && <Empty>No variations — click + Add Variation</Empty>}
                    </div>
                  </div>
                ))}
                {styles.length===0 && <Empty>No styles — click + Add Style</Empty>}
              </SectionCard>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;}
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:#0a0a0a;}
        ::-webkit-scrollbar-thumb{background:#222;border-radius:3px;}
        input:focus{border-color:#e63027!important;}
        @keyframes slideUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
      `}</style>
    </div>
  );
}

// ─── ADD VIDEO MODAL ──────────────────────────────────────────────────────────
const AddVideoModal = ({ categories, onAdd, onClose }) => {
  const [form, setForm] = useState({ title:"",link:"",category:categories[0]?.id||"",enabled:true });
  const [err,  setErr]  = useState("");
  const inpS: React.CSSProperties = { background:"#0d0d0d",border:"1px solid #2a2a2a",borderRadius:10,padding:"10px 14px",color:"#fff",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box" };
  const submit = () => {
    if(!form.title.trim()){setErr("Title is required");return;}
    if(!form.link.trim()) {setErr("Link is required");return;}
    onAdd(form);
  };
  return (
    <Modal title="ADD NEW VIDEO" icon="🎬" onClose={onClose}
      footer={<>
        <button onClick={onClose} style={{ background:"#1a1a1a",color:"#666",border:"1px solid #2a2a2a",borderRadius:9,padding:"9px 20px",cursor:"pointer",fontWeight:600 }}>Cancel</button>
        <button onClick={submit}  style={{ background:"#e63027",color:"#fff",border:"none",borderRadius:9,padding:"9px 24px",cursor:"pointer",fontWeight:700 }}>+ Add Video</button>
      </>}>
      <MLabel>VIDEO TITLE *</MLabel>
      <input autoFocus value={form.title} onChange={e=>{setForm(f=>({...f,title:e.target.value}));setErr("");}} placeholder="e.g. If You Fulfill This Need" style={{...inpS,marginBottom:14}}/>
      <MLabel>VIDEO LINK *</MLabel>
      <input value={form.link} onChange={e=>{setForm(f=>({...f,link:e.target.value}));setErr("");}} placeholder="https://youtube.com/shorts/..." style={{...inpS,marginBottom:14}}/>
      <MLabel>CATEGORY</MLabel>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:14 }}>
        {categories.map(c=>(
          <button key={c.id} onClick={()=>setForm(f=>({...f,category:c.id}))} style={{
            background:form.category===c.id?"#e6302718":"#0d0d0d",
            border:`1px solid ${form.category===c.id?"#e63027":"#2a2a2a"}`,
            borderRadius:9,padding:"9px 12px",cursor:"pointer",
            color:form.category===c.id?"#e63027":"#555",fontSize:12,fontWeight:700,textAlign:"left",
          }}>{form.category===c.id?"✓ ":""}{c.label}</button>
        ))}
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0d0d0d",border:"1px solid #222",borderRadius:9,padding:"10px 14px" }}>
        <span style={{ color:"#ccc",fontSize:13 }}>{form.enabled?"Visible":"Hidden"} on website</span>
        <Toggle value={form.enabled} onChange={v=>setForm(f=>({...f,enabled:v}))}/>
      </div>
      {err && <div style={{ background:"#2a0a0a",border:"1px solid #e6302744",borderRadius:8,padding:"9px 13px",color:"#e63027",fontSize:13,marginTop:10 }}>⚠ {err}</div>}
    </Modal>
  );
};

// ─── ADD CATEGORY MODAL ───────────────────────────────────────────────────────
const AddCatModal = ({ onAdd, onClose }) => {
  const [label, setLabel] = useState("");
  const [err,   setErr]   = useState("");
  const toId = s => s.toLowerCase().trim().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
  const submit = () => { if(!label.trim()){setErr("Name is required");return;} onAdd({id:toId(label),label:label.toUpperCase().trim()}); };
  return (
    <Modal title="ADD CATEGORY" icon="🗂️" onClose={onClose} maxWidth={420}
      footer={<>
        <button onClick={onClose} style={{ background:"#1a1a1a",color:"#666",border:"1px solid #2a2a2a",borderRadius:9,padding:"9px 20px",cursor:"pointer",fontWeight:600 }}>Cancel</button>
        <button onClick={submit}  style={{ background:"#3b82f6",color:"#fff",border:"none",borderRadius:9,padding:"9px 24px",cursor:"pointer",fontWeight:700 }}>+ Add Category</button>
      </>}>
      <MLabel>CATEGORY NAME *</MLabel>
      <input autoFocus value={label} onChange={e=>{setLabel(e.target.value);setErr("");}} onKeyDown={e=>{if(e.key==="Enter")submit();}}
        placeholder="e.g. Wedding Films"
        style={{ background:"#0d0d0d",border:"1px solid #2a2a2a",borderRadius:10,padding:"11px 14px",color:"#fff",fontSize:15,width:"100%",outline:"none",boxSizing:"border-box",marginBottom:10 }}/>
      {label && <div style={{ color:"#555",fontSize:12,marginBottom:6 }}>ID: <span style={{ fontFamily:"monospace",color:"#777" }}>{toId(label)}</span></div>}
      {err && <div style={{ background:"#2a0a0a",border:"1px solid #e6302744",borderRadius:8,padding:"9px 13px",color:"#e63027",fontSize:13 }}>⚠ {err}</div>}
    </Modal>
  );
};

// ─── ADD STYLE MODAL ──────────────────────────────────────────────────────────
const AddStyleModal = ({ onAdd, onClose }) => {
  const [form,setForm] = useState({ label:"",description:"",basePrice:3000,previewLink:"" });
  const [err, setErr]  = useState("");
  const toId = s => s.toLowerCase().trim().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
  const inpS: React.CSSProperties = { background:"#0d0d0d",border:"1px solid #2a2a2a",borderRadius:10,padding:"10px 14px",color:"#fff",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",marginBottom:14 };
  const submit = () => { if(!form.label.trim()){setErr("Style name is required");return;} onAdd({...form,id:toId(form.label),label:form.label.toUpperCase().trim(),title:form.label}); };
  return (
    <Modal title="ADD NEW STYLE" icon="🎨" onClose={onClose}
      footer={<>
        <button onClick={onClose} style={{ background:"#1a1a1a",color:"#666",border:"1px solid #2a2a2a",borderRadius:9,padding:"9px 20px",cursor:"pointer",fontWeight:600 }}>Cancel</button>
        <button onClick={submit}  style={{ background:"#e63027",color:"#fff",border:"none",borderRadius:9,padding:"9px 24px",cursor:"pointer",fontWeight:700 }}>+ Add Style</button>
      </>}>
      <MLabel>STYLE NAME *</MLabel>
      <input autoFocus value={form.label} onChange={e=>{setForm(f=>({...f,label:e.target.value}));setErr("");}} placeholder="e.g. Podcast Editing" style={inpS}/>
      <MLabel>DESCRIPTION</MLabel>
      <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Short description for clients" style={inpS}/>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
        <div>
          <MLabel>BASE PRICE (₹)</MLabel>
          <input type="number" value={form.basePrice} onChange={e=>setForm(f=>({...f,basePrice:Number(e.target.value)}))} style={{...inpS,color:"#e63027",fontWeight:700}}/>
        </div>
        <div>
          <MLabel>PREVIEW LINK</MLabel>
          <input value={form.previewLink} onChange={e=>setForm(f=>({...f,previewLink:e.target.value}))} placeholder="YouTube / Instagram" style={inpS}/>
        </div>
      </div>
      <div style={{ color:"#555",fontSize:12,marginTop:-8 }}>Variations can be added after creating the style.</div>
      {err && <div style={{ background:"#2a0a0a",border:"1px solid #e6302744",borderRadius:8,padding:"9px 13px",color:"#e63027",fontSize:13,marginTop:10 }}>⚠ {err}</div>}
    </Modal>
  );
};
