// Rédaction et publication d'une actualité : éditeur de l'administration → API → site public.
// Identifiants : E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (par défaut le compte de la base de démonstration).
import { API_URL, assert, createRunner, launch } from "../browser.mjs";
import { url } from "./pages.spec.mjs";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "sg@ecide-rdc.org";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "ecide2026";
const TITLE = "Test E2E : communiqué de vérification";
const SLUG = "test-e2e-communique-de-verification";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const has = (txt, needle) => txt.toLowerCase().includes(needle.toLowerCase());

const { test, run } = createRunner("Actualités : rédaction, publication, brouillon, suppression");
export { run };

const setField = (page, name, value) =>
  page.evaluate(`(() => { const el = document.querySelector('#edForm [name=${JSON.stringify(name)}]'); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
const setRichText = (page, name, html) =>
  page.evaluate(`(() => { const el = document.querySelector('[data-richtext=${JSON.stringify(name)}]'); el.innerHTML = ${JSON.stringify(html)}; el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
/** Attend la fin de l'enregistrement sur le serveur (état affiché par l'éditeur). */
async function waitSaved(page, timeout = 40000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const txt = await page.text("#edStatus");
    if (/Enregistré sur le serveur/.test(txt)) return txt;
    if (/Non enregistré/.test(txt)) throw new Error("l'éditeur signale un échec d'enregistrement");
    await sleep(300);
  }
  throw new Error("enregistrement non confirmé : " + (await page.text("#edStatus")));
}
async function apiArticle() {
  const r = await fetch(`${API_URL}/api/v1/news/${SLUG}`, { headers: { Accept: "application/json" } });
  return r.status === 200 ? await r.json() : null;
}
async function waitApi(predicate, timeout = 20000) {
  const start = Date.now();
  let a = null;
  while (Date.now() - start < timeout) {
    a = await apiArticle();
    if (predicate(a)) return a;
    await sleep(1000);
  }
  return a;
}
async function waitSite(page, expected, timeout = 30000) {
  const start = Date.now();
  let txt = "";
  while (Date.now() - start < timeout) {
    await page.goto(url("fr", `/actualites/${SLUG}`), { settle: 500 });
    txt = await page.text("main");
    if (has(txt, expected)) return txt;
    await sleep(2000);
  }
  return txt;
}

/** Les scripts de l'administration se chargent en fin de page : attendre le magasin avant de l'utiliser. */
async function waitReady(page, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.evaluate(`typeof AdminStore !== "undefined" && typeof Admin !== "undefined"`)) return;
    await sleep(200);
  }
  throw new Error("scripts de l'administration non chargés");
}

async function login(page) {
  await page.goto(`${API_URL}/admin`);
  await page.evaluate(`(() => { document.getElementById("loginUser").value = ${JSON.stringify(ADMIN_EMAIL)}; document.getElementById("loginPass").value = ${JSON.stringify(ADMIN_PASSWORD)}; document.getElementById("loginPass").form.submit(); return true; })()`);
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    if (!(await page.evaluate("location.pathname")).endsWith("/admin")) break;
  }
  assert(!(await page.evaluate("location.pathname")).endsWith("/admin"), "connexion refusée : vérifier E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD");
}

async function cleanup(page) {
  await page.goto(`${API_URL}/admin/actualites`);
  await waitReady(page);
  await page.evaluate(`(() => { AdminStore.list("actualites").filter((a) => a.slug.startsWith(${JSON.stringify(SLUG)})).forEach((a) => AdminStore.remove("actualites", a.id)); return AdminStore.flush().then(() => true); })()`);
  await waitApi((a) => a === null, 20000);
}

