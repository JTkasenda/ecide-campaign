// Tests de bout en bout contre un site en marche (E2E_BASE_URL, par défaut http://localhost:3002)
// et son API (E2E_API_URL). Lancement : npm run test:e2e [-- --only=pages,layout]
import { BASE_URL } from "../browser.mjs";

const only = (process.argv.find((a) => a.startsWith("--only=")) || "").replace("--only=", "").split(",").filter(Boolean);
const suites = ["pages", "security", "newsletter", "cadres", "admin", "articles", "layout"].filter((s) => !only.length || only.includes(s));

try {
  const r = await fetch(BASE_URL, { redirect: "manual" });
  if (r.status >= 500) throw new Error(String(r.status));
} catch (e) {
  console.error(`Site injoignable sur ${BASE_URL} (${e.message}) : lancer npm run dev, ou définir E2E_BASE_URL.`);
  process.exit(2);
}

let failed = 0;
for (const s of suites) {
  const mod = await import(`./${s}.spec.mjs`);
  failed += await mod.run();
}
console.log(failed ? `\n${failed} échec(s)` : "\nTous les tests de bout en bout réussissent.");
process.exit(failed ? 1 : 0);
