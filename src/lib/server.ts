import "server-only";
import { cache } from "react";
import type { Metadata } from "next";
import { getI18n, getSite } from "./api";
import { makeT, type T } from "./t";
import { DEFAULT_LOCALE, LOCALES, OG_LOCALES, localePath, type Locale } from "./locales";

/** Fonction de traduction côté serveur, dédoublonnée par rendu. */
export const getT = cache(async (locale: Locale): Promise<T> => {
  if (locale === DEFAULT_LOCALE) return makeT({});
  const { strings } = await getI18n(locale);
  return makeT(strings);
});

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Auteur du site, déclaré dans les métadonnées de chaque page. */
export const SITE_AUTHOR = { name: "Jean Tshimbalanga Kasenda", url: "https://github.com/jtkasenda" };

/** Métadonnées d'une page : titre, description, Open Graph et versions linguistiques (hreflang). */
/** Adresse absolue d'une image pour les aperçus de partage ; undefined si inutilisable (data URL, vide). */
function shareImage(src: string | undefined): string | undefined {
  if (!src || src.startsWith("data:")) return undefined;
  if (/^https?:\/\//.test(src)) return src;
  return SITE_URL + (src.startsWith("/") ? src : `/${src}`);
}

/**
 * Métadonnées d'une page : titre, description, langues, et cartes de partage (Open Graph pour
 * Facebook, WhatsApp, LinkedIn ; Twitter Card pour X) avec une image absolue — celle de la
 * page ou de l'article, sinon l'image de partage du site (image de une de l'accueil).
 */
export async function pageMetadata(locale: Locale, path: string, opts: { title?: string; description?: string; image?: string; type?: "website" | "article"; article?: { publishedTime?: string; author?: string; section?: string } } = {}): Promise<Metadata> {
  const site = await getSite(locale);
  const name = site.params.nom || "ECiDé";
  const longName = site.params.nomLong || "";
  const title = opts.title ? `${opts.title} | ${name}` : `${name} - ${longName}`;
  const description = opts.description || site.params.description || "";
  const languages: Record<string, string> = {};
  for (const code of LOCALES) languages[code] = SITE_URL + localePath(code, path);
  languages["x-default"] = SITE_URL + localePath(DEFAULT_LOCALE, path);
  const url = SITE_URL + localePath(locale, path);
  const image = shareImage(opts.image) || shareImage(site.assets.social) || `${SITE_URL}/assets/img/hero-militants.jpg`;
  const shortTitle = opts.title || `${name} - ${longName}`;
  return {
    // Titre complet : le gabarit « %s | nom » du layout ne s'applique pas une seconde fois
    title: { absolute: title },
    description,
    metadataBase: new URL(SITE_URL),
    authors: [SITE_AUTHOR],
    creator: SITE_AUTHOR.name,
    publisher: name,
    alternates: { canonical: url, languages },
    openGraph: {
      type: opts.type || "website",
      siteName: name,
      title: shortTitle,
      description,
      url,
      locale: OG_LOCALES[locale],
      images: [{ url: image, alt: shortTitle }],
      ...(opts.type === "article" && opts.article
        ? { publishedTime: opts.article.publishedTime || undefined, authors: opts.article.author ? [opts.article.author] : undefined, section: opts.article.section || undefined }
        : {}),
    },
    twitter: { card: "summary_large_image", site: site.params.x ? `@${site.params.x.replace(/^@/, "")}` : undefined, title: shortTitle, description, images: [image] },
    icons: { icon: "/assets/img/favicon-64.png", apple: "/assets/img/logo-160.png" },
  };
}
