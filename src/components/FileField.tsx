import { useRef, useState } from "react";
import { adminAuthBody } from "../lib/adminAuth";

const IS: React.CSSProperties = { background:"#0d0d0d",border:"1px solid #2a2a2a",borderRadius:8,padding:"7px 11px",color:"#fff",fontSize:13,outline:"none" };

const prettySize = (b: number) =>
  b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`;

// Uploads a product file (ZIP, presets, LUTs…) straight to Cloudflare R2 using
// a presigned URL, so file size isn't limited by the serverless function.
// Falls back to pasting any link (Google Drive, Dropbox…).
export function FileField({
  value,
  onChange,
  label,
  hint,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  hint: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");
  const [name, setName] = useState("");

  const upload = async (file: File) => {
    setErr("");
    setBusy(true);
    setPct(0);
    setName(`${file.name} · ${prettySize(file.size)}`);
    try {
      const res = await fetch("/api/upload-file-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          ...(await adminAuthBody()),
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          body.error === "R2 not configured"
            ? `Storage isn't set up (missing: ${(body.missing || []).join(", ")})`
            : body.error || `Could not start the upload (${res.status})`
        );
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", body.uploadUrl);
        xhr.setRequestHeader("Content-Type", body.contentType);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Storage rejected the upload (${xhr.status})`));
        xhr.onerror = () =>
          reject(new Error("Upload blocked — the storage bucket needs a CORS rule for this site"));
        xhr.send(file);
      });

      onChange(body.publicUrl);
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setBusy(false);
      setPct(0);
    }
  };

  const uploadedToR2 = value.includes("r2.dev");

  return (
    <div>
      <div style={{ color:"#666",fontSize:10,letterSpacing:1,fontWeight:700,marginBottom:4 }}>{label}</div>

      <div style={{ display:"flex",gap:6,marginBottom:6 }}>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{ background:"#3b82f618",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:8,padding:"6px 14px",cursor:busy?"wait":"pointer",fontWeight:700,fontSize:12 }}
        >
          {busy ? `Uploading ${pct}%` : value ? "↻ Replace file" : "⬆ Upload file"}
        </button>
        {value && !busy && (
          <button
            onClick={() => { onChange(""); setName(""); }}
            style={{ background:"#2a0a0a",color:"#e63027",border:"1px solid #e6302744",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontWeight:700,fontSize:12 }}
          >
            Remove
          </button>
        )}
        {uploadedToR2 && !busy && (
          <span style={{ background:"#0d2a0d",border:"1px solid #22c55e33",color:"#22c55e",borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:700,alignSelf:"center" }}>
            ✓ On Cloudflare
          </span>
        )}
      </div>

      {/* Progress bar */}
      {busy && (
        <div style={{ marginBottom:6 }}>
          <div style={{ height:5,background:"#1a1a1a",borderRadius:3,overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${pct}%`,background:"#3b82f6",transition:"width .2s" }}/>
          </div>
          <div style={{ color:"#555",fontSize:10,marginTop:3 }}>{name}</div>
        </div>
      )}

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        style={{ ...IS, width:"100%", fontSize:12 }}
      />
      <div style={{ color:"#444",fontSize:10,marginTop:4 }}>
        Upload the file itself, or paste a Google Drive / Dropbox link · buyers get this in My Library
      </div>
      {err && (
        <div style={{ background:"#2a0a0a",border:"1px solid #e6302744",borderRadius:8,padding:"6px 10px",color:"#e63027",fontSize:11,marginTop:6 }}>⚠ {err}</div>
      )}

      <input ref={inputRef} type="file" style={{ display:"none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}/>
    </div>
  );
}
