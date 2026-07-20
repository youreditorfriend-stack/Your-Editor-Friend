import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./auth";

// One review doc per buyer per item, id = `${uid}_${itemId}` — the
// deterministic id is what firestore.rules validates, and it makes
// re-rating an overwrite instead of a second review.
export interface Review {
  id: string;
  itemId: string;
  itemTitle?: string;
  uid: string;
  userName: string;
  userPhoto: string;
  rating: number; // 1-5
  feedback: string;
  createdAt: string;
}

export const useItemReviews = (itemId: string) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) return;
    const q = query(collection(db, "reviews"), where("itemId", "==", itemId));
    const unsub = onSnapshot(q, snap => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Review, "id">) })));
      setLoading(false);
    }, err => {
      console.error("Reviews subscription failed:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [itemId]);

  const average = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  return { reviews, average, count: reviews.length, loading };
};

// The caller's own review of one item (for pre-filling the rate widget)
// without subscribing to the whole item's review list.
export const useMyReview = (itemId: string) => {
  const { user } = useAuth();
  const [review, setReview] = useState<Review | null>(null);

  useEffect(() => {
    if (!user || !itemId) { setReview(null); return; }
    const ref = doc(db, "reviews", `${user.uid}_${itemId}`);
    const unsub = onSnapshot(ref, snap => {
      setReview(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Review, "id">) }) : null);
    }, () => setReview(null));
    return () => unsub();
  }, [user, itemId]);

  return review;
};

export const useSubmitReview = () => {
  const { user, profile } = useAuth();
  return async (itemId: string, itemTitle: string, rating: number, feedback: string) => {
    if (!user) throw new Error("Login required");
    await setDoc(doc(db, "reviews", `${user.uid}_${itemId}`), {
      itemId,
      itemTitle,
      uid: user.uid,
      userName: profile?.name || user.displayName || "Student",
      userPhoto: profile?.photo || user.photoURL || "",
      rating: Math.round(Math.max(1, Math.min(5, rating))),
      feedback: feedback.trim().slice(0, 1000),
      createdAt: new Date().toISOString(),
    });
  };
};

export const deleteReview = (uid: string, itemId: string) =>
  deleteDoc(doc(db, "reviews", `${uid}_${itemId}`));
