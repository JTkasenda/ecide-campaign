import { describe, expect, it } from "vitest";
import { makeT } from "./t";

describe("makeT", () => {
  const t = makeT({ "Page :page sur :pages": "Page :page of :pages", Bonjour: "Hello" });

  it("traduit quand la phrase est connue et renvoie la source sinon", () => {
    expect(t("Bonjour")).toBe("Hello");
    expect(t("Inconnue")).toBe("Inconnue");
  });

  it("remplace les paramètres, les clés les plus longues d'abord", () => {
    expect(t("Page :page sur :pages", { page: 2, pages: 7 })).toBe("Page 2 of 7");
    expect(makeT({})("Page :page sur :pages", { page: 1, pages: 3 })).toBe("Page 1 sur 3");
  });

  it("accepte des valeurs numériques et des chaînes", () => {
    expect(makeT({})(":n cadres", { n: 12 })).toBe("12 cadres");
    expect(makeT({})("Structure : :structure", { structure: "Fédération Kinshasa" })).toBe("Structure : Fédération Kinshasa");
  });
});
