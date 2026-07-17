import { useRef, useState } from "react";
import { CropModal } from "./CropModal";
import { adminAuthBody } from "../lib/adminAuth";

const IS: React.CSSProperties = { background:"#0d0d0d",border:"1px solid #2a2a2a",borderRadius:8,padding:"7px 11px",color:"#fff",fontSize:13,outline:"none" };

// Pick an image → crop it to the exact ratio this slot needs → upload to
// Cloudflare R2 through our own server (no bucket CORS involved).
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
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const pick = (file: File) => {
    setErr("");
    if (!file.type.startsWith("image/")) { setErr("Pick an image file"); return; }
    if (file.size > 25 * 1024 * 1024) { setErr("Image must be under 25 MB"); return; }
    setCropFile(file);
  };

  const upload = async (cropped: { data: string; contentType: string; filename: string }) => {
    setCropFile(null);
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cropped, ...(await adminAuthBody()) }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          body.error === "R2 not configured"
            ? `Storage isn't set up yet (missing: ${(body.missing || []).join(", ")}) — paste an image URL instead`
            : body.error || `Upload failed (${res.status})`
        );
      }
      onChange(body.url);
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setBusy(false);
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
      {cropFile && (
        <CropModal
          file={cropFile}
          aspect={aspect}
          onCancel={() => setCropFile(null)}
          onDone={upload}
        />
      )}

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
            if (f) pick(f);
          }}
        >
          {busy ? (
            <div style={{ textAlign:"center",padding:4 }}>
              <div style={{ color:"#e63027",fontSize:18 }}>⏳</div>
              <div style={{ color:"#666",fontSize:9,letterSpacing:.5 }}>Uploading…</div>
            </div>
          ) : value ? (
            <img src={value} alt="" style={{ width:"100%",height:"100%",objectFit:"contain" }}/>
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
              {busy ? "Uploading…" : value ? "↻ Replace" : "⬆ Upload & crop"}
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
            {aspect === "square" ? "Crops to 1080×1080 (1:1)" : "Crops to 1920×1080 (16:9)"} · JPG / PNG / WebP · transparent PNG supported
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
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }}
      />
    </div>
  );
}
