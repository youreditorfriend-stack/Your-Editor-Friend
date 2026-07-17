// One place to turn any video URL — YouTube (watch/shorts/embed/youtu.be),
// Instagram reel, direct .mp4/.webm — into everything a player needs.
// The three older helpers in components/PortfolioGridNew.tsx, Portfolio.tsx
// and CustomQuotePage.tsx each handle a subset; those aren't touched here
// (the portfolio page ships and we don't want to regress it).

export type VideoKind = "youtube" | "instagram" | "file" | "none";

export interface ParsedVideo {
  kind: VideoKind;
  embedUrl: string;    // iframe src for youtube/instagram
  fileUrl: string;     // <video src> for direct files
  thumbnail: string;   // poster / og:image fallback
  isVertical: boolean; // shorts + reels
}

function getYoutubeId(url: string): string | null {
  const shorts = url.match(/youtube\.com\/shorts\/([^?&/]+)/);
  if (shorts) return shorts[1];
  const short = url.match(/youtu\.be\/([^?&/]+)/);
  if (short) return short[1];
  const watch = url.match(/[?&]v=([^?&/]+)/);
  if (watch) return watch[1];
  const embed = url.match(/youtube\.com\/embed\/([^?&/]+)/);
  if (embed) return embed[1];
  return null;
}

export function parseVideo(url?: string): ParsedVideo {
  const empty: ParsedVideo = { kind: "none", embedUrl: "", fileUrl: "", thumbnail: "", isVertical: false };
  if (!url || typeof url !== "string") return empty;
  const trimmed = url.trim();
  if (!trimmed) return empty;

  // YouTube — every URL shape lands here
  const ytId = getYoutubeId(trimmed);
  if (ytId) {
    const isVertical = trimmed.includes("/shorts/");
    return {
      kind: "youtube",
      embedUrl:
        `https://www.youtube-nocookie.com/embed/${ytId}` +
        `?autoplay=0&mute=0&controls=1&loop=1&playlist=${ytId}` +
        `&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3`,
      fileUrl: "",
      thumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
      isVertical,
    };
  }

  // Instagram reel / post
  const igMatch = trimmed.match(/instagram\.com\/(reel|p)\/([^/?]+)/);
  if (igMatch) {
    const base = trimmed.split("?")[0].replace(/\/?$/, "/");
    return {
      kind: "instagram",
      embedUrl: `${base}embed/`,
      fileUrl: "",
      thumbnail: "",
      isVertical: true, // reels are always vertical
    };
  }

  // Direct video file
  if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(trimmed)) {
    return { kind: "file", embedUrl: "", fileUrl: trimmed, thumbnail: "", isVertical: false };
  }

  return empty;
}

// Short human-readable label for admin ("YouTube video · vertical")
export function describeVideo(p: ParsedVideo): string {
  if (p.kind === "none") return "";
  const orient = p.isVertical ? " · vertical (9:16)" : "";
  return {
    youtube: "YouTube video",
    instagram: "Instagram reel",
    file: "Direct video file",
    none: "",
  }[p.kind] + orient;
}
