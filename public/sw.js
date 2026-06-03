/*
 * Quran App service worker — installability + offline support.
 *
 * Strategy:
 *   - Precache a minimal app shell on install (so cold offline launches work).
 *   - Navigations: network-first, fall back to the cached page, then /offline.html.
 *   - Hashed static assets (/_next/static, icons, fonts): cache-first.
 *   - Bundled data (/data): stale-while-revalidate.
 *   - Audio, range requests and /api are never intercepted (range requests must
 *     reach the network intact or audio seeking breaks).
 */
const VERSION = "v2";
const SHELL_CACHE = `quran-shell-${VERSION}`;
const RUNTIME_CACHE = `quran-runtime-${VERSION}`;

const SHELL = [
  "/",
  "/suras",
  "/offline.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isHashedStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|svg|webp|ico)$/.test(url.pathname)
  );
}

function cachePut(req, res) {
  if (res && res.ok && res.type === "basic") {
    const copy = res.clone();
    caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

function staleWhileRevalidate(req) {
  return caches.match(req).then((cached) => {
    const network = fetch(req)
      .then((res) => cachePut(req, res))
      .catch(() => cached);
    return cached || network;
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Leave audio, range requests and API calls untouched.
  if (
    url.pathname.startsWith("/audio/") ||
    url.pathname.startsWith("/api/") ||
    req.headers.has("range")
  ) {
    return;
  }

  // Navigations and React Server Component payloads → network-first so dynamic
  // content (e.g. the random Ayah of the day) stays fresh when online.
  const isRsc =
    url.searchParams.has("_rsc") || req.headers.get("RSC") === "1";
  if (req.mode === "navigate" || isRsc) {
    event.respondWith(
      fetch(req)
        .then((res) => cachePut(req, res))
        .catch(() =>
          caches.match(req).then((c) => {
            if (c) return c;
            // Only fall back to the offline page for real document navigations;
            // a failed RSC fetch should surface as a network error.
            return req.mode === "navigate"
              ? caches.match("/offline.html")
              : Response.error();
          })
        )
    );
    return;
  }

  // Hashed immutable assets → cache-first.
  if (isHashedStatic(url)) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => cachePut(req, res)))
    );
    return;
  }

  // Everything else (incl. /data) → stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(req));
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
