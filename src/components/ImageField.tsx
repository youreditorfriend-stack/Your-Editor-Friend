import { useRef, useState } from "react";

const IS: React.CSSProperties = { background:"#0d0d0d",border:"1px solid #2a2a2a",borderRadius:8,padding:"7px 11px",color:"#fff",fontSize:13,outline:"none" };

// Upload an image straight from the computer to Cloudflare R2, or paste a URL.
// The admin password (already in sessionStorage after login) authorises the upload.
export function ImageField({
  value,
  onChange,
  aspect = "square",
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  aspect?: "square" | "video";
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const upload = async (file: File) => {
    setErr("");
    if (!file.type.startsWith("image/")) { setErr("Pick an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { setErr("Image must be under 10 MB"); return; }

    setBusy(true);
    setPct(0);
    try {
      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          adminPassword: sessionStorage.getItem("adminPassword") || "",
        }),
      });

      if (res.status === 503) throw new Error("Uploads aren't set up yet — paste an image URL instead");
      if (res.status === 401) throw new Error("Not authorised — log out and log in again");
      if (!res.ok) throw new Error("Could not start the upload");

      const { uploadUrl, publicUrl } = await res.json();

      // XHR so we get real progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
        xhr.onerror = () => reject(new Error("Upload failed — check your connection"));
        xhr.send(file);
      });

      onChange(publicUrl);
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setBusy(false);
      setPct(0);
    }
  };

  const previewStyle: React.CSSProperties = {
    width: aspect === "square" ? 96 : 150,
    height: aspect === "square" ? 96 : 84,
    borderRadius: 10,
    overflow: "hidden",
    background: "#161616",
    border: `1px ${dragOver ? "solid #e63027" : "dashed #2a2a2a"}`,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: busy ? "wait" : "pointer",
    position: "relative",
    transition: "border-color .15s",
  };

  return (
    <div>
      <div style={{ color:"#666",fontSize:10,letterSpacing:1,fontWeight:700,marginBottom:4 }}>{label}</div>
      <div style={{ display:"flex",gap:12,alignItems:"flex-start" }}>
        {/* Click / drop zone with preview */}
        <div
          style={previewStyle}
          onClick={() => !busy && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) upload(f);
          }}
        >
          {value && !busy ? (
            <img src={value} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
          ) : busy ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ color:"#e63027",fontSize:16,fontWeight:800 }}>{pct}%</div>
              <div style={{ color:"#555",fontSize:9,letterSpacing:1 }}>UPLOADING</div>
            </div>
          ) : (
            <div style={{ textAlign:"center",color:"#444" }}>
              <div style={{ fontSize:20 }}>🖼️</div>
              <div style={{ fontSize:9,letterSpacing:1,fontWeight:700 }}>UPLOAD</div>
            </div>
          )}
        </div>

        {/* Buttons + URL fallback */}
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",gap:6,marginBottom:6 }}>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              style={{ background:"#22c55e18",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:8,padding:"6px 14px",cursor:busy?"wait":"pointer",fontWeight:700,fontSize:12 }}
            >
              {busy ? "Uploading…" : value ? "↻ Replace" : "⬆ Upload image"}
            </button>
            {value && !busy && (
              <button
                onClick={() => onChange("")}
                style={{ background:"#2a0a0a",color:"#e63027",border:"1px solid #e6302744",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontWeight:700,fontSize:12 }}
              >
                Remove
              </button>
            )}
          </div>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="…or paste an image URL"
            style={{ ...IS, width:"100%", fontSize:12 }}
          />
          <div style={{ color:"#444",fontSize:10,marginTop:4 }}>
            {aspect === "square" ? "Square image works best (1:1)" : "Wide image works best (16:9, like a YouTube thumbnail)"} · drag &amp; drop supported · max 10 MB
          </div>
          {err && (
            <div style={{ background:"#2a0a0a",border:"1px solid #e6302744",borderRadius:8,padding:"6px 10px",color:"#e63027",fontSize:11,marginTop:6 }}>⚠ {err}</div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display:"none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
      />
    </div>
  );
}
