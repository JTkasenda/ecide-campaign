import type { NavItem, Site } from "./types";

/** Adresses dont la page n'existe plus sur le site (le direct, en attendant l'infrastructure de diffusion). */
const RETIRED = /^\/direct(\/|$)/;

/**
 * Entrées de menu affichables, dans l'ordre de l'administration (Paramètres › Navigation) : une page
 * retirée encore listée est ignorée. Les sous-pages (`sub` : organigramme, charte des valeurs, projet de
 * société sous « Le Parti » ; biographie sous « Président » ; Faire un don) se gèrent aussi dans
 * l'administration : l'en-tête les range sous leur entrée principale (headerNav), le pied de page les liste.
 */
export function siteNav(site: Site): NavItem[] {
  return site.nav.filter((n) => n.key !== "direct" && !RETIRED.test(n.url));
}

export interface NavGroup extends NavItem {
  /** Sous-pages rangées sous cette entrée (menu déroulant sur ordinateur, liste en retrait sur mobile). */
  children: NavItem[];
}

/**
 * Menu de l'en-tête : les entrées principales, chacune avec les sous-pages qui la suivent dans l'ordre
 * de l'administration (Organigramme, Charte et Projet sous « Le Parti » ; Biographie sous « Président »).
 * Les sous-pages déjà servies par les boutons de l'en-tête (adhésion, don) sont écartées.
 */
export function headerNav(site: Site, skip: string[] = []): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const n of siteNav(site)) {
    if (n.key === "home") continue;
    if (!n.sub) groups.push({ ...n, children: [] });
    else if (!skip.includes(n.url) && groups.length) groups[groups.length - 1].children.push(n);
  }
  return groups;
}
