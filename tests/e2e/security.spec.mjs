import { API_URL, BASE_URL, assert, createRunner } from "../browser.mjs";

const { test, run } = createRunner("Sécurité : en-têtes et surface publique");
export { run };

test("le site public envoie les en-têtes de sécurité", async () => {
  const r = await fetch(`${BASE_URL}/parti`);
  assert(r.headers.get("x-content-type-options") === "nosniff", "X-Content-Type-Options (relancer le serveur de développement après une modification de next.config.ts)");
  assert(r.headers.get("x-frame-options") === "SAMEORIGIN", "X-Frame-Options");
  assert((r.headers.get("referrer-policy") || "").includes("strict-origin"), "Referrer-Policy");
});

test("l'API envoie les en-têtes de sécurité et n'expose pas de données sensibles", async () => {
  const r = await fetch(`${API_URL}/api/v1/site?lang=fr`);
  assert(r.status === 200, `statut ${r.status}`);
  assert(r.headers.get("x-content-type-options") === "nosniff", "X-Content-Type-Options API");
  const text = await r.text();
  for (const bad of ["password", "MAIL_PASSWORD", "REVALIDATE_SECRET", "APP_KEY"]) assert(!text.includes(bad), `« ${bad} » présent dans /site`);
});

test("l'administration et ses API exigent une connexion", async () => {
  const dash = await fetch(`${API_URL}/admin/dashboard`, { redirect: "manual" });
  assert([301, 302].includes(dash.status), `/admin/dashboard → ${dash.status}`);
  const store = await fetch(`${API_URL}/admin/api/store`, { headers: { Accept: "application/json" } });
  assert([401, 403].includes(store.status), `/admin/api/store → ${store.status}`);
  const urgent = await fetch(`${API_URL}/admin/api/newsletter/messages`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: "{}" });
  assert([401, 403, 419].includes(urgent.status), `/admin/api/newsletter/messages → ${urgent.status}`);
});

test("les formulaires publics valident leurs champs", async () => {
  const r = await fetch(`${API_URL}/api/v1/forms/newsletter?lang=fr`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email: "pas-un-email" }) });
  assert(r.status === 422, `statut ${r.status}`);
  const c = await fetch(`${API_URL}/api/v1/forms/contact?lang=fr`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ nom: "", email: "x", message: "" }) });
  assert(c.status === 422, `contact : statut ${c.status}`);
});
