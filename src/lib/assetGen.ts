// AI Asset Generator: the buyer types a name once and every prompt fills itself.
// Stored next to the PSD prompt kit (same docs, merged):
//   promptKitsPublic/{productId}.assetGen       — cards, rules, images (public)
//   promptKitsPrivate/{productId}.assetPrompts  — prompt texts (buyers only)
// When the admin picks "everyone", the prompts are copied into the public doc.
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface AgFile { label: string; file: string }
export interface AgOption { id: string; label: string; upload: string; poseImg?: string; download?: AgFile }
export interface AgCard {
  id: string; no: string; title: string; replaces: string; upload: string;
  kind?: "name";
  ref?: string;          // example result image (or video poster)
  refVideo?: string;     // example result video
  videoEdit?: boolean;   // buyer downloads `download` and edits it with a video model
  beta?: boolean;
  download?: AgFile;
  options?: AgOption[];  // e.g. "Use this pose" / "My own pose"
}
export interface AssetGenPublic {
  min: number; max: number; allowTxt: boolean; promptsFor: "buyers" | "everyone";
  rules: string[]; ae: string[]; cards: AgCard[];
  prompts?: Record<string, string>; // only when promptsFor === "everyone"
}
export type AgPrompts = Record<string, string>; // key: cardId or `${cardId}:${optionId}`

export const promptKey = (c: AgCard, o?: AgOption | null) => (o ? `${c.id}:${o.id}` : c.id);

export async function loadAssetGen(productId: string): Promise<AssetGenPublic | null> {
  const s = await getDoc(doc(db, "promptKitsPublic", productId));
  return (s.exists() && (s.data() as any).assetGen) || null;
}
// Throws permission-denied for a buyer who hasn't bought the product.
export async function loadAssetPrompts(productId: string): Promise<AgPrompts> {
  const s = await getDoc(doc(db, "promptKitsPrivate", productId));
  return ((s.exists() && (s.data() as any).assetPrompts) || {}) as AgPrompts;
}
export async function saveAssetGen(productId: string, pub: AssetGenPublic | null, prompts: AgPrompts) {
  const publicPart = pub ? { ...pub, prompts: pub.promptsFor === "everyone" ? prompts : {} } : null;
  await Promise.all([
    setDoc(doc(db, "promptKitsPublic", productId), { assetGen: publicPart }, { merge: true }),
    setDoc(doc(db, "promptKitsPrivate", productId), { assetPrompts: pub ? prompts : {} }, { merge: true }),
  ]);
}

// ── name → placeholders ──
export function nameVars(raw: string) {
  const N = raw.toUpperCase().replace(/[^A-Z ]/g, "").replace(/\s+/g, " ").trim();
  const L = N.replace(/[^A-Z]/g, "").split("").filter(Boolean);
  return { NAME: N, SPELLED: L.join("-"), COUNT: String(L.length), LETTERS: L.join(", "), TITLE_NO: String(L.length).padStart(2, "0"), n: L.length };
}
export type NameVars = ReturnType<typeof nameVars>;

export function genderize(s: string, gender: "man" | "woman") {
  if (gender === "man") return s;
  return s.replace(/the top of the mustache/g, "the top of the lips")
    .replace(/, beard and /g, " and ").replace(/, nose and beard/g, " and nose").replace(/, beard,/g, ",")
    .replace(/\s*\b(beard|mustache)\b/g, "")
    .replace(/\bman\b/g, "woman").replace(/\bhis\b/g, "her").replace(/\bhe\b/g, "she").replace(/\bHis\b/g, "Her").replace(/\bHe\b/g, "She");
}
// mark=true wraps filled values in \u0001…\u0002 so the UI can highlight them
export function fillPrompt(p: string, v: NameVars, gender: "man" | "woman", mark = false) {
  return genderize(p, gender).replace(/\{(NAME|SPELLED|COUNT|LETTERS|TITLE_NO)\}/g, (_, k) =>
    mark ? `\u0001${(v as any)[k] || "…"}\u0002` : String((v as any)[k] || ""));
}
export const PLACEHOLDERS = ["{NAME}", "{SPELLED}", "{COUNT}", "{LETTERS}", "{TITLE_NO}"];

