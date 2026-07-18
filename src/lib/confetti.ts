// Premium purchase-success confetti — a brand-colored side-cannon burst plus
// a center pop, matching the pattern already used for the custom-quote
// discount celebration (components/CustomQuotePage.tsx) but as a reusable,
// full-viewport effect (no local <canvas> element to manage).
import confetti from "canvas-confetti";

export function fireSuccessConfetti() {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const colors = ["#E50914", "#25D366", "#ffffff", "#facc15"];

  // Center celebratory burst
  confetti({
    particleCount: 90,
    spread: 100,
    startVelocity: 40,
    origin: { y: 0.6 },
    colors,
    scalar: 1.05,
  });

  // Side cannons converging toward the middle, tapering off over ~1.4s
  const end = Date.now() + 1400;
  (function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors, startVelocity: 45, ticks: 200 });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors, startVelocity: 45, ticks: 200 });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
