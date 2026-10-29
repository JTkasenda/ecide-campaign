import type { NextConfig } from "next";

/**
 * Langues : le français est servi à la racine (/parti), les autres langues
 * sous préfixe (/en/parti). Les pages vivent sous app/[locale]/… ; les
 * adresses sans préfixe sont réécrites vers /fr/… et /fr/… redirige vers la racine.
 */
const RESERVED = "en|ln|sw|tsh|kik|fr|api|_next|assets|favicon\\.ico|robots\\.txt|sitemap\\.xml|icon\\.png";
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/fr" },
        { source: `/:path((?!(?:${RESERVED})(?:/|$)).*)`, destination: "/fr/:path" },
      ],
      // Images et documents : ceux du dossier public/ sont servis directement ; les autres
      // (fichiers gérés dans l'administration) sont relayés depuis le serveur Laravel.
      afterFiles: [{ source: "/assets/:path*", destination: `${API_URL}/assets/:path*` }],
      fallback: [],
    };
  },
  async redirects() {
    return [
      { source: "/fr", destination: "/", permanent: true },
      { source: "/fr/:path*", destination: "/:path*", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/:page(parti|president|cadres|diaspora|actualites|contact|adherer).html", destination: "/:page", permanent: true },
      // Le direct (diffusion depuis le site) est retiré tant que l'infrastructure n'est pas disponible
      { source: "/direct/:path*", destination: "/actualites", permanent: false },
      { source: "/:locale(en|ln|sw|tsh|kik)/direct/:path*", destination: "/:locale/actualites", permanent: false },
    ];
  },
  images: { unoptimized: true },
  // En-têtes de sécurité : pas de détection de type, pas d'affichage dans un cadre tiers, référent limité
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
