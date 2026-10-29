// Tests visuels : captures des pages comparées pixel à pixel aux références de tests/visual/baseline.
//   npm run test:visual            compare (échec au-delà de 0,5 % de pixels différents, diffs dans tests/visual/output)
//   npm run test:visual -- --update  (re)crée les références
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launch } from "../browser.mjs";
import { url } from "../e2e/pages.spec.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const BASELINE = join(here, "baseline");
const OUTPUT = join(here, "output");
const update = process.argv.includes("--update");
const THRESHOLD = Number(process.env.VISUAL_THRESHOLD || 0.005);

/** Scènes : page, langue, taille d'écran. Les tiers (X, Facebook, carte) sont bloqués et les animations figées. */
const SCENES = [
  ...["/", "/parti", "/president", "/actualites", "/cadres", "/diaspora", "/contact", "/adherer"].flatMap((path) => [
    { name: `${path === "/" ? "accueil" : path.slice(1)}-fr-desktop`, path, locale: "fr", width: 1440, height: 900 },
    { name: `${path === "/" ? "accueil" : path.slice(1)}-fr-mobile`, path, locale: "fr", width: 390, height: 844 },
  ]),
  { name: "cadres-federation-fr-desktop", path: "/cadres#niveau=provincial&province=Kinshasa%20%E2%80%93%20Funa", locale: "fr", width: 1440, height: 1400 },
  { name: "cadres-federation-fr-mobile", path: "/cadres#niveau=provincial&province=Kinshasa%20%E2%80%93%20Funa", locale: "fr", width: 390, height: 1600 },
  { name: "accueil-ln-desktop", path: "/", locale: "ln", width: 1440, height: 900 },
  { name: "accueil-sw-mobile", path: "/", locale: "sw", width: 390, height: 844 },
];

const FREEZE = `(() => {
  const s = document.createElement("style");
  s.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} .reveal{opacity:1!important;transform:none!important} .chyron-track{transform:none!important} .social-embed iframe,.twitter-timeline{visibility:hidden!important}";
  document.head.appendChild(s);
  window.scrollTo(0, 0);
  return true;
})()`;

mkdirSync(BASELINE, { recursive: true });
mkdirSync(OUTPUT, { recursive: true });
const page = await launch();
await page.blockUrls(["*platform.twitter.com*", "*syndication.twitter.com*", "*facebook.com*", "*facebook.net*", "*openstreetmap.org*"]);
let failed = 0;
let created = 0;
try {
  for (const s of SCENES) {
    await page.setViewport(s.width, s.height);
    await page.goto(url(s.locale, s.path), { settle: 600 });
    await page.evaluate(FREEZE);
    await new Promise((r) => setTimeout(r, 2000)); // fin des compteurs animés
    const png = await page.screenshot({ width: s.width, height: s.height });
    const ref = join(BASELINE, `${s.name}.png`);
    if (update || !existsSync(ref)) {
      writeFileSync(ref, png);
      created++;
      console.log(`  ref  ${s.name}`);
      continue;
    }
    const a = PNG.sync.read(readFileSync(ref));
    const b = PNG.sync.read(png);
    if (a.width !== b.width || a.height !== b.height) {
      failed++;
      console.log(`  FAIL ${s.name} : taille ${b.width}x${b.height} au lieu de ${a.width}x${a.height}`);
      continue;
    }
    const diff = new PNG({ width: a.width, height: a.height });
    const differing = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
    const ratio = differing / (a.width * a.height);
    if (ratio > THRESHOLD) {
      failed++;
      writeFileSync(join(OUTPUT, `${s.name}.png`), png);
      writeFileSync(join(OUTPUT, `${s.name}-diff.png`), PNG.sync.write(diff));
      console.log(`  FAIL ${s.name} : ${(ratio * 100).toFixed(2)} % de pixels différents (voir tests/visual/output)`);
    } else {
      console.log(`  ok   ${s.name} (${(ratio * 100).toFixed(2)} %)`);
    }
  }
} finally {
  await page.close();
}
console.log(created ? `\n${created} référence(s) créée(s) dans tests/visual/baseline.` : failed ? `\n${failed} scène(s) différente(s).` : "\nToutes les scènes correspondent aux références.");
process.exit(failed ? 1 : 0);
