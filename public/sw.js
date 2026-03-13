// Minimal service worker for PWA installability (Android Chrome).
// No webpack/Turbopack plugin required – static file in public/.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
