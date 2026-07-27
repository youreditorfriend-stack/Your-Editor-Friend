import { doc, getDoc, setDoc, updateDoc, increment, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export interface AnalyticsData {
  impressions: number;
  views: number;
  uniqueViewers: number;
  revisits: number;
}

const EMPTY_ANALYTICS: AnalyticsData = { impressions: 0, views: 0, uniqueViewers: 0, revisits: 0 };

// Coerce a raw Firestore analytics doc into a complete AnalyticsData (0-filled).
function normalize(raw?: Partial<AnalyticsData> | null): AnalyticsData {
  return {
    impressions: raw?.impressions || 0,
    views: raw?.views || 0,
    uniqueViewers: raw?.uniqueViewers || 0,
    revisits: raw?.revisits || 0,
  };
}

// Track an impression (e.g. when card is mounted in catalog)
// Debounced in-memory to prevent rapid redundant writes
const impressionTracked = new Set<string>();

export async function trackImpression(itemId: string) {
  if (impressionTracked.has(itemId)) return;
  impressionTracked.add(itemId);

  try {
    const docRef = doc(db, "analytics", itemId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, { impressions: increment(1) });
    } else {
      await setDoc(docRef, { impressions: 1, views: 0, uniqueViewers: 0, revisits: 0 });
    }
  } catch (err) {
    // Fail silently in production to prevent user-facing errors
    console.warn("Analytics trackImpression failed:", err);
  }
}

// Track a view (when item detail page is loaded)
const viewTrackedInSession = new Set<string>();

export async function trackView(itemId: string) {
  if (viewTrackedInSession.has(itemId)) return;
  viewTrackedInSession.add(itemId);

  try {
    const localKey = `v_f_viewed_${itemId}`;
    const hasViewedBefore = localStorage.getItem(localKey);

    const docRef = doc(db, "analytics", itemId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      if (hasViewedBefore) {
        // Revisit and general view
        await updateDoc(docRef, {
          views: increment(1),
          revisits: increment(1)
        });
      } else {
        // Unique viewer and general view
        await updateDoc(docRef, {
          views: increment(1),
          uniqueViewers: increment(1)
        });
        localStorage.setItem(localKey, "true");
      }
    } else {
      await setDoc(docRef, {
        impressions: 1,
        views: 1,
        uniqueViewers: 1,
        revisits: 0
      });
      localStorage.setItem(localKey, "true");
    }
  } catch (err) {
    console.warn("Analytics trackView failed:", err);
  }
}

// Load the real, live Firestore counters for one item (0s when never tracked).
export async function loadAnalytics(itemId: string): Promise<AnalyticsData> {
  try {
    const snap = await getDoc(doc(db, "analytics", itemId));
    if (snap.exists()) return normalize(snap.data() as Partial<AnalyticsData>);
  } catch (err) {
    console.warn("Load analytics failed:", err);
  }
  return { ...EMPTY_ANALYTICS };
}

// Load every item's counters in a single collection read, keyed by itemId.
// Used by the admin dashboard to join all products/courses at once.
export async function loadAllAnalytics(): Promise<Record<string, AnalyticsData>> {
  const out: Record<string, AnalyticsData> = {};
  try {
    const snap = await getDocs(collection(db, "analytics"));
    snap.forEach(d => { out[d.id] = normalize(d.data() as Partial<AnalyticsData>); });
  } catch (err) {
    console.warn("Load all analytics failed:", err);
  }
  return out;
}
