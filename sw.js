const CACHE_NAME = "cortex-limit-break-v4-10-0-dev";
const APP_SHELL = [
  "./",
  "./index.html",
  "./config/app_config.js",
  "./assets/css/style.css",
  "./assets/js/app.js",
  "./assets/js/evidence/evidence-store.js",
  "./assets/js/evidence/evidence-upload.js",
  "./assets/js/evidence/evidence-preview.js",
  "./assets/js/evidence/evidence-render.js",
  "./assets/js/evidence/evidence-policy.js",
  "./assets/js/ui/navigation.js",
  "./assets/js/ui/dev-drawer.js",
  "./assets/js/ui/schedule-drawer.js",
  "./assets/js/schedule/schedule-store.js",
  "./assets/js/data/fallbacks.js",
  "./assets/js/auth/roles.js",
  "./assets/js/utils/countdown.js",
  "./assets/js/utils/helpers.js",
  "./manifest.webmanifest",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
