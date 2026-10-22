export const prerender = true;

export function GET() {
  const rawBase = import.meta.env.BASE_URL ?? "/";
  const base = rawBase === "/" ? "" : rawBase.replace(/\/$/, "");
  const scope = base ? `${base}/` : "/";
  const cacheVersion = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

  const source = `
const BASE = ${JSON.stringify(base)};
const CACHE_VERSION = ${JSON.stringify(cacheVersion)};
const SHELL_CACHE = "bibli-shell-" + CACHE_VERSION;
const RUNTIME_CACHE = "bibli-runtime-" + CACHE_VERSION;
const MAX_RUNTIME_ENTRIES = 140;
const MAX_RUNTIME_RESPONSE_BYTES = 2000000;
const PACKAGE_CACHE_PREFIX = "bibli-package-";
const CORE_URLS = [
  BASE + "/",
  BASE + "/en/",
  BASE + "/offline/",
  BASE + "/manifest.webmanifest",
  BASE + "/favicon.svg",
  BASE + "/favicon.ico",
  BASE + "/icons/icon-192.png",
  BASE + "/icons/icon-512.png",
  BASE + "/descargar/",
  BASE + "/en/download/"
];

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((request) => cache.delete(request)));
}

function runtimeResponseFitsBudget(response) {
  const cacheControl = response.headers.get("Cache-Control") || "";
  if (/\\bno-store\\b/i.test(cacheControl)) return false;
  const rawLength = response.headers.get("Content-Length");
  if (!rawLength) return true;
  const length = Number(rawLength);
  return !Number.isFinite(length) || length <= MAX_RUNTIME_RESPONSE_BYTES;
}

async function cacheResponse(cacheName, request, response) {
  if (!response || !response.ok || response.type === "opaque") return response;
  if (cacheName === RUNTIME_CACHE && !runtimeResponseFitsBudget(response)) return response;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  if (cacheName === RUNTIME_CACHE) await trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
  return response;
}

async function warmShell() {
  const cache = await caches.open(SHELL_CACHE);
  const results = await Promise.allSettled(
    CORE_URLS.map(async (url) => {
      const response = await fetch(url, { cache: "reload", credentials: "same-origin" });
      if (!response.ok) throw new Error("Shell asset failed: " + response.status + " " + url);
      await cache.put(url, response.clone());
    })
  );
  const offlineReady = await cache.match(BASE + "/offline/");
  if (!offlineReady) {
    throw new Error("Bibli offline fallback was not cached during install");
  }
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.warn("Bibli shell asset skipped", CORE_URLS[index], result.reason);
    }
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(warmShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("bibli-") && ![SHELL_CACHE, RUNTIME_CACHE].includes(key) && !key.startsWith(PACKAGE_CACHE_PREFIX))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        await cacheResponse(RUNTIME_CACHE, request, response);
        return response;
      } catch {
        return (
          await caches.match(request) ||
          await caches.match(BASE + "/offline/") ||
          new Response("Bibli no está disponible sin conexión.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          })
        );
      }
    })());
    return;
  }

  const isSearchData = url.pathname.endsWith("/buscar/datos.json") || url.pathname.endsWith("/en/search/data.json");
  if (isSearchData) {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        return (await caches.match(request)) || new Response('{"version":1,"items":[]}', {
          status: 503,
          statusText: "Search index unavailable offline",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
          }
        });
      }
    })());
    return;
  }

  if (["style", "script", "image", "font", "manifest"].includes(request.destination)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        await cacheResponse(RUNTIME_CACHE, request, response);
        return response;
      } catch {
        return cached || Response.error();
      }
    })());
  }
});
`;

  return new Response(source.trimStart(), {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-cache, must-revalidate",
      "Service-Worker-Allowed": scope,
    },
  });
}
