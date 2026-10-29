import type { NavItem, Site } from "./types";

/** Adresses dont la page n'existe plus sur le site (le direct, en attendant l'infrastructure de diffusion). */
const RETIRED = /^\/direct(\/|$)/;

/**
 * Entrées de menu affichables : l'administration peut encore lister une page retirée.
 * Avec un libellé, la page Organigramme (propre à ce site) est insérée après « Le Parti »
 * si l'administration ne la liste pas déjà.
 */
export function siteNav(site: Site, organigramme?: string): NavItem[] {
  const nav = site.nav.filter((n) => n.key !== "direct" && !RETIRED.test(n.url));
  if (!organigramme || nav.some((n) => n.url === "/organigramme")) return nav;
  const entry: NavItem = { id: "organigramme", libelle: organigramme, url: "/organigramme", key: "organigramme" };
  const i = nav.findIndex((n) => n.key === "parti");
  return i === -1 ? [...nav, entry] : [...nav.slice(0, i + 1), entry, ...nav.slice(i + 1)];
}
