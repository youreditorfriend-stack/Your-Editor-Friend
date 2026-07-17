import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";

// Renders the selected crop to a canvas at the target size.
// Keeps transparency when the source has any, otherwise emits a lighter JPEG.
async function renderCrop(
  imageSrc: string,
  crop: Area,
  targetW: number,
  targetH: number,
  keepAlpha: boolean
): Promise<{ data: string; contentType: string; ext: string }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not load the image"));
    i.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image");

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, targetW, targetH);

  if (keepAlpha) {
    const { data } = ctx.getImageData(0, 0, targetW, targetH);
    let transparent = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) { transparent = true; break; }
    }
    if (transparent) {
      return { data: canvas.toDataURL("image/png"), contentType: "image/png", ext: "png" };
    }
  }
  return { data: canvas.toDataURL("image/jpeg", 0.9), contentType: "image/jpeg", ext: "jpg" };
}

export function CropModal({
  file,
  aspect,
  onCancel,
  onDone,
}: {
  file: File;
  aspect: "square" | "video";
  onCancel: () => void;
  onDone: (result: { data: string; contentType: string; filename: string }) => void;
}) {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const ratio = aspect === "square" ? 1 : 16 / 9;
  const targetW = aspect === "square" ? 1080 : 1920;
  const targetH = 1080;

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const confirm = async () => {
    if (!area) return;
    setBusy(true);
    try {
      const keepAlpha = file.type === "image/png" || file.type === "image/webp";
      const { data, contentType, ext } = await renderCrop(imageSrc, area, targetW, targetH, keepAlpha);
      const base = file.name.replace(/\.[^.]+$/, "");
      onDone({ data, contentType, filename: `${base}.${ext}` });
      URL.revokeObjectURL(imageSrc);
    } catch (e) {
      console.error(e);
      setBusy(false);
    }
  };

  const cancel = () => {
    URL.revokeObjectURL(imageSrc);
    onCancel();
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) cancel(); }}
      style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(5px)",padding:20 }}
    >
      <div style={{ background:"#111",border:"1px solid #2a2a2a",borderRadius:20,width:"100%",maxWidth:640,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,.9)" }}>
        {/* Header */}
        <div style={{ background:"#0d0d0d",borderBottom:"1px solid #1e1e1e",padding:"16px 22px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:2,color:"#fff" }}>CROP THUMBNAIL</div>
            <div style={{ color:"#666",fontSize:11 }}>
              {aspect === "square" ? "Square 1:1 — exports 1080×1080" : "Widescreen 16:9 — exports 1920×1080"}
            </div>
          </div>
          <button onClick={cancel} style={{ background:"#1a1a1a",border:"1px solid #333",borderRadius:8,color:"#777",fontSize:16,width:32,height:32,cursor:"pointer" }}>✕</button>
        </div>

        {/* Cropper */}
        <div style={{ position:"relative",height:380,background:"#000" }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={ratio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
            restrictPosition={false}
            objectFit="contain"
          />
        </div>

        {/* Zoom + actions */}
        <div style={{ padding:"16px 22px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
            <span style={{ color:"#666",fontSize:11,fontWeight:700,letterSpacing:1 }}>ZOOM</span>
            <input
              type="range"
              min={0.4}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ flex:1, accentColor:"#e63027" }}
            />
            <button
              onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}
              style={{ background:"#1a1a1a",border:"1px solid #333",color:"#888",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700 }}
            >
              Reset
            </button>
          </div>
          <div style={{ color:"#555",fontSize:11,marginBottom:14 }}>
            Drag to move · scroll or use the slider to zoom · zoom out past the frame to letterbox instead of cropping
          </div>
          <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}>
            <button onClick={cancel} style={{ background:"#1a1a1a",color:"#666",border:"1px solid #2a2a2a",borderRadius:9,padding:"9px 20px",cursor:"pointer",fontWeight:600 }}>Cancel</button>
            <button
              onClick={confirm}
              disabled={busy || !area}
              style={{ background:"#e63027",color:"#fff",border:"none",borderRadius:9,padding:"9px 24px",cursor:busy?"wait":"pointer",fontWeight:700,opacity:busy?0.6:1 }}
            >
              {busy ? "Processing…" : "Crop & Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
