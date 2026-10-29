// Pilotage de Chrome sans interface via le protocole DevTools, sans dépendance.
// Utilisé par les tests de bout en bout (tests/e2e) et visuels (tests/visual).
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const BASE_URL = (process.env.E2E_BASE_URL || "http://localhost:3002").replace(/\/$/, "");
export const API_URL = (process.env.E2E_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

export function chromePath() {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new Error("Chrome introuvable : définir CHROME_PATH");
  return found;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ouvre un navigateur et renvoie une page pilotable. */
export async function launch({ width = 1280, height = 900 } = {}) {
  const port = 9600 + Math.floor(Math.random() * 300);
  const profile = mkdtempSync(join(tmpdir(), "ecide-e2e-"));
  const proc = spawn(chromePath(), ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--disable-gpu", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 100 && !targets; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    } catch {
      await sleep(200);
    }
  }
  if (!targets) throw new Error("Chrome ne répond pas");
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  let loads = 0;
  const consoleErrors = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id) {
      const p = pending.get(d.id);
      pending.delete(d.id);
      d.error ? p.reject(new Error(d.error.message || JSON.stringify(d.error))) : p.resolve(d.result);
    } else if (d.method === "Page.loadEventFired") loads++;
    else if (d.method === "Runtime.exceptionThrown") consoleErrors.push(d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text || "exception");
    else if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") consoleErrors.push(d.params.args.map((a) => a.value || a.description || "").join(" "));
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");

  const page = {
    consoleErrors,
    async setViewport(w, h) {
      await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
    },
    async blockUrls(patterns) {
      await send("Network.setBlockedURLs", { urls: patterns });
    },
    async goto(url, { settle = 400 } = {}) {
      // Même document, seule l'ancre change : pas d'événement de chargement, on attend juste le rendu
      const current = await this.evaluate("location.href").catch(() => "");
      if (current && current.split("#")[0] === url.split("#")[0] && url.includes("#")) {
        await this.evaluate(`location.hash = ${JSON.stringify(url.slice(url.indexOf("#")))}; true`);
        await sleep(settle);
        return;
      }
      const target = loads + 1;
      await send("Page.navigate", { url });
      for (let i = 0; i < 600 && loads < target; i++) await sleep(50);
      if (loads < target) throw new Error(`Chargement trop long : ${url}`);
      await this.evaluate("document.fonts ? document.fonts.ready.then(() => true) : true");
      await sleep(settle);
    },
    async evaluate(expression) {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async text(selector = "body") {
      return this.evaluate(`(document.querySelector(${JSON.stringify(selector)})?.innerText || "").replace(/\\s+/g, " ").trim()`);
    },
    /** Attend qu'un texte apparaisse dans un élément (appels réseau après hydratation) ; renvoie le texte courant. */
    async waitForText(selector, expected, timeout = 10000) {
      const start = Date.now();
      let txt = "";
      while (Date.now() - start < timeout) {
        txt = await this.text(selector);
        if (txt.toLowerCase().includes(expected.toLowerCase())) return txt;
        await sleep(250);
      }
      return txt;
    },
    async screenshot({ x = 0, y = 0, width, height, full = false } = {}) {
      const r = await send("Page.captureScreenshot", { format: "png", clip: width && height ? { x, y, width, height, scale: 1 } : undefined, captureBeyondViewport: full });
      return Buffer.from(r.data, "base64");
    },
    async click(selector) {
      return this.evaluate(`(() => { const el = document.querySelector(${JSON.parse(JSON.stringify(JSON.stringify(selector)))}); if (!el) return false; el.click(); return true; })()`);
    },
    async close() {
      try {
        ws.close();
      } catch {}
      proc.kill();
      await sleep(200);
      try {
        rmSync(profile, { recursive: true, force: true });
      } catch {}
    },
  };
  await page.setViewport(width, height);
  return page;
}

/** Mini-cadre de test : test("nom", fn) puis run(). */
export function createRunner(label) {
  const tests = [];
  const test = (name, fn) => tests.push({ name, fn });
  const run = async () => {
    let failed = 0;
    console.log(`\n${label}`);
    for (const t of tests) {
      const start = Date.now();
      try {
        await t.fn();
        console.log(`  ok   ${t.name} (${Date.now() - start} ms)`);
      } catch (e) {
        failed++;
        console.log(`  FAIL ${t.name}\n       ${String(e.message || e).split("\n").join("\n       ")}`);
      }
    }
    console.log(`  ${tests.length - failed}/${tests.length} réussi(s)`);
    return failed;
  };
  return { test, run };
}

export function assert(condition, message) {
  if (!condition) throw new Error(message || "assertion");
}
