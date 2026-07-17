import { useRef, useState } from "react";
import { CropModal } from "./CropModal";
import { adminAuthBody } from "../lib/adminAuth";
import { Image, UploadCloud, RotateCcw, Trash2, HelpCircle } from "lucide-react";

// Modernized Image Upload & Crop Field.
// Raw URL inputs are hidden by default to keep the interface extremely tidy and professional.
export function ImageField({
  value,
  onChange,
  aspect = "square",
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  aspect?: "square" | "video" | "any";
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false); // Collapsible fallback

  const pick = (file: File) => {
    setErr("");
    if (!file.type.startsWith("image/")) {
      setErr("Please select a valid image file");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setErr("Image file size must be under 25 MB");
      return;
    }
    if (aspect === "any") {
      setBusy(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const dataUrl = reader.result as string;
          await upload({
            data: dataUrl,
            contentType: file.type,
            filename: file.name
          });
        } catch (e: any) {
          setErr(e.message || "Failed to upload image");
          setBusy(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setCropFile(file);
    }
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
            ? `Storage is not set up yet. Go to Advanced Settings below to paste an image URL.`
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

  return (
    <div className="space-y-1.5 select-none">
      {cropFile && (
        <CropModal
          file={cropFile}
          aspect={aspect === "any" ? "square" : aspect}
          onCancel={() => setCropFile(null)}
          onDone={upload}
        />
      )}

      {/* Field label */}
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
        {label}
      </label>

      <div className="flex flex-col sm:flex-row gap-4 items-start bg-zinc-900/30 border border-white/5 rounded-2xl p-4">
        {/* Click & drag-and-drop preview block - square preview by default */}
        <div
          onClick={() => !busy && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) pick(f);
          }}
          className={`relative aspect-square w-24 h-24 sm:w-28 sm:h-28 rounded-xl shrink-0 overflow-hidden bg-zinc-950 flex flex-col items-center justify-center cursor-pointer transition-all border ${
            dragOver
              ? "border-[#E50914] bg-[#E50914]/5 scale-95"
              : "border-white/10 hover:border-white/20 hover:bg-zinc-900"
          } ${busy ? "cursor-wait opacity-50" : ""}`}
        >
          {busy ? (
            <div className="text-center p-2">
              <div className="animate-spin text-[#E50914] text-lg mb-1">⏳</div>
              <div className="text-[9px] text-zinc-500 tracking-wider uppercase">UPLOADING...</div>
            </div>
          ) : value ? (
            <div className="relative w-full h-full group">
              <img
                src={value}
                alt=""
                className="w-full h-full object-cover rounded-xl"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <RotateCcw size={14} className="text-white" />
                <span className="text-[10px] text-white font-bold uppercase tracking-wider">Replace</span>
              </div>
            </div>
          ) : (
            <div className="text-center p-3 flex flex-col items-center gap-1.5 text-zinc-500">
              <UploadCloud size={20} className="text-zinc-500" />
              <div className="text-[9px] font-bold uppercase tracking-widest leading-none">DROP IMAGE</div>
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <UploadCloud size={13} /> {value ? "Replace Image" : "Upload Image"}
            </button>
            {value && !busy && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <Trash2 size={13} /> Remove
              </button>
            )}
          </div>

          <div className="text-[10px] text-zinc-500 font-light flex items-center gap-1.5 leading-relaxed">
            <HelpCircle size={11} />
            <span>
              {aspect === "square" ? "Prepped at 1:1 ratio." : aspect === "video" ? "Prepped at 16:9 ratio." : "Uncropped original aspect ratio."} PNG, JPG, WebP supported.
            </span>
          </div>

          {/* Fallback collapsible URL box (only shown on active toggled state) */}
          <div className="pt-1.5">
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-[10px] font-bold tracking-wider text-zinc-500 hover:text-zinc-300 uppercase transition-all"
            >
              {showUrlInput ? "Hide Advanced Link Details ▲" : "Paste raw image URL fallback ▼"}
            </button>

            {showUrlInput && (
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://example.com/image.png"
                className="w-full mt-2 bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-all font-mono"
              />
            )}
          </div>

          {err && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs font-light">
              ⚠️ {err}
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
