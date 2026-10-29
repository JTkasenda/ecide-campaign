import { assert, createRunner, launch } from "../browser.mjs";
import { url } from "./pages.spec.mjs";

/** Les titres sont en capitales par CSS : comparaison sans tenir compte de la casse. */
const has = (txt, needle) => txt.toLowerCase().includes(needle.toLowerCase());

const { test, run } = createRunner("Annuaire des structures : fédérations, sièges et cellules");
export { run };

test("l'entrée Secrétariats provinciaux liste les provinces et districts avec le siège et le nombre de sections", async () => {
  const page = await launch();
  try {
    await page.goto(url("fr", "/cadres") + "#niveau=provincial");
    const txt = await page.waitForText("main", "Voir le secrétariat provincial");
    assert(has(txt, "Secrétariat Provincial Exécutif de Kinshasa – Funa"), "district de Kinshasa absent");
    assert(/\d+ sections?/i.test(txt), "nombre de sections absent");
    assert(has(txt, "29 secrétariats provinciaux"), "compte des secrétariats absent : " + txt.slice(0, 160));
  } finally {
    await page.close();
  }
});

test("un secrétariat provincial montre son siège, ses responsables, ses sections et leurs cellules", async () => {
  const page = await launch();
  try {
    await page.goto(url("fr", "/cadres") + "#niveau=provincial&province=" + encodeURIComponent("Kinshasa – Funa"));
    const txt = await page.waitForText("main", "Siège du secrétariat provincial exécutif");
    for (const needle of ["Secrétariat Provincial Exécutif de Kinshasa – Funa", "spe.kinshasa-funa@ecide-rdc.org", "Responsables du secrétariat provincial", "Les sections du secrétariat provincial", "Section de Bandalungwa", "Cellule du quartier Lubudi", "Place de Résistance", "Écrire via le formulaire"]) {
      assert(has(txt, needle), `« ${needle} » absent`);
    }
    // Liens d'action des cellules (formulaire de contact préréglé sur la structure)
    const links = await page.evaluate(`[...document.querySelectorAll('main a[href*="structure="]')].length`);
    assert(links >= 5, "liens « Écrire » des cellules absents");
    // Filtre par section : une seule section (avec ses cellules)
    await page.goto(url("fr", "/cadres") + "#niveau=provincial&province=" + encodeURIComponent("Kinshasa – Funa") + "&commune=Bandalungwa");
    const one = await page.waitForText("main", "1 section");
    assert(has(one, "Section de Bandalungwa") && !has(one, "Section de Kalamu"), "filtre par section inopérant");
  } finally {
    await page.close();
  }
});

test("la version anglaise présente la fédération avec les libellés traduits", async () => {
  const page = await launch();
  try {
    await page.goto(url("en", "/cadres") + "#niveau=provincial&province=" + encodeURIComponent("Kinshasa – Funa"));
    const txt = await page.waitForText("main", "Provincial executive secretariat headquarters");
    assert(has(txt, "Provincial secretariat leaders") && has(txt, "sections"), "libellés anglais absents");
  } finally {
    await page.close();
  }
});
