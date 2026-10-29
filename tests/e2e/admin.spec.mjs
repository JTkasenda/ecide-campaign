// Administration : un administrateur crée une structure puis lui ajoute un responsable.
// Identifiants : E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (par défaut le compte de la base de démonstration).
import { API_URL, assert, createRunner, launch } from "../browser.mjs";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "sg@ecide-rdc.org";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "ecide2026";
const SECTION = "Section de Boma-Test";
const LEADER = "Responsable Test E2E";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Les pastilles sont en capitales par CSS : comparaison sans tenir compte de la casse. */
const has = (txt, needle) => txt.toLowerCase().includes(needle.toLowerCase());

const { test, run } = createRunner("Administration : structures et responsables");
export { run };

/** Renseigne un champ du tiroir et déclenche les écouteurs (input + change). */
const fill = (page, name, value) =>
  page.evaluate(`(() => { const el = document.querySelector('.drawer [name=${JSON.stringify(name)}]'); if (!el) return false; el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
const drawerValue = (page, name) => page.evaluate(`document.querySelector('.drawer [name=${JSON.stringify(name)}]')?.value ?? null`);
const submitDrawer = (page) => page.evaluate(`(() => { document.querySelector('.drawer form').requestSubmit(); return true; })()`);
const searchTable = (page, table, q) =>
  page.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(table + " [data-search]")}); el.value = ${JSON.stringify(q)}; el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
const rowOf = (page, table, needle) =>
  page.evaluate(`(() => { const tr = [...document.querySelectorAll(${JSON.stringify(table + " tr[data-id]")})].find((r) => r.innerText.includes(${JSON.stringify(needle)})); return tr ? tr.innerText.replace(/\\s+/g, " ") : ""; })()`);

async function login(page) {
  await page.goto(`${API_URL}/admin`);
  await page.evaluate(`(() => { document.getElementById("loginUser").value = ${JSON.stringify(ADMIN_EMAIL)}; document.getElementById("loginPass").value = ${JSON.stringify(ADMIN_PASSWORD)}; document.getElementById("loginPass").form.submit(); return true; })()`);
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    if (!(await page.evaluate("location.pathname")).endsWith("/admin")) break;
  }
  const where = await page.evaluate("location.pathname");
  assert(!where.endsWith("/admin"), "connexion refusée : vérifier E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD");
}

/** Interroge l'API publique jusqu'à ce que la condition soit vraie (enregistrement différé côté administration). */
async function waitForApi(predicate, timeout = 30000) {
  const start = Date.now();
  let data = null;
  while (Date.now() - start < timeout) {
    data = await (await fetch(`${API_URL}/api/v1/pages/cadres`, { headers: { Accept: "application/json" } })).json();
    if (predicate(data)) return data;
    await sleep(1000);
  }
  return data;
}

async function cleanup(page) {
  await page.evaluate(`(() => { AdminStore.list("cadres").filter((c) => c.organe === ${JSON.stringify(SECTION)}).forEach((c) => AdminStore.remove("cadres", c.id)); AdminStore.list("contactsStructures").filter((c) => c.organe === ${JSON.stringify(SECTION)}).forEach((c) => AdminStore.remove("contactsStructures", c.id)); return true; })()`);
  await waitForApi((d) => !d.contacts[SECTION] && !d.cadres.some((c) => c.nom === LEADER), 20000);
}

test("un administrateur crée une section, lui ajoute un responsable, et l'API du site les expose", async () => {
  const page = await launch({ width: 1440, height: 1000 });
  try {
    await login(page);
    await page.goto(`${API_URL}/admin/cadres`);
    await page.waitForText("#structuresTable", "Structures du parti");
    await cleanup(page); // reste d'une exécution interrompue

    // 1. Nouvelle structure : le nom et le rattachement sont proposés d'après le niveau et le lieu
    await page.click("#structuresTable [data-add]");
    await fill(page, "type", "section");
    await fill(page, "province", "Kongo-Central");
    await fill(page, "ville", "Boma-Test");
    assert((await page.evaluate(`document.querySelector('.drawer [name="organe"]').placeholder`)) === SECTION, "nom de structure non proposé");
    assert((await drawerValue(page, "via")) === "Secrétariat Provincial Exécutif de Kongo-Central", "rattachement au secrétariat provincial non proposé");
    await submitDrawer(page);
    await sleep(300);
    await searchTable(page, "#structuresTable", "Boma-Test");
    await sleep(500);
    let row = await rowOf(page, "#structuresTable", SECTION);
    assert(row.includes("Section") && row.includes("Kongo-Central") && row.includes("Boma-Test"), "structure absente du tableau : " + row);
    assert(has(row, "Aucun responsable"), "la nouvelle structure devrait être signalée sans responsable : " + row);

    // 2. Responsable ajouté depuis la ligne : fiche pré-remplie avec la structure et son lieu
    await page.evaluate(`(() => { const tr = [...document.querySelectorAll("#structuresTable tr[data-id]")].find((r) => r.innerText.includes(${JSON.stringify(SECTION)})); tr.querySelector('[data-action="addLeader"]').click(); return true; })()`);
    await sleep(200);
    assert((await drawerValue(page, "organe")) === SECTION, "structure non pré-remplie");
    assert((await drawerValue(page, "niveau")) === "section", "niveau non déduit de la structure");
    assert((await drawerValue(page, "province")) === "Kongo-Central" && (await drawerValue(page, "commune")) === "Boma-Test", "lieu non déduit de la structure");
    await fill(page, "fonction", "Chef de section");
    await fill(page, "nom", LEADER);
    await submitDrawer(page);
    await sleep(300);
    row = await rowOf(page, "#structuresTable", SECTION);
    assert(row.includes("Chef de section") && row.includes(LEADER), "le responsable n'apparaît pas sur la ligne de la structure : " + row);

    // 3. Enregistré côté serveur (envoi différé, quelques secondes sous charge) : l'API publique
    //    expose la section, son responsable et sa commune
    const data = await waitForApi((d) => d.contacts[SECTION] && d.cadres.some((c) => c.nom === LEADER));
    const contact = data.contacts[SECTION];
    assert(contact && contact.type === "section" && contact.province === "Kongo-Central" && contact.via === "Secrétariat Provincial Exécutif de Kongo-Central", "structure absente de l'API : " + JSON.stringify(contact));
    const cadre = data.cadres.find((c) => c.nom === LEADER);
    assert(cadre && cadre.organe === SECTION && cadre.niveau === "section" && cadre.commune === "Boma-Test", "responsable absent de l'API : " + JSON.stringify(cadre));
    assert((data.communes["Kongo-Central"] || []).includes("Boma-Test"), "la nouvelle section n'est pas proposée dans la liste des sections");
  } finally {
    try {
      await cleanup(page);
    } catch {}
    await page.close();
  }
});

test("toutes les pages de l'administration se chargent et rendent leurs composants sans erreur de script", async () => {
  const page = await launch({ width: 1440, height: 1000 });
  try {
    await login(page);
    await page.goto(`${API_URL}/admin/dashboard`);
    const links = await page.evaluate(`[...document.querySelectorAll("a[data-admin]")].map((a) => a.getAttribute("href")).filter((h) => h && h.startsWith("/admin/"))`);
    assert(links.length >= 10, "menu de l'administration incomplet : " + links.join(", "));
    const problems = [];
    for (const href of [...new Set([...links, "/admin/actualite-editer"])]) {
      await page.goto(`${API_URL}${href}`, { settle: 600 });
      await page.evaluate(`(() => { window.__errs = []; window.addEventListener("error", (e) => window.__errs.push(e.message)); return true; })()`);
      // Les composants (tableaux, formulaires) sont rendus par le script de chaque page : leur absence signale une erreur
      const ok = await page.evaluate(`(() => { const cards = document.querySelectorAll(".card").length; const widgets = document.querySelectorAll("form, table, [data-add], .stat, input, select, textarea").length; return { cards, widgets, store: typeof AdminStore !== "undefined", title: document.title, text: document.body.innerText.length }; })()`);
      if (!ok.store || ok.cards === 0 || ok.widgets === 0 || ok.text < 200) problems.push(`${href} : ${JSON.stringify(ok)}`);
      const overflow = await page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth");
      if (overflow) problems.push(`${href} : débordement horizontal`);
    }
    assert(problems.length === 0, "pages en défaut : " + problems.join(" | "));
  } finally {
    await page.close();
  }
});