test("un rédacteur rédige, publie, dépublie puis supprime une actualité ; le site suit chaque étape", async () => {
  const page = await launch({ width: 1440, height: 1000 });
  try {
    await login(page);
    await cleanup(page); // reste d'une exécution interrompue

    // 1. Rédaction et publication
    await page.goto(`${API_URL}/admin/actualite-editer`);
    await page.waitForText("#edForm", "Titre");
    await setField(page, "titre", TITLE);
    assert((await page.evaluate(`document.querySelector('#edForm [name="slug"]').value`)) === SLUG, "adresse non générée depuis le titre");
    await setField(page, "resume", "Résumé de vérification automatique.");
    await setRichText(page, "contenu", "<p>Premier paragraphe.</p><p>Second paragraphe avec <strong>gras</strong>.</p><script>alert(1)</script>");
    await setField(page, "statut", "publie");
    await page.evaluate(`(() => { document.querySelector('#edForm button[type=submit]').click(); return true; })()`);
    const status = await waitSaved(page);
    assert(/Enregistré sur le serveur/.test(status), "enregistrement non confirmé");
    assert((await page.evaluate("location.search")).includes("id="), "la page n'est pas passée en mode modification");
    assert(has(await page.text("h1"), "Modifier une actualité"), "titre de page non mis à jour");

    // 2. L'API la sert, avec le contenu nettoyé
    let a = await waitApi((x) => x !== null);
    assert(a && a.article.titre === TITLE, "actualité absente de l'API après publication");
    assert(a.article.contenu.includes("<strong>gras</strong>") && !a.article.contenu.includes("<script"), "contenu non nettoyé : " + a.article.contenu);
    assert(a.article.categorie.key === "communique" && a.article.auteur === "Communication ECiDé", "catégorie ou signataire incorrects");

    // 3. Le site public l'affiche (régénération demandée par l'administration à chaque enregistrement)
    const site = await waitSite(page, TITLE);
    assert(has(site, TITLE) && has(site, "Second paragraphe avec gras"), "article absent du site : " + site.slice(0, 200));
    await page.goto(url("fr", "/actualites"), { settle: 800 });
    assert(has(await page.text("main"), TITLE), "actualité absente de la liste des actualités");

    // 4. Rouverte depuis la liste de l'administration, elle est bien enregistrée ; « Voir sur le site » pointe vers l'article
    await page.goto(`${API_URL}/admin/actualites`);
    await waitReady(page);
    const id = await page.evaluate(`(AdminStore.list("actualites").find((x) => x.slug === ${JSON.stringify(SLUG)}) || {}).id || ""`);
    assert(id, "actualité absente de l'administration après rechargement");
    await page.goto(`${API_URL}/admin/actualite-editer?id=${id}`);
    await page.waitForText("#edForm", "Titre");
    assert((await page.evaluate(`document.querySelector('#edForm [name="titre"]').value`)) === TITLE, "titre non rechargé");
    assert((await page.evaluate(`document.getElementById("edPreview").href`)).endsWith(`/actualites/${SLUG}`), "lien « Voir sur le site » incorrect");

    // 5. Repassée en brouillon : l'API et le site ne la servent plus
    await page.evaluate(`(() => { document.getElementById("edDraft").click(); return true; })()`);
    await waitSaved(page);
    a = await waitApi((x) => x === null);
    assert(a === null, "le brouillon reste servi par l'API");
    const gone = await waitSite(page, "introuvable", 30000);
    assert(!has(gone, "Second paragraphe avec gras"), "le brouillon reste visible sur le site");

    // 6. Une seconde actualité au même titre reçoit une adresse distincte
    await page.goto(`${API_URL}/admin/actualite-editer`);
    await page.waitForText("#edForm", "Titre");
    await setField(page, "titre", TITLE);
    await setField(page, "resume", "Doublon.");
    await page.evaluate(`(() => { document.querySelector('#edForm button[type=submit]').click(); return true; })()`);
    await waitSaved(page);
    assert((await page.evaluate(`document.querySelector('#edForm [name="slug"]').value`)) === `${SLUG}-2`, "adresse en doublon");

    // 7. Suppression : disparaît de l'administration et de l'API
    await page.goto(`${API_URL}/admin/actualite-editer?id=${id}`);
    await page.waitForText("#edForm", "Titre");
    await page.evaluate(`(() => { Admin.confirm = () => Promise.resolve(true); document.getElementById("edDelete").click(); return true; })()`);
    for (let i = 0; i < 80 && !(await page.evaluate("location.pathname")).endsWith("/admin/actualites"); i++) await sleep(500);
    assert((await page.evaluate("location.pathname")).endsWith("/admin/actualites"), "pas de retour à la liste après suppression");
    await waitReady(page);
    assert(!(await page.evaluate(`AdminStore.list("actualites").some((x) => x.id === ${JSON.stringify(id)})`)), "actualité toujours présente après suppression");
  } finally {
    try {
      await cleanup(page);
    } catch {}
    await page.close();
  }
});
