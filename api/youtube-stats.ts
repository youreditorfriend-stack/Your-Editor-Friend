// GET /api/youtube-stats
// Live subscriber / video counts + latest uploads from the YouTube Data API.
// Requires env var YOUTUBE_API_KEY (Google Cloud Console → APIs & Services →
// Credentials → API key, with "YouTube Data API v3" enabled).
// Costs ~2 quota units per call; responses are cached at the CDN for 6 hours.
// NOTE: no imports from src/ here — Vercel functions can't resolve those
// extensionless ESM imports at runtime. Keep these in sync with src/lib/site.ts.
const CHANNEL_ID = "UCTCCdk0D5y6wAB6vuR6jYbw";
const UPLOADS_PLAYLIST = "UUTCCdk0D5y6wAB6vuR6jYbw";
const FALLBACK_AVATAR =
  "https://yt3.googleusercontent.com/anig3ej2CcRFlvzac5XWrXnFXK4B0kKUedqrAw0GSbhk6BuMor4UwpJAZrctbcnoQIWqVx2I8w=s900-c-k-c0x00ffffff-no-rj";
const FALLBACK_VIDEO_IDS = [
  "3tEHyBX0zRU",
  "947uAF82nMQ",
  "Aoq1fnD_qro",
  "B7JXqAMablI",
  "6EwyG118OB8",
  "xCH997TcWB4",
];

// 12400 → "12.4K", 1250000 → "1.25M"
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}

export default async function handler(_req: any, res: any) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return res.status(503).json({ error: "YouTube API not configured" });
  }

  try {
    const [statsRes, videosRes] = await Promise.all([
      fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${CHANNEL_ID}&key=${key}`
      ),
      fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${UPLOADS_PLAYLIST}&maxResults=6&key=${key}`
      ),
    ]);

    if (!statsRes.ok) throw new Error(`channels.list failed: ${statsRes.status}`);

    const stats = await statsRes.json();
    const channel = stats.items?.[0];
    if (!channel) throw new Error("Channel not found");

    let latestVideoIds: string[] = [];
    if (videosRes.ok) {
      const videos = await videosRes.json();
      latestVideoIds = (videos.items || [])
        .map((i: any) => i.contentDetails?.videoId)
        .filter(Boolean);
    }

    const subCount = Number(channel.statistics.subscriberCount || 0);

    res
      .status(200)
      // Cache at the edge: served instantly, refreshed in the background every 6h
      .setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400")
      .json({
        subscribers: compact(subCount),
        videoCount: String(channel.statistics.videoCount || 0),
        avatar: channel.snippet?.thumbnails?.high?.url || FALLBACK_AVATAR,
        latestVideoIds: latestVideoIds.length ? latestVideoIds : FALLBACK_VIDEO_IDS,
      });
  } catch (e) {
    console.error("youtube-stats failed:", e);
    res.status(500).json({ error: "Failed to fetch YouTube stats" });
  }
}
