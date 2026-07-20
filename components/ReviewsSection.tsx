import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "../src/lib/auth";
import { useItemReviews, useMyReview, useSubmitReview } from "../src/lib/reviews";

const MARQUEE_MIN = 3; // fewer feedbacks than this render as a static list

export const Stars: React.FC<{ value: number; size?: number; className?: string }> = ({ value, size = 14, className = "" }) => (
  <span className={`inline-flex items-center gap-0.5 ${className}`}>
    {[1, 2, 3, 4, 5].map(i => (
      <Star
        key={i}
        size={size}
        className={i <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-zinc-700"}
      />
    ))}
  </span>
);

// Star picker + optional feedback box. Deliberately inline (never a popup)
// so rating stays a one-tap affair: the feedback field only appears after a
// star is picked, and everything saves with a single submit.
export const RateWidget: React.FC<{
  itemId: string;
  itemTitle: string;
  compact?: boolean; // library-card variant: tighter spacing, no heading
}> = ({ itemId, itemTitle, compact = false }) => {
  const { user, profile } = useAuth();
  const mine = useMyReview(itemId);
  const submitReview = useSubmitReview();

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Pre-fill from an existing review so re-rating edits in place.
  useEffect(() => {
    if (mine) { setRating(mine.rating); setFeedback(mine.feedback); }
  }, [mine]);

  const owned = !!profile?.purchases?.includes(itemId);
  if (!user || !owned) return null;

  const pick = (v: number) => {
    setRating(v);
    setOpen(true);
    setSaved(false);
  };

  const submit = async () => {
    if (!rating || saving) return;
    setSaving(true);
    try {
      await submitReview(itemId, itemTitle, rating, feedback);
      setSaved(true);
      setOpen(false);
    } catch (e) {
      console.error("Review submit failed:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={compact ? "mt-2.5" : ""}>
      <div className="flex items-center gap-2 flex-wrap">
        {!compact && (
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {mine ? "Your rating" : "Rate your purchase"}
          </span>
        )}
        <span
          className="inline-flex items-center gap-1"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map(i => (
            <button
              key={i}
              type="button"
              aria-label={`${i} star${i > 1 ? "s" : ""}`}
              onMouseEnter={() => setHover(i)}
              onClick={() => pick(i)}
              className="cursor-pointer transition-transform hover:scale-110"
            >
              <Star
                size={compact ? 16 : 20}
                className={i <= (hover || rating) ? "text-amber-400 fill-amber-400" : "text-zinc-600"}
              />
            </button>
          ))}
        </span>
        {compact && !rating && <span className="text-[10px] text-zinc-500">Rate this</span>}
        {saved && <span className="text-[10px] font-bold text-[#25D366]">Saved ✓</span>}
        {mine && !open && !saved && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[10px] text-zinc-500 hover:text-white underline cursor-pointer"
          >
            edit
          </button>
        )}
      </div>

      {open && (
        <div className="mt-2.5 space-y-2">
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            maxLength={1000}
            rows={compact ? 2 : 3}
            placeholder="Share a quick feedback (optional)…"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400/60 resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={!rating || saving}
              className="bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving…" : mine ? "Update rating" : "Submit rating"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-zinc-500 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Detail-page section: average up top, buyer rate widget, then written
// feedbacks — as a right-to-left auto-scrolling chat strip once there are
// enough of them (paused on hover), a plain list otherwise.
export const ReviewsSection: React.FC<{ itemId: string; itemTitle: string }> = ({ itemId, itemTitle }) => {
  const { reviews, average, count } = useItemReviews(itemId);
  const withFeedback = reviews
    .filter(r => r.feedback.trim().length > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const marquee = withFeedback.length >= MARQUEE_MIN;
  // Slow enough to read, scaling with volume so long strips don't crawl.
  const marqueeDuration = Math.max(25, withFeedback.length * 9);

  const bubble = (r: (typeof withFeedback)[number], key: string) => (
    <div
      key={key}
      className="w-72 shrink-0 rounded-2xl rounded-bl-md border border-white/5 bg-zinc-900/60 p-4"
    >
      <div className="flex items-center gap-2.5 mb-2">
        {r.userPhoto ? (
          <img src={r.userPhoto} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full border border-white/10" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px]">👤</div>
        )}
        <div className="min-w-0">
          <div className="text-xs font-semibold text-white truncate">{r.userName}</div>
          <Stars value={r.rating} size={10} />
        </div>
      </div>
      <p className="text-xs text-zinc-400 font-light leading-relaxed line-clamp-4">{r.feedback}</p>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Ratings &amp; reviews</h2>
        {count > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">{average.toFixed(1)}</span>
            <Stars value={average} size={16} />
            <span className="text-xs text-zinc-500">({count})</span>
          </div>
        )}
      </div>

      {/* Buyer-only inline rate strip — hidden entirely for non-buyers */}
      <div className="rounded-2xl border border-white/5 bg-zinc-950/40 p-4 empty:hidden">
        <RateWidget itemId={itemId} itemTitle={itemTitle} />
      </div>

      {count === 0 && (
        <p className="text-zinc-600 text-sm mt-4 font-light">No ratings yet — buyers can be the first to rate this.</p>
      )}

      {withFeedback.length > 0 && (
        marquee ? (
          <div className="mt-5 overflow-hidden relative group/marquee -mx-4 md:mx-0 px-4 md:px-0">
            <div
              className="flex gap-3 w-max group-hover/marquee:[animation-play-state:paused]"
              style={{ animation: `marquee ${marqueeDuration}s linear infinite` }}
            >
              {withFeedback.map(r => bubble(r, r.id))}
              {/* duplicate for a seamless loop */}
              {withFeedback.map(r => bubble(r, `${r.id}-dup`))}
            </div>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-3">
            {withFeedback.map(r => bubble(r, r.id))}
          </div>
        )
      )}
    </div>
  );
};