export function howTo(c: AgCard, upload: string, tool: "gemini" | "chatgpt") {
  const none = upload === "Nothing" || upload === "–";
  if (c.videoEdit) return [
    "Download the video (button above).", "Open Omni 1.1 Flash (video edit) → start a new edit.",
    "Upload the video you just downloaded.", "Paste the prompt and generate.",
    "Check every letter of your name — if one is wrong, generate again.", "Download the new video and use it in After Effects.",
  ];
  if (tool === "chatgpt") return ["Open chatgpt.com → New chat.", none ? "No upload needed." : `Tap + → attach ${upload.toLowerCase()}.`, "Paste the prompt and send.", "Download the image."];
  return ["Open gemini.google.com → New chat.", "Tap + → Create image.", none ? "Don't upload anything." : `Upload: ${upload.toLowerCase()}.`, "Paste the prompt and send.", "Not right? Press Redo (↻) once or twice.", "Download at full size."];
}

// ── Preset: Respecta – 3 to 15 Letter Dynamic Title (files in /public/asset-kits/respecta) ──
const R = "/asset-kits/respecta/";
const P_PORTRAIT_TAIL = " Outfit: black open-collar shirt, black blazer with glossy deep red highlights, silver ball chain with a rectangular metal dog-tag pendant. Style: hyper-detailed painterly illustration with visible thick oil brush strokes on skin, hair and clothes, warm orange-amber skin tones, strong red rim light on the blazer, high contrast, cinematic. Background: pure solid white, person cleanly cut out with sharp edges, no shadow, no floor. Square 1:1, person fills the frame, top of the hair near the top edge, cropped at mid-chest. No text, no logo.";
const P_CROWD = "Create an image: a high-angle aerial photograph of thousands of real tiny people standing on a huge white plaza, arranged so that together they form an extreme close-up portrait of the man in this photo, like a famous crowd mosaic artwork. Each person must be clearly recognizable as a small full-body human figure (head, shoulders, body, legs) with a soft shadow, seen from above at a slight angle - NOT dots, NOT stippling, NOT ink texture, NOT halftone. Crop tight in wide 16:9 landscape: eyebrows and forehead at the top edge, both eyes in the middle, nose and the top of the mustache at the bottom edge, sides of the hair at the left and right edges. Dark areas (hair, eyebrows, eyelashes, pupils, eye creases, nostrils, beard, shadows) = very dense crowds standing shoulder to shoulder. Light skin areas = empty white ground with only a few single people standing far apart. Black and white photo, pure white ground, no drawn lines. Keep his likeness: same eye shape, eyebrows, nose and beard. Serious intense stare. No text.";
const P_RED = "Create an image: an extreme close-up digital painting of the face of the man in this photo. Crop tight in wide 16:9 landscape: messy hair and forehead at the top edge, both eyes in the middle, nose and the top of the mustache at the bottom edge. Expression: furious, intense, piercing stare straight into the camera, brows pulled down hard. Style: aggressive expressive painting with thick bold white and red brush strokes on the skin, bright red paint slashes and drips running down the forehead, between the eyes and across the cheeks, fast red motion streaks flying across the frame, dark red background, strong red and warm skin-tone palette, high contrast, cinematic action-movie poster look. Keep his likeness: same eye shape, eyebrows, nose and beard as the photo. No text, no logo.";
const GUIDE_PREFIX = "Image 1 is my photo. Image 2 is a grey mannequin head that only shows the crop, head angle and stare — copy those exactly, not its grey look. ";
const toImg1 = (s: string) => s.replace("the man in this photo", "the man in image 1").replace("Keep his likeness:", "Keep his likeness from image 1:");
const poseOpts = (guide: string): AgOption[] => [
  { id: "ref", label: "Use this pose", upload: "Your photo + the pose image", poseImg: guide, download: { label: "⬇ Download the pose image", file: guide } },
  { id: "own", label: "My own pose", upload: "Your photo" },
];

