/*
 * Service worker du site public ECiDé : connexion intermittente et réseau lent (2G/3G).
 *
 * - Pages : réseau d'abord ; sans réseau (ou s'il ne répond pas à temps), la dernière version
 *   consultée sur cet appareil, sinon la page « Hors ligne ».
 * - Fichiers du site (/_next/static, versionnés) : gardés une fois chargés.
 * - Images et documents publics (/assets, /uploads) : servis depuis l'appareil, mis à jour en fond.
 * - Jamais gardés : l'API et le relais de l'espace membre (données personnelles), l'espace membre,
 *   la vérification d'une carte, les aperçus et la désinscription.
 */
const VERSION = "v1";
const PAGES = "ecide-pages-" + VERSION;
const STATIC = "ecide-static-" + VERSION;
const OFFLINE = "/hors-ligne";
const LOCALES = ["en", "ln", "sw", "tsh", "kik"];
const MAX_PAGES = 40;
const MAX_FILES = 200;
const TIMEOUT = 8000;
const PRIVATE = /^\/(?:(?:en|ln|sw|tsh|kik)\/)?(?:api|espace-membre|verifier|apercu-accueil|newsletter)(?:\/|$)/;

/** Page hors ligne et ses feuilles de style et scripts, pour qu'elle s'affiche sans réseau. */
async function precache() {
  const pages = await caches.open(PAGES);
  const files = await caches.open(STATIC);
  const res = await fetch(OFFLINE, { cache: "reload" });
  if (!res.ok) return;
  const html = await res.clone().text();
  await pages.put(OFFLINE, res);
  const assets = [...new Set([...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))];
  await Promise.all(assets.map((a) => files.add(a).catch(() => null)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().catch(() => null).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ecide-") && k !== PAGES && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Garde au plus « max » entrées : les plus anciennes partent d'abord. */
async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function page(request, url) {
  const cache = await caches.open(PAGES);
  const network = fetch(request).then((res) => {
    if (res.ok && res.type === "basic" && !res.redirected) {
      cache.put(request, res.clone()).then(() => trim(PAGES, MAX_PAGES));
    }
    return res;
  });
  const fallback = async () => {
    const kept = await cache.match(request, { ignoreSearch: true });
    if (kept) return kept;
    const lang = url.pathname.split("/")[1];
    return (LOCALES.includes(lang) && (await cache.match("/" + lang + OFFLINE))) || (await cache.match(OFFLINE)) || Response.error();
  };
  try {
    // Réseau lent : la version gardée s'affiche si le serveur tarde ; la page fraîche est gardée pour la prochaine fois
    const timer = new Promise((resolve) => setTimeout(resolve, TIMEOUT, null));
    const res = await Promise.race([network, timer]);
    if (res) return res;
    const kept = await cache.match(request, { ignoreSearch: true });
    return kept || (await network);
  } catch {
    return fallback();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const kept = await cache.match(request);
  if (kept) return kept;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") cache.put(request, res.clone()).then(() => trim(STATIC, MAX_FILES));
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC);
  const kept = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res.ok && res.type === "basic") cache.put(request, res.clone()).then(() => trim(STATIC, MAX_FILES));
    return res;
  });
  return kept ? (network.catch(() => null), kept) : network;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || PRIVATE.test(url.pathname)) return;
  // Données de navigation de Next.js (RSC) et rechargement à chaud du développement : réseau seul
  if (request.headers.get("RSC") || url.searchParams.has("_rsc") || url.pathname.startsWith("/_next/webpack-hmr")) return;
  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(cacheFirst(request));
  if (request.mode === "navigate") {
    if (url.pathname === "/sw.js") return;
    return event.respondWith(page(request, url));
  }
  if ((url.pathname.startsWith("/assets/") || url.pathname.startsWith("/uploads/")) && ["image", "font", "style"].includes(request.destination)) {
    return event.respondWith(staleWhileRevalidate(request));
  }
});
