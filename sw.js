const CACHE_NAME = "cortex-limit-break-v4-17-3-dev";
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
  "./data/app_version.json",
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
  const requestUrl = new URL(request.url);
  if (request.method === "POST" && requestUrl.pathname.endsWith("/share-target")) {
    event.respondWith((async () => {
      const formData = await request.formData();
      const files = formData.getAll("files")
        .filter((item) => item && typeof item.arrayBuffer === "function")
        .filter((file) => (String(file.type).startsWith("image/") || file.type === "application/pdf") && file.size < 10 * 1024 * 1024)
        .slice(0, 10);
      const shareId = `${Date.now()}-${crypto.randomUUID()}`;
      const cache = await caches.open("cortex-limit-break-shared-files");
      const manifest = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const key = `./__shared/${shareId}/${index}`;
        await cache.put(key, new Response(file, {
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "X-Shared-File-Name": encodeURIComponent(file.name || `shared-${index + 1}`)
          }
        }));
        manifest.push({ key, name: file.name, type: file.type, size: file.size });
      }
      await cache.put(`./__shared/${shareId}/manifest`, new Response(JSON.stringify(manifest), {
        headers: { "Content-Type": "application/json" }
      }));
      const redirectUrl = new URL(`./?shared_upload=${encodeURIComponent(shareId)}#view=evidence`, request.url);
      return Response.redirect(redirectUrl.href, 303);
    })());
    return;
  }
  if (request.method !== "GET") return;

  const url = requestUrl;
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

  const isFreshAppAsset = [
    "/assets/js/",
    "/assets/css/",
    "/config/",
    "/sw.js"
  ].some((part) => url.pathname.includes(part));

  if (isFreshAppAsset) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
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
