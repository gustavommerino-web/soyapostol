/* soyapostol service worker — offline-first with three caching strategies.
 *
 *   1. App shell (HTML, CSS, JS, fonts, logo) — cache-first with network
 *      update on navigation requests so revisits are instant.
 *   2. Static JSON data (/data/*.json) — stale-while-revalidate. Huge files
 *      (bible 5 MB, catechism) ship from the cache the second time.
 *   3. Everything else on GET (images, Vatican CDN, evangelizo API,
 *      vaticannews RSS via our backend) — stale-while-revalidate so users
 *      stay functional offline with yesterday's content.
 *
 *   Auth/POST/PUT/DELETE/PATCH requests are never cached — they pass through.
 */
const SW_VERSION = "v5";
const APP_SHELL_CACHE = `soyapostol-shell-${SW_VERSION}`;
const DATA_CACHE = `soyapostol-data-${SW_VERSION}`;
const RUNTIME_CACHE = `soyapostol-runtime-${SW_VERSION}`;

const PRECACHE_URLS = [
    "/",
    "/index.html",
    "/manifest.webmanifest",
    "/logo.png",
    "/icon-192.png",
    "/icon-512.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(APP_SHELL_CACHE);
        // Fetch each URL with cache:"reload" so the SW doesn't pick up an
        // HTTP cache stale copy during install.
        await Promise.all(
            PRECACHE_URLS.map((url) =>
                cache.add(new Request(url, { cache: "reload" })).catch(() => null),
            ),
        );
        self.skipWaiting();
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(
            keys
                .filter((k) => ![APP_SHELL_CACHE, DATA_CACHE, RUNTIME_CACHE].includes(k))
                .map((k) => caches.delete(k)),
        );
        await self.clients.claim();
    })());
});

self.addEventListener("message", (event) => {
    if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isNavigation(request) {
    return request.mode === "navigate"
        || (request.method === "GET"
            && request.headers.get("accept")?.includes("text/html"));
}

function isStaticData(url) {
    return url.pathname.startsWith("/data/") && url.pathname.endsWith(".json");
}

function isApiRequest(url) {
    return url.pathname.startsWith("/api/");
}

// Stale-while-revalidate: serve cache instantly, revalidate in background.
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const networkFetch = fetch(request).then((res) => {
        if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
        return res;
    }).catch(() => cached);
    return cached || networkFetch;
}

// Network-first with cache fallback — used for navigations so users always
// see the freshest UI when online, but still get the app shell when offline.
async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    try {
        const res = await fetch(request);
        if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
        return res;
    } catch {
        const cached = await cache.match(request) || await cache.match("/");
        if (cached) return cached;
        throw new Error("offline and no cache");
    }
}

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    // Skip analytics / tracking / chrome-extension origins.
    if (!url.protocol.startsWith("http")) return;
    if (url.host.includes("posthog") || url.host.includes("emergent.sh")) return;

    // App navigations → network-first for freshness, fallback to app shell.
    if (isNavigation(request)) {
        event.respondWith(networkFirst(request, APP_SHELL_CACHE));
        return;
    }

    // Large static JSON (Bible, Catechism) → aggressive cache.
    if (isStaticData(url) && url.origin === self.location.origin) {
        event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
        return;
    }

    // Our own API (readings / news / liturgy / prayers) → stale-while-revalidate.
    if (isApiRequest(url) && url.origin === self.location.origin) {
        event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
        return;
    }

    // Same-origin static assets (JS/CSS/images) → stale-while-revalidate.
    if (url.origin === self.location.origin) {
        event.respondWith(staleWhileRevalidate(request, APP_SHELL_CACHE));
        return;
    }

    // Cross-origin assets (fonts.googleapis, CDN images, Evangelizo API…)
    // Use stale-while-revalidate for GETs that look like fonts/images/JSON.
    if (url.host.includes("fonts.googleapis.com")
        || url.host.includes("fonts.gstatic.com")
        || url.host.includes("vaticannews.va")
        || url.host.includes("aciprensa.com")
        || url.host.includes("publication.evangelizo.ws")
        || url.host.includes("ewtnnews.com")
    ) {
        event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    }
});
