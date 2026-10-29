import { assert, createRunner, launch } from "../browser.mjs";
import { LOCALES, PATHS, articleSlug, url } from "./pages.spec.mjs";

const { test, run } = createRunner("Mise en page : aucun débordement, en-tête et sections hero");
export { run };

const WIDTHS = [360, 768, 1280, 1440];

/** Éléments qui dépassent la largeur de l'écran (hors zones à défilement ou cadrage volontaire). */
const OVERFLOW = `(() => {
  const doc = document.documentElement, vw = doc.clientWidth, bad = [];
  const clipped = (el) => { for (let a = el.parentElement; a && a !== document.body && a !== doc; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === "hidden" || o === "clip" || o === "auto" || o === "scroll") return true; } return false; };
  for (const el of document.body.querySelectorAll("*")) {
    if (el.closest("#toast, script, style, noscript")) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.position === "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if ((r.right > vw + 1 || r.left < -1) && !clipped(el)) bad.push(el.tagName.toLowerCase() + "." + String(el.className).slice(0, 40) + " [" + Math.round(r.left) + ".." + Math.round(r.right) + "]");
  }
  const ul = document.querySelector("header nav ul");
  const navShown = !!ul && getComputedStyle(ul).display !== "none";
  return { bad: bad.slice(0, 5), count: bad.length, navShown, navClipped: navShown && ul.scrollWidth > ul.clientWidth + 1 };
})()`;

const HERO = `(() => {
  const hero = document.querySelector("main section");
  const r = hero.getBoundingClientRect();
  // Le fil d'actualité est placé sous le bandeau : le bandeau commence directement sous l'en-tête
  const top = document.querySelector("header").getBoundingClientRect().bottom;
  return { top: Math.round(r.top), visibleTop: Math.round(top), bottom: Math.round(r.bottom), vh: window.innerHeight };
})()`;

for (const locale of LOCALES) {
  test(`aucun débordement horizontal en ${locale} sur toutes les pages et largeurs`, async () => {
    const page = await launch();
    try {
      const slug = await articleSlug();
      const paths = [...PATHS, ...(slug ? [`/actualites/${slug}`] : [])];
      const problems = [];
      for (const path of paths) {
        await page.setViewport(WIDTHS[0], 740);
        await page.goto(url(locale, path));
        for (const w of WIDTHS) {
          await page.setViewport(w, 900);
          await new Promise((r) => setTimeout(r, 250));
          const m = await page.evaluate(OVERFLOW);
          if (m.count || m.navClipped) problems.push(`${path} @${w}: ${m.navClipped ? "menu tronqué " : ""}${m.bad.join(", ")}`);
          if (w === WIDTHS[0]) {
            await page.evaluate(`document.querySelector('header button[aria-controls=mobileMenu]')?.click(); true`);
            await new Promise((r) => setTimeout(r, 150));
            const mm = await page.evaluate(OVERFLOW);
            if (mm.count) problems.push(`${path} @${w} (menu ouvert): ${mm.bad.join(", ")}`);
            await page.evaluate(`document.querySelector('header button[aria-controls=mobileMenu]')?.click(); true`);
          }
        }
      }
      assert(problems.length === 0, problems.join("\n"));
    } finally {
      await page.close();
    }
  });
}

test("le menu de bureau tient sur une ligne dans toutes les langues à 1280 px", async () => {
  const page = await launch({ width: 1280, height: 900 });
  try {
    for (const locale of LOCALES) {
      await page.goto(url(locale, "/"));
      const m = await page.evaluate(OVERFLOW);
      assert(m.navShown && !m.navClipped, `${locale} : menu ${m.navShown ? "tronqué" : "replié"}`);
    }
  } finally {
    await page.close();
  }
});

test("les sections hero commencent sous l'en-tête et gardent une hauteur minimale (accueil, parti, président)", async () => {
  const page = await launch();
  try {
    for (const [w, h] of [[1440, 900], [1366, 768]]) {
      for (const path of ["/", "/parti", "/president"]) {
        await page.setViewport(w, h);
        await page.goto(url("fr", path));
        const m = await page.evaluate(HERO);
        assert(m.top === m.visibleTop, `${path} @${w}x${h} : le hero commence à ${m.top} au lieu de ${m.visibleTop}`);
        assert(m.bottom - m.top >= 400, `${path} @${w}x${h} : le hero ne fait que ${m.bottom - m.top}px de haut`);
      }
    }
  } finally {
    await page.close();
  }
});
