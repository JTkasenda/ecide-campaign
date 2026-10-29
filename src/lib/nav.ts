import type { T } from "./t";
import type { NavItem, Site } from "./types";

/** Adresses dont la page n'existe plus sur le site (le direct, en attendant l'infrastructure de diffusion). */
const RETIRED = /^\/direct(\/|$)/;

/** Pages propres à ce site, insérées dans cet ordre après « Le Parti » quand l'administration ne les liste pas. */
export const EXTRA_PAGES = [
  { key: "organigramme", url: "/organigramme", label: "Organigramme" },
  { key: "charte-valeurs", url: "/charte-valeurs", label: "Charte des valeurs" },
  { key: "projet-societe", url: "/projet-societe", label: "Projet de société" },
] as const;

/**
 * Entrées de menu affichables : l'administration peut encore lister une page retirée.
 * Avec une fonction de traduction, les pages propres à ce site (organigramme, charte des valeurs,
 * projet de société) sont insérées après « Le Parti », marquées `sub`, sauf si l'administration
 * les liste déjà.
 */
export function siteNav(site: Site, t?: T): NavItem[] {
  const nav = site.nav.filter((n) => n.key !== "direct" && !RETIRED.test(n.url));
  if (!t) return nav;
  const extras: NavItem[] = EXTRA_PAGES.filter((e) => !nav.some((n) => n.url === e.url)).map((e) => ({ id: e.key, libelle: t(e.label), url: e.url, key: e.key, sub: true }));
  if (!extras.length) return nav;
  const i = nav.findIndex((n) => n.key === "parti");
  return i === -1 ? [...nav, ...extras] : [...nav.slice(0, i + 1), ...extras, ...nav.slice(i + 1)];
}