export const RESPECTA_PRESET: { pub: AssetGenPublic; prompts: AgPrompts } = {
  pub: {
    min: 3, max: 15, allowTxt: true, promptsFor: "buyers",
    rules: [
      "For photo steps, upload ONLY your own photo — never the example images (AI tools refuse celebrity faces). For the name video, upload the video we give you.",
      "Clear, front-facing photo, good light, face not covered.",
      "One prompt per new chat. Paste the full prompt, don't shorten it.",
      "Free Gemini adds a small ✦ watermark bottom-right – crop it before importing.",
    ],
    ae: ["Open the Scene Dashboard comp.", "Double-click each card and replace the image / video with yours.", "Type your name in Step 1.", "Render MAIN_OUTPUT."],
    cards: [
      { id: "name", no: "1", title: "Your name (typed in AE)", replaces: "Scene Dashboard → title box", upload: "–", kind: "name" },
      { id: "portrait", no: "2", title: "Painted portrait", replaces: "“Last main illustrated character”", upload: "Your photo", ref: R + "ref1.jpg", options: poseOpts(R + "pose_mannequin.jpg") },
      { id: "brush", no: "3", title: "Your name brush animation (video)", replaces: "“Replace Google Flow video”", upload: "The VIJAY brush video", ref: R + "brush_name_poster.jpg", refVideo: R + "brush_name.mp4", videoEdit: true, beta: true,
        download: { label: "⬇ Download this video (1080p) — upload it in step 3", file: R + "brush_vijay_1080p.mp4" } },
      { id: "crowd", no: "4a", title: "Eyes made of tiny people", replaces: "“Illustrated Eye SHot”", upload: "Your photo", ref: R + "ref2.jpg", options: poseOpts(R + "pose_eyes_crowd.jpg") },
      { id: "red", no: "4b", title: "Red paint eyes", replaces: "“upload opening eye image (Chatgpt)”", upload: "Your photo", ref: R + "ref3.jpg", options: poseOpts(R + "pose_eyes_red.jpg") },
    ],
  },
  prompts: {
    "portrait:ref": "Image 1 is my photo. Image 2 is a grey mannequin that only shows the pose. Turn the man in image 1 into a dramatic movie-poster digital oil painting. Keep his face identity exactly: same face shape, eyes, nose, lips, hairline, beard and skin tone, so he is clearly the same person. Pose: copy the exact pose, head tilt, camera angle and crop of the mannequin in image 2 — chest-up, head tilted slightly down, confident smirk, intense eyes looking straight into the camera, right hand raised to the face with the index finger touching the lower lip and the thumb pointing outward. Copy only the pose from image 2, not its grey look." + P_PORTRAIT_TAIL,
    "portrait:own": "Turn the man in this photo into a dramatic movie-poster digital oil painting. Keep his face identity exactly: same face shape, eyes, nose, lips, hairline, beard and skin tone, so he is clearly the same person. Pose: keep the exact same pose, body position, head angle and hand gesture as in this photo, framed chest-up, intense eyes looking straight into the camera." + P_PORTRAIT_TAIL,
    "brush": "Edit this video. Keep everything exactly the same: the same flat solid green #00FF00 background, the same fast aggressive white dry-brush painting animation, the same brush style, stroke speed, timing, letter size, forward italic slant, position and framing. Only change the word \"VIJAY\" to \"{NAME}\" (spelled {SPELLED}, {COUNT} letters, all capitals). Paint the new letters one by one, left to right: {LETTERS}, with the same rough torn bristle edges and sharp pointed tips, each new letter starting slightly before the previous one finishes, then hold the finished word still until the end. Spell it exactly {NAME} with no extra or missing letters. No other changes: no new elements, no particles, no glow, no flash, no zoom, no camera movement. Same 16:9 frame and same length. No sound.",
    "crowd:ref": GUIDE_PREFIX + toImg1(P_CROWD),
    "crowd:own": P_CROWD.replace("Serious intense stare.", "Keep the same head angle, gaze and expression as in this photo."),
    "red:ref": GUIDE_PREFIX + toImg1(P_RED),
    "red:own": P_RED.replace("Expression: furious, intense, piercing stare straight into the camera, brows pulled down hard.", "Expression: keep the same head angle and gaze as in this photo, made more intense and furious."),
  },
};

export function youtubeId(u?: string) {
  const m = String(u || "").match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([\w-]{11})/);
  return m ? m[1] : "";
}
