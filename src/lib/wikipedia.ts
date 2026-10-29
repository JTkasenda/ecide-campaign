import { cache } from "react";

export interface WikiSummary {
  title: string;
  description: string;
  extract: string;
  url: string;
}

/** Adresse de l'API « résumé » de Wikipédia pour une adresse d'article ; null si l'adresse n'est pas un article Wikipédia. */
export function wikipediaSummaryUrl(pageUrl: string | undefined | null): string | null {
  const m = /^https:\/\/([a-z]{2,3}(?:-[a-z]+)?)\.(?:m\.)?wikipedia\.org\/wiki\/([^#?/]+)/i.exec((pageUrl || "").trim());
  return m ? `https://${m[1].toLowerCase()}.wikipedia.org/api/rest_v1/page/summary/${m[2]}` : null;
}

/**
 * Carte de l'article Wikipédia (titre, description courte, premier paragraphe disponible), rafraîchie
 * une fois par jour ; null si l'adresse n'est pas un article ou si Wikipédia ne répond pas, la
 * page garde alors le simple lien.
 */
export const getWikipediaSummary = cache(async (pageUrl: string | undefined | null): Promise<WikiSummary | null> => {
  const api = wikipediaSummaryUrl(pageUrl);
  if (!api) return null;
  try {
    const res = await fetch(api, { headers: { Accept: "application/json", "User-Agent": "ECiDe-site/1.0 (https://ecide-rdc.org; contact@ecide-rdc.org)" }, next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const d = (await res.json()) as { title?: string; description?: string; extract?: string; content_urls?: { desktop?: { page?: string } } };
    if (!d.extract) return null;
    return { title: d.title || "", description: d.description || "", extract: d.extract, url: d.content_urls?.desktop?.page || (pageUrl || "").trim() };
  } catch {
    return null;
  }
});
