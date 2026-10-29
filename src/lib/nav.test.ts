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
  it("insère les pages propres au site après leur page parente, ou en fin de menu, sans doublon", () => {
    const t = (s: string) => `[${s}]`;
    const parti = { id: "6", libelle: "Le Parti", url: "/parti", key: "parti" };
    const president = { id: "8", libelle: "Président", url: "/president", key: "president" };
    const withParti = { nav: [site.nav[0], parti, president, site.nav[3]] } as unknown as Site;
    expect(siteNav(withParti, t).map((n) => n.url)).toEqual(["/", "/parti", "/organigramme", "/charte-valeurs", "/projet-societe", "/president", "/president/biographie", "/actualites"]);
    expect(siteNav(withParti, t)[2]).toMatchObject({ key: "organigramme", libelle: "[Organigramme]", sub: true });
    expect(siteNav(site, t).map((n) => n.url)).toEqual(["/", "/actualites", "/directives", "/organigramme", "/charte-valeurs", "/projet-societe", "/president/biographie"]);
    const listed = { nav: [parti, { id: "7", libelle: "Orga", url: "/organigramme", key: "organigramme" }] } as unknown as Site;
    expect(siteNav(listed, t).map((n) => n.url)).toEqual(["/parti", "/organigramme", "/charte-valeurs", "/projet-societe", "/president/biographie"]);
    expect(siteNav(listed, t)[1].sub).toBeUndefined();
  });
});
