import { API_URL, BASE_URL, assert, createRunner } from "../browser.mjs";

const { test, run } = createRunner("Pages : réponses, langue, 404 et redirections");
export { run };

export const LOCALES = ["fr", "en", "ln", "sw", "tsh", "kik"];
export const PATHS = ["/", "/parti", "/organigramme", "/charte-valeurs", "/projet-societe", "/president", "/president/biographie", "/actualites", "/cadres", "/diaspora", "/contact", "/adherer", "/mentions-legales", "/newsletter/desinscription"];
export const url = (locale, path) => BASE_URL + (locale === "fr" ? "" : `/${locale}`) + (path === "/" ? "" : path);

/** Premier article publié (API), pour tester la page article. */
export async function articleSlug() {
  const d = await (await fetch(`${API_URL}/api/v1/pages/actualites?lang=fr`)).json();
  return (d.featured || d.news?.[0] || {}).slug || null;
}

for (const locale of LOCALES) {
  test(`toutes les pages répondent en ${locale} avec la bonne langue`, async () => {
    for (const path of PATHS) {
      const r = await fetch(url(locale, path));
      assert(r.status === 200, `${path} → ${r.status}`);
      const html = await r.text();
      assert(html.includes(`<html lang="${locale}"`), `${path} : lang="${locale}" attendu`);
      assert(html.includes('id="main"'), `${path} : pas de <main id="main">`);
      assert(!html.includes('href="javascript:'), `${path} : lien javascript:`);
    }
  });
}

test("la page d'un article s'affiche en français et en anglais", async () => {
  const slug = await articleSlug();
  assert(slug, "aucun article publié dans l'API");
  for (const locale of ["fr", "en"]) {
    const r = await fetch(url(locale, `/actualites/${slug}`));
    assert(r.status === 200, `${locale} → ${r.status}`);
    const html = await r.text();
    assert(html.includes('type="application/ld+json"') === false || !html.includes("</script><script"), "script JSON-LD mal fermé");
    assert(html.includes("prose-lg"), "corps de l'article absent");
  }
});

test("une adresse inconnue renvoie 404 avec la page traduite", async () => {
  const r = await fetch(`${BASE_URL}/en/nexiste-pas`);
  assert(r.status === 404, `statut ${r.status}`);
  const html = await r.text();
  assert(html.includes("Page not found") || html.includes("Page introuvable"), "page 404 non rendue");
});

test("les anciennes adresses du direct redirigent vers les actualités", async () => {
  for (const [from, to] of [["/direct", "/actualites"], ["/direct/studio", "/actualites"], ["/en/direct", "/en/actualites"]]) {
    const r = await fetch(BASE_URL + from, { redirect: "manual" });
    assert([301, 302, 307, 308].includes(r.status), `${from} → ${r.status} (le serveur de développement doit être relancé après une modification de next.config.ts)`);
    const loc = r.headers.get("location") || "";
    assert(loc.endsWith(to), `${from} → ${loc}`);
  }
});

test("le point d'entrée de régénération refuse un jeton absent ou faux", async () => {
  for (const body of [{}, { secret: "faux" }]) {
    const r = await fetch(`${BASE_URL}/api/revalidate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    assert(r.status === 401, `statut ${r.status}`);
  }
});

/** Balises meta d'une page (rendu serveur), par propriété ou nom. */
async function metaTags(path) {
  const html = await (await fetch(url("fr", path))).text();
  const tags = {};
  for (const m of html.matchAll(/<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"/g)) tags[m[1]] = tags[m[1]] || m[2].replace(/&amp;/g, "&");
  return tags;
}

test("les partages sur X, Facebook et WhatsApp ont un titre, une description et une image absolue accessible", async () => {
  const slug = await articleSlug();
  for (const [path, type] of [["/", "website"], [`/actualites/${slug}`, "article"]]) {
    const t = await metaTags(path);
    assert(t["og:title"] && t["og:description"], `${path} : og:title ou og:description absent`);
    assert(t["og:type"] === type, `${path} : og:type ${t["og:type"]}`);
    assert(/^https?:\/\//.test(t["og:image"] || ""), `${path} : og:image non absolue : ${t["og:image"]}`);
    assert(t["twitter:card"] === "summary_large_image" && t["twitter:image"] === t["og:image"], `${path} : carte X incomplète`);
    assert((t["og:url"] || "").startsWith("http"), `${path} : og:url absente`);
    // L'adresse du site (NEXT_PUBLIC_SITE_URL) est fixée à la construction : on la ramène au serveur testé
    const img = await fetch(t["og:image"].replace(/^https?:\/\/[^/]+(?=\/assets\/)/, BASE_URL));
    assert(img.ok && /^image\//.test(img.headers.get("content-type") || ""), `${path} : image de partage injoignable (${img.status} ${img.headers.get("content-type")})`);
    if (type === "article") assert(t["article:published_time"] && t["article:author"], "article : date ou auteur de partage absents");
  }
});

