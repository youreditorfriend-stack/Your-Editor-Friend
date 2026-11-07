// Minimal service worker so the admin can be installed as a phone app.
// It never caches data — every request goes to the network, so what you see
// is always live.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
