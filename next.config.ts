import type { NextConfig } from "next";

/**
 * Langues : le français est servi à la racine (/parti), les autres langues
 * sous préfixe (/en/parti). Les pages vivent sous app/[locale]/… ; les
 * adresses sans préfixe sont réécrites vers /fr/… et /fr/… redirige vers la racine.
 */
const RESERVED = "en|ln|sw|tsh|kik|fr|api|_next|assets|uploads|favicon\\.ico|robots\\.txt|sitemap\\.xml|icon\\.png|sw\\.js";
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
// Administration (aperçu de la typographie) : en local, localhost et 127.0.0.1 sont équivalents
const ADMIN_ORIGINS = (() => {
  const u = new URL(API_URL);
  const twin = u.hostname === "localhost" ? "127.0.0.1" : u.hostname === "127.0.0.1" ? "localhost" : "";
  return [u.origin].concat(twin ? [`${u.protocol}//${twin}${u.port ? `:${u.port}` : ""}`] : []);
})();

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/fr" },
        { source: `/:path((?!(?:${RESERVED})(?:/|$)).*)`, destination: "/fr/:path" },
      ],
      // Images et documents : ceux du dossier public/ sont servis directement ; les autres
      // (fichiers gérés dans l'administration, dont les PDF téléversés sous /uploads) sont relayés
      // depuis le serveur Laravel : même origine, donc aperçu dans la page et téléchargement direct.
      afterFiles: [
        { source: "/assets/:path*", destination: `${API_URL}/assets/:path*` },
        { source: "/uploads/:path*", destination: `${API_URL}/uploads/:path*` },
      ],
      fallback: [],
    };
  },
  async redirects() {
    return [
      { source: "/fr", destination: "/", permanent: true },
      { source: "/fr/:path*", destination: "/:path*", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/:page(parti|organigramme|charte-valeurs|projet-societe|president|cadres|diaspora|actualites|contact|adherer|don).html", destination: "/:page", permanent: true },
      // Le direct (diffusion depuis le site) est retiré tant que l'infrastructure n'est pas disponible
      { source: "/direct/:path*", destination: "/actualites", permanent: false },
      { source: "/:locale(en|ln|sw|tsh|kik)/direct/:path*", destination: "/:locale/actualites", permanent: false },
    ];
  },
  images: { unoptimized: true },
  // En-têtes de sécurité : pas de détection de type, pas d'affichage dans un cadre tiers (sauf l'administration), référent limité
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Affichage dans un cadre : le site lui-même et l'administration (aperçu de la typographie) seulement
          { key: "Content-Security-Policy", value: `frame-ancestors 'self' ${ADMIN_ORIGINS.join(" ")}` },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      // Service worker (connexion intermittente) : toujours revérifié, pour que ses mises à jour arrivent vite
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
