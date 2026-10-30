import { describe, expect, it } from "vitest";
import { siteNav } from "./nav";
import type { Site } from "./types";

const site = {
  nav: [
    { id: "1", libelle: "Accueil", url: "/", key: "home" },
    { id: "2", libelle: "Direct", url: "/direct", key: "direct" },
    { id: "3", libelle: "Studio", url: "/direct/studio", key: "direct" },
    { id: "4", libelle: "Actualités", url: "/actualites", key: "actualites" },
    { id: "5", libelle: "Directives", url: "/directives", key: "directives" },
  ],
} as unknown as Site;

describe("siteNav", () => {
  it("retire les entrées du direct, retiré du site, sans toucher aux autres", () => {
    expect(siteNav(site).map((n) => n.url)).toEqual(["/", "/actualites", "/directives"]);
  });
  it("garde l'ordre et les sous-pages de l'administration", () => {
    const withSub = { nav: [site.nav[0], { id: "6", libelle: "Le Parti", url: "/parti", key: "parti" }, { id: "7", libelle: "Organigramme", url: "/organigramme", key: "organigramme", sub: true }] } as unknown as Site;
    expect(siteNav(withSub).map((n) => n.url)).toEqual(["/", "/parti", "/organigramme"]);
    expect(siteNav(withSub)[2].sub).toBe(true);
  });
});
