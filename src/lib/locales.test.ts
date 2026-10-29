import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, localePrefix, switchLocale } from "./locales";

describe("locales", () => {
  it("connaît les six langues du site, le français par défaut", () => {
    expect(DEFAULT_LOCALE).toBe("fr");
    expect(LOCALES).toEqual(["fr", "en", "ln", "sw", "tsh", "kik"]);
    expect(isLocale("sw")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("préfixe les adresses internes sauf en français", () => {
    expect(localePrefix("fr")).toBe("");
    expect(localePrefix("en")).toBe("/en");
    expect(localePath("fr", "/parti")).toBe("/parti");
    expect(localePath("en", "/parti")).toBe("/en/parti");
    expect(localePath("ln", "parti")).toBe("/ln/parti");
    expect(localePath("fr", "/")).toBe("/");
    expect(localePath("en", "/")).toBe("/en");
    expect(localePath("en", "/#fils")).toBe("/en#fils");
  });

  it("laisse passer les liens externes, mailto, tel et ancres", () => {
    expect(localePath("en", "https://x.com/ecide")).toBe("https://x.com/ecide");
    expect(localePath("en", "mailto:a@b.c")).toBe("mailto:a@b.c");
    expect(localePath("en", "tel:+243")).toBe("tel:+243");
    expect(localePath("en", "#valeurs")).toBe("#valeurs");
    expect(localePath("en", "")).toBe("#");
  });

  it("change la langue d'une adresse en gardant la page", () => {
    expect(switchLocale("/parti", "en")).toBe("/en/parti");
    expect(switchLocale("/en/parti", "ln")).toBe("/ln/parti");
    expect(switchLocale("/en/parti", "fr")).toBe("/parti");
    expect(switchLocale("/", "sw")).toBe("/sw");
    expect(switchLocale("/sw", "fr")).toBe("/");
    expect(switchLocale("/en/actualites/un-article", "kik")).toBe("/kik/actualites/un-article");
  });
});
