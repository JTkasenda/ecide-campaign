import type { NavItem, Site } from "./types";

/** Adresses dont la page n'existe plus sur le site (le direct, en attendant l'infrastructure de diffusion). */
const RETIRED = /^\/direct(\/|$)/;

/** Entrées de menu affichables : l'administration peut encore lister une page retirée. */
export function siteNav(site: Site): NavItem[] {
  return site.nav.filter((n) => n.key !== "direct" && !RETIRED.test(n.url));
}
