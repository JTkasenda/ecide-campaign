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
});
