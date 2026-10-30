import type { NavItem, Site } from "./types";

/** Adresses dont la page n'existe plus sur le site (le direct, en attendant l'infrastructure de diffusion). */
const RETIRED = /^\/direct(\/|$)/;

/**
 * Entrées de menu affichables, dans l'ordre de l'administration (Paramètres › Navigation) : une page
 * retirée encore listée est ignorée. Les sous-pages (`sub` : organigramme, charte des valeurs, projet de
 * société sous « Le Parti » ; biographie sous « Président » ; Faire un don) se gèrent aussi dans
 * l'administration : l'en-tête les écarte, le pied de page les garde.
 */
export function siteNav(site: Site): NavItem[] {
  return site.nav.filter((n) => n.key !== "direct" && !RETIRED.test(n.url));
}
