import type { T } from "./t";
import type { NavItem, Site } from "./types";

/** Adresses dont la page n'existe plus sur le site (le direct, en attendant l'infrastructure de diffusion). */
const RETIRED = /^\/direct(\/|$)/;

/** Pages propres à ce site, insérées dans cet ordre après leur page parente quand l'administration ne les liste pas. */
export const EXTRA_PAGES = [
  { key: "organigramme", url: "/organigramme", label: "Organigramme", after: "parti" },
  { key: "charte-valeurs", url: "/charte-valeurs", label: "Charte des valeurs", after: "parti" },
  { key: "projet-societe", url: "/projet-societe", label: "Projet de société", after: "parti" },
  { key: "biographie", url: "/president/biographie", label: "Biographie", after: "president" },
] as const;

/**
 * Entrées de menu affichables : l'administration peut encore lister une page retirée.
 * Avec une fonction de traduction, les pages propres à ce site (organigramme, charte des valeurs,
 * projet de société sous « Le Parti » ; biographie sous « Président ») sont insérées après leur
 * page parente (en fin de menu si elle manque), marquées `sub`, sauf si l'administration les liste déjà.
 */
export function siteNav(site: Site, t?: T): NavItem[] {
  const nav = site.nav.filter((n) => n.key !== "direct" && !RETIRED.test(n.url));
  if (!t) return nav;
  const out = [...nav];
  for (const e of EXTRA_PAGES) {
    if (out.some((n) => n.url === e.url)) continue;
    const entry: NavItem = { id: e.key, libelle: t(e.label), url: e.url, key: e.key, sub: true };
    // Après la page parente et les sous-pages du même parent déjà présentes derrière elle
    let i = out.findIndex((n) => n.key === e.after);
    if (i === -1) {
      out.push(entry);
      continue;
    }
    while (out[i + 1] && EXTRA_PAGES.some((x) => x.after === e.after && x.url === out[i + 1].url)) i++;
    out.splice(i + 1, 0, entry);
  }
  return out;
}
