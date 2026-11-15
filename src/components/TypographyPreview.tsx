"use client";

import { useEffect } from "react";
import { adminOrigins } from "@/lib/api";

/**
 * Aperçus de l'administration. Paramètres › Typographie : quand le site est affiché dans l'administration (cadre),
 * celle-ci envoie les réglages pas encore enregistrés (polices et tailles) ; le site les applique
 * aussitôt, exactement comme le ferait l'enregistrement. Seule l'administration (même origine que
 * l'API) est écoutée, et seules les variables de typographie et la feuille des polices changent.
 * Page d'accueil : l'administration demande aussi de se placer sur la section qu'elle modifie.
 */
const ALLOWED_VAR = /^--(font-(display|sans|serif|ui)|ecide-text-scale|ts-(titres|sous-titres|surtitres|paragraphes|boutons|entete|pied|fil))$/;
const SAFE_VALUE = /^[\p{L}\p{N}\s"',.\-]{1,300}$/u;

export default function TypographyPreview() {
  useEffect(() => {
    if (window.parent === window) return;
    const origins = adminOrigins();
    const onMessage = (event: MessageEvent) => {
      if (!origins.includes(event.origin)) return;
      const data = event.data as { type?: string; vars?: Record<string, unknown>; css?: unknown; section?: unknown; smooth?: unknown } | null;
      // Aperçu de la page d'accueil : se placer sur la section en cours de modification
      if (data && data.type === "ecide:scroll" && typeof data.section === "string" && /^[a-z]+$/.test(data.section)) {
        const el = document.querySelector<HTMLElement>(`[data-apercu="${data.section}"]`);
        const header = document.querySelector("header");
        if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - (header?.getBoundingClientRect().height || 0)), behavior: data.smooth ? "smooth" : "instant" });
        return;
      }
      if (!data || data.type !== "ecide:typo") return;
      const root = document.documentElement;
      for (const [key, value] of Object.entries(data.vars || {})) {
        if (ALLOWED_VAR.test(key) && typeof value === "string" && SAFE_VALUE.test(value)) root.style.setProperty(key, value);
      }
      if (typeof data.css === "string" && origins.some((o) => (data.css as string).startsWith(`${o}/api/v1/fonts.css?`))) {
        const link = document.querySelector<HTMLLinkElement>("link[data-site-fonts]");
        if (link && link.href !== data.css) link.href = data.css;
      }
    };
    window.addEventListener("message", onMessage);
    // Prêt (aussi après chaque changement de page dans le cadre) : l'administration renvoie ses réglages
    origins.forEach((o) => window.parent.postMessage({ type: "ecide:typo-ready" }, o));
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return null;
}
