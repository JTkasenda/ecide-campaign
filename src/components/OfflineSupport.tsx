"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/locales";

/** Connexion perdue ou retrouvée (événements du navigateur) ; « en ligne » avant l'hydratation. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

/**
 * Connexion intermittente : enregistre le service worker du site (public/sw.js, en production
 * seulement : en développement, il garderait d'anciens fichiers) et signale la perte de connexion
 * par un bandeau discret. Les pages déjà consultées restent lisibles sans réseau.
 */
export default function OfflineSupport() {
  const { t, locale } = useI18n();
  const online = useOnline();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // Un service worker laissé par une version de production gênerait le rechargement à chaud
      navigator.serviceWorker.getRegistrations().then((list) => list.forEach((r) => r.active?.scriptURL.endsWith("/sw.js") && r.unregister())).catch(() => {});
      return;
    }
    const register = () =>
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        // Page « Hors ligne » dans la langue de la visite (la française est gardée d'office)
        .then(() => (isLocale(locale) && locale !== "fr" && "caches" in window ? caches.open("ecide-pages-v1").then((c) => c.add(localePath(locale, "/hors-ligne"))) : undefined))
        .catch(() => {});
    // Après le chargement : l'enregistrement ne retarde pas l'affichage sur un réseau lent
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, [locale]);

  if (online) return null;
  return (
    <div role="status" data-offline-banner="" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100%-2rem)] bg-ecideDarkBlue text-white text-sm font-semibold px-4 py-2.5 shadow-card flex items-center gap-2">
      <i className="fa-solid fa-wifi text-ecideYellow" aria-hidden="true"></i>
      {t("Hors ligne : les pages déjà consultées restent disponibles.")}
    </div>
  );
}
