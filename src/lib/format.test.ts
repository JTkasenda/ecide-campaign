import { describe, expect, it } from "vitest";
import { TINT, formatNumber, pad2, safeUrl, siteTextVars, telHref, textScale, textStyle, tint, waLink } from "./format";

describe("format", () => {
  it("safeUrl n'accepte que http(s), mailto et tel", () => {
    expect(safeUrl("https://x.com/ecide")).toBe("https://x.com/ecide");
    expect(safeUrl("http://example.org")).toBe("http://example.org");
    expect(safeUrl("mailto:a@b.c")).toBe("mailto:a@b.c");
    expect(safeUrl("tel:+243")).toBe("tel:+243");
    expect(safeUrl("javascript:alert(1)")).toBe("#");
    expect(safeUrl(" JAVASCRIPT:alert(1)")).toBe("#");
    expect(safeUrl("data:text/html,x")).toBe("#");
    expect(safeUrl("")).toBe("#");
    expect(safeUrl(undefined)).toBe("#");
    expect(safeUrl("#")).toBe("#");
  });

  it("waLink et telHref construisent des liens sûrs", () => {
    expect(waLink("+243 81 234 56 78")).toBe("https://wa.me/243812345678");
    expect(waLink("https://whatsapp.com/channel/abc")).toBe("https://whatsapp.com/channel/abc");
    expect(telHref("+243 81 234")).toBe("tel:+24381234");
  });

  it("formatNumber suit la langue et pad2 complète", () => {
    expect(formatNumber(1000, "en")).toBe("1,000");
    expect(formatNumber(1000, "fr").replace(/\s/g, " ")).toBe("1 000");
    expect(formatNumber(1000, "xx").replace(/\s/g, " ")).toBe("1 000");
    expect(pad2(3)).toBe("03");
    expect(pad2(12)).toBe("12");
  });

  it("tint revient au bleu pour une couleur inconnue", () => {
    expect(tint("vert")).toBe(TINT.vert);
    expect(tint("rose")).toBe(TINT.bleu);
    expect(tint(undefined)).toBe(TINT.bleu);
  });

  it("textScale convertit le pourcentage de l'administration en facteur borné", () => {
    expect(textScale(100)).toBe(1);
    expect(textScale(115)).toBe(1.15);
    expect(textScale("120")).toBe(1.2);
    expect(textScale(400)).toBe(4);
    expect(textScale(10)).toBe(0.1);
    expect(textScale(0)).toBe(1);
    expect(textScale(-20)).toBe(1);
    expect(textScale(undefined)).toBe(1);
    expect(textScale(null)).toBe(1);
    expect(textScale("abc")).toBe(1);
    expect(textStyle(130)).toEqual({ "--ts-el": 1.3 });
    const vars = siteTextVars({ texteTaille: 110, taillePied: 90 }) as Record<string, number>;
    expect(vars["--ecide-text-scale"]).toBe(1.1);
    expect(vars["--ts-pied"]).toBe(0.9);
    expect(vars["--ts-titres"]).toBe(1);
  });
});
