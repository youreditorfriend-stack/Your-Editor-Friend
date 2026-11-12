// Custom analytics events (Vercel Web Analytics). Safe no-op when the
// analytics script isn't loaded (dev, ad-blockers).
type Props = Record<string, string | number | boolean | null>;

export function track(name: string, data?: Props) {
  try {
    const w = window as any;
    w.va?.("event", { name, data });
  } catch { /* ignore */ }
}
