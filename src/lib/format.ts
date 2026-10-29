import type { CSSProperties } from "react";
import { LOCALE_TAGS, isLocale } from "./locales";

/** Nombre formaté dans la langue du site (1 000 en français, 1,000 en anglais). */
export function formatNumber(n: number, locale: string): string {
  const tag = isLocale(locale) ? LOCALE_TAGS[locale] : "fr-FR";
  return new Intl.NumberFormat(tag).format(n);
}

/** Classes Tailwind par teinte (bleu, jaune, vert) — mêmes valeurs que App\Support\SiteContent::TINT. */
export const TINT = {
  bleu: { bg: "bg-ecideBlue-50", text: "text-ecideBlue", icon: "text-ecideBlue-600", border: "border-ecideBlue-200", bar: "bg-ecideBlue-200", panel: "bg-ecideBlue-50", panelBorder: "border-ecideBlue-100" },
  jaune: { bg: "bg-ecideYellow-50", text: "text-ecideYellow-700", icon: "text-ecideYellow-700", border: "border-ecideYellow-200", bar: "bg-ecideYellow", panel: "bg-ecideYellow-50", panelBorder: "border-ecideYellow-100" },
  vert: { bg: "bg-ecideGreen-50", text: "text-ecideGreen", icon: "text-ecideGreen", border: "border-ecideGreen-200", bar: "bg-ecideGreen-200", panel: "bg-ecideGreen-50", panelBorder: "border-ecideGreen-100" },
} as const;

export type TintKey = keyof typeof TINT;

export function tint(couleur?: string) {
  return TINT[(couleur as TintKey) in TINT ? (couleur as TintKey) : "bleu"];
}

/** Classes par couleur des annuaires (blue, yellow, green). */
export const TONE = {
  blue: { avatar: "bg-ecideBlue-50 text-ecideBlue", border: "border-ecideBlue-200", tag: "text-ecideBlue" },
  yellow: { avatar: "bg-ecideYellow-50 text-ecideYellow-700", border: "border-ecideYellow-200", tag: "text-ecideYellow-700" },
  green: { avatar: "bg-ecideGreen-50 text-ecideGreen", border: "border-ecideGreen-200", tag: "text-ecideGreen" },
} as const;

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Lien WhatsApp à partir d'un numéro ou d'une adresse déjà complète. */
export function waLink(value: string): string {
  return /^https?:/.test(value) ? value : "https://wa.me/" + value.replace(/\D/g, "");
}

export function telHref(value: string): string {
  return "tel:" + value.replace(/\s+/g, "");
}

/** Adresse externe saisie dans l'administration : http(s), mailto ou tel, sinon « # » (jamais javascript:). */
export function safeUrl(url: string | undefined | null): string {
  const u = (url || "").trim();
  return /^(https?:|mailto:|tel:)/i.test(u) ? u : "#";
}

/** Plus petite taille de texte acceptée (en %), comme dans l'API ; aucune limite haute. */
export const TEXT_SCALE_MIN = 1;

/**
 * Pourcentage de taille de texte (administration) → facteur CSS, avec repli sur 1
 * quand la valeur manque, n'est pas un nombre ou est inférieure au minimum.
 */
export function textScale(percent: unknown): number {
  const n = typeof percent === "string" ? Number(percent) : percent;
  if (typeof n !== "number" || !Number.isFinite(n)) return 1;
  const rounded = Math.round(n);
  return rounded < TEXT_SCALE_MIN ? 1 : rounded / 100;
}

/** Style d'un texte réglé individuellement dans l'administration : facteur --ts-el lu par globals.css. */
export function textStyle(percent: unknown): CSSProperties {
  return { "--ts-el": textScale(percent) } as CSSProperties;
}

/** Variables CSS posées sur <html> : taille générale et tailles par famille de textes (Paramètres › Typographie). */
export function siteTextVars(p: { texteTaille?: unknown; tailleTitres?: unknown; tailleSousTitres?: unknown; tailleSurtitres?: unknown; tailleParagraphes?: unknown; tailleBoutons?: unknown; tailleEntete?: unknown; taillePied?: unknown; tailleFil?: unknown }): CSSProperties {
  return {
    "--ecide-text-scale": textScale(p.texteTaille),
    "--ts-titres": textScale(p.tailleTitres),
    "--ts-sous-titres": textScale(p.tailleSousTitres),
    "--ts-surtitres": textScale(p.tailleSurtitres),
    "--ts-paragraphes": textScale(p.tailleParagraphes),
    "--ts-boutons": textScale(p.tailleBoutons),
    "--ts-entete": textScale(p.tailleEntete),
    "--ts-pied": textScale(p.taillePied),
    "--ts-fil": textScale(p.tailleFil),
  } as CSSProperties;
}
