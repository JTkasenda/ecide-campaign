import { assert, createRunner, launch } from "../browser.mjs";
import { url } from "./pages.spec.mjs";

const { test, run } = createRunner("Lettre d'information : formulaire et page de désabonnement");
export { run };

test("le formulaire des actualités propose e-mail, prénom facultatif et note de langue", async () => {
  const page = await launch();
  try {
    await page.goto(url("en", "/actualites"));
    assert(await page.evaluate(`!!document.querySelector('input[name=email][type=email]')`), "champ e-mail absent");
    assert(await page.evaluate(`!!document.querySelector('input[name=nom]')`), "champ prénom absent");
    const txt = await page.text("main");
    assert(txt.includes("Every mailing is personalised"), "note de personnalisation absente");
  } finally {
    await page.close();
  }
});

test("la page de désabonnement explique un lien manquant, un jeton inconnu et un message de test", async () => {
  const page = await launch();
  try {
    await page.goto(url("en", "/newsletter/desinscription"));
    assert((await page.waitForText("main", "Missing unsubscribe link")).includes("Missing unsubscribe link"), "lien manquant non signalé");

    await page.goto(url("en", "/newsletter/desinscription") + "?token=inconnu-" + Date.now());
    const unknown = await page.waitForText("main", "no longer valid");
    assert(unknown.includes("no longer valid"), "jeton inconnu non signalé : " + unknown.slice(0, 160));

    await page.goto(url("fr", "/newsletter/desinscription") + "?token=test");
    const test = await page.waitForText("main", "message de test");
    assert(test.includes("message de test"), "jeton de test non expliqué : " + test.slice(0, 160));
  } finally {
    await page.close();
  }
});
