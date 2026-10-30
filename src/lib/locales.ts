/** Langues du site : le français (racine) et les langues sous préfixe d'adresse. */
export const DEFAULT_LOCALE = "fr";

export const LOCALES = ["fr", "en", "ln", "sw", "tsh", "kik"] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  ln: "Lingála",
  sw: "Kiswahili",
  tsh: "Tshiluba",
  kik: "Kikongo",
};

/** Étiquettes BCP 47 pour Intl (nombres, dates) et Open Graph. */
export const LOCALE_TAGS: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-GB",
  ln: "fr-CD",
  sw: "sw-KE",
  tsh: "fr-CD",
  kik: "fr-CD",
};

export const OG_LOCALES: Record<Locale, string> = {
  fr: "fr_FR",
  en: "en_GB",
  ln: "fr_CD",
  sw: "sw_KE",
  tsh: "fr_CD",
  kik: "fr_CD",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** Préfixe d'adresse : '' en français, '/en' en anglais. */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

/**
 * Chemin public d'un lien interne dans une langue. Les liens externes,
 * mailto:, tel: et ancres sont rendus tels quels.
 */
/** Anciennes adresses du bloc Don de la page Adhésion : la page Faire un don les remplace. */
function retargetDon(path: string): string {
  return path.replace(/^(\/[a-z]{2,3})?\/adherer#don$/i, "$1/don");
}

export function localePath(locale: Locale, path: string): string {
  path = retargetDon(path);
  if (!path || path === "#") return "#";
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  const prefix = localePrefix(locale);
  if (clean === "/" || clean.startsWith("/#")) return (prefix || "/") + (clean === "/" ? "" : clean.slice(1));
  return prefix + clean;
}

/** Même page dans une autre langue : /en/parti → /ln/parti, /parti → /en/parti. */
export function switchLocale(pathname: string, target: Locale): string {
  const parts = pathname.split("/");
  // Le préfixe /fr n'apparaît qu'en interne (réécriture) : on l'enlève aussi
  const rest = isLocale(parts[1]) ? "/" + parts.slice(2).join("/") : pathname;
  const clean = rest === "" ? "/" : rest;
  return localePath(target, clean);
}
