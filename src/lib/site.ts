// Central site config — contact links, YouTube channel info.
// Later this can move into Firestore so it's editable from the Admin page.

export const WHATSAPP_NUMBER = "916374343169";
export const WHATSAPP_DISPLAY = "+91 63743 43169";
export const EMAIL = "youreditorfriend@gmail.com";
export const INSTAGRAM_URL = "https://www.instagram.com/iamyoureditorfriend/?hl=en";

export const getWhatsAppLink = (message?: string) => {
  const defaultMsg = "Hi Janish, I'm interested in your video editing services!";
  const text = encodeURIComponent(message || defaultMsg);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
};

export const WHATSAPP_LINK = getWhatsAppLink();

export const YOUTUBE = {
  handle: "@Editor_friend",
  url: "https://www.youtube.com/@Editor_friend",
  channelId: "UCTCCdk0D5y6wAB6vuR6jYbw",
  uploadsPlaylistId: "UUTCCdk0D5y6wAB6vuR6jYbw",
  avatar:
    "https://yt3.googleusercontent.com/anig3ej2CcRFlvzac5XWrXnFXK4B0kKUedqrAw0GSbhk6BuMor4UwpJAZrctbcnoQIWqVx2I8w=s900-c-k-c0x00ffffff-no-rj",
  subscribers: "12.4K",
  videoCount: "36",
  // Snapshot of recent uploads (used for thumbnail grids; playlist embeds stay live)
  latestVideoIds: [
    "3tEHyBX0zRU",
    "947uAF82nMQ",
    "Aoq1fnD_qro",
    "B7JXqAMablI",
    "6EwyG118OB8",
    "xCH997TcWB4",
  ],
};

export const youtubeThumb = (id: string) =>
  `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

// Live channel stats from /api/youtube-stats (YouTube Data API).
// Falls back to the snapshot in YOUTUBE above when the API isn't configured,
// so the site always renders sensible numbers.
import { useEffect, useState } from "react";

export interface YouTubeStats {
  subscribers: string;
  videoCount: string;
  avatar: string;
  latestVideoIds: string[];
}

const FALLBACK: YouTubeStats = {
  subscribers: YOUTUBE.subscribers,
  videoCount: YOUTUBE.videoCount,
  avatar: YOUTUBE.avatar,
  latestVideoIds: YOUTUBE.latestVideoIds,
};

let statsCache: YouTubeStats | null = null;

export function useYouTubeStats(): YouTubeStats {
  const [stats, setStats] = useState<YouTubeStats>(statsCache || FALLBACK);

  useEffect(() => {
    if (statsCache) return;
    (async () => {
      try {
        const res = await fetch("/api/youtube-stats");
        if (!res.ok) return; // not configured → keep fallback
        if (!(res.headers.get("content-type") || "").includes("application/json")) return;
        const d = await res.json();
        if (!d?.subscribers) return;
        statsCache = {
          subscribers: d.subscribers,
          videoCount: d.videoCount,
          avatar: d.avatar || FALLBACK.avatar,
          latestVideoIds: d.latestVideoIds?.length ? d.latestVideoIds : FALLBACK.latestVideoIds,
        };
        setStats(statsCache);
      } catch {
        // keep fallback
      }
    })();
  }, []);

  return stats;
}
