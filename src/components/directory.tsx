"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Reseaux } from "@/lib/types";

/** Normalisation pour la recherche : minuscules, sans accents. */
export const fold = (s: string) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const HASH_EVENT = "ecide:hash";

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener(HASH_EVENT, cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener(HASH_EVENT, cb);
  };
}

/**
 * Le fragment de l'adresse (#niveau=…&province=…) est l'unique source de vérité
 * des annuaires : partageable, et alimenté par les liens « Près de chez vous ».
 * Renvoie les paramètres courants et une fonction pour les remplacer.
 */
export function useHashParams(): [URLSearchParams, (next: URLSearchParams) => void] {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "");
  const set = useCallback((next: URLSearchParams) => {
    const str = next.toString();
    history.replaceState(null, "", str ? "#" + str : window.location.pathname + window.location.search);
    window.dispatchEvent(new Event(HASH_EVENT));
  }, []);
  return [new URLSearchParams(hash.replace(/^#/, "")), set];
}

const SOCIALS = {
  x: { icon: "fa-x-twitter", label: "X", url: (v: string) => (/^https?:/.test(v) ? v : "https://x.com/" + v.replace(/^@/, "")) },
  facebook: { icon: "fa-facebook-f", label: "Facebook", url: (v: string) => (/^https?:/.test(v) ? v : "https://www.facebook.com/" + v) },
  instagram: { icon: "fa-instagram", label: "Instagram", url: (v: string) => (/^https?:/.test(v) ? v : "https://www.instagram.com/" + v.replace(/^@/, "")) },
  tiktok: { icon: "fa-tiktok", label: "TikTok", url: (v: string) => (/^https?:/.test(v) ? v : "https://www.tiktok.com/@" + v.replace(/^@/, "")) },
} as const;

/** Profils publics d'une personne : seuls ses réseaux sociaux sont affichés, jamais ses numéros. */
export function SocialLinks({ r, nom, size = "w-8 h-8", center = false }: { r: Reseaux | null; nom: string; size?: string; center?: boolean }) {
  if (!r) return null;
  const keys = (Object.keys(SOCIALS) as (keyof typeof SOCIALS)[]).filter((k) => r[k]);
  if (!keys.length) return null;
  return (
    <div className={`flex gap-2 ${center ? "justify-center pt-1" : ""}`}>
      {keys.map((k) => (
        <a key={k} href={SOCIALS[k].url(r[k]!)} target="_blank" rel="noopener" className={`${size} inline-flex items-center justify-center bg-gray-100 text-gray-700 hover:bg-ecideBlue hover:text-white transition`} aria-label={`${nom} · ${SOCIALS[k].label}`} title={SOCIALS[k].label}>
          <i className={`fa-brands ${SOCIALS[k].icon}`} aria-hidden="true"></i>
        </a>
      ))}
    </div>
  );
}
