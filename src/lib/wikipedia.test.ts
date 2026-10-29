import { describe, expect, it } from "vitest";
import { wikipediaSummaryUrl } from "./wikipedia";

describe("wikipediaSummaryUrl", () => {
  it("reconnaît un article Wikipédia (ordinateur ou mobile) et ignore le reste", () => {
    expect(wikipediaSummaryUrl("https://fr.wikipedia.org/wiki/Martin_Fayulu")).toBe("https://fr.wikipedia.org/api/rest_v1/page/summary/Martin_Fayulu");
    expect(wikipediaSummaryUrl(" https://fr.m.wikipedia.org/wiki/Martin_Fayulu#Biographie ")).toBe("https://fr.wikipedia.org/api/rest_v1/page/summary/Martin_Fayulu");
    expect(wikipediaSummaryUrl("https://en.wikipedia.org/wiki/Martin_Fayulu?x=1")).toBe("https://en.wikipedia.org/api/rest_v1/page/summary/Martin_Fayulu");
    expect(wikipediaSummaryUrl("https://example.org/wiki/Martin_Fayulu")).toBeNull();
    expect(wikipediaSummaryUrl("http://fr.wikipedia.org/wiki/Martin_Fayulu")).toBeNull();
    expect(wikipediaSummaryUrl("")).toBeNull();
    expect(wikipediaSummaryUrl(undefined)).toBeNull();
  });
});
