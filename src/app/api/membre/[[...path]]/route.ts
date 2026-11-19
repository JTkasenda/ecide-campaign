import { NextResponse, type NextRequest } from "next/server";
import { API_URL } from "@/lib/api";

/**
 * Relais de l'espace membre vers l'API Laravel (/api/v1/membre/…). La session du membre vit dans
 * un cookie protégé (httpOnly) de ce site : le navigateur ne voit jamais le jeton, que ce relais
 * ajoute à chaque appel (Authorization: Bearer). La connexion pose le cookie, la déconnexion ou
 * une session expirée l'effacent.
 */
const COOKIE = "ecide_membre";
const MAX_AGE = 60 * 60 * 24 * 30;
/**
 * Chemins relayés : ceux de l'espace membre seulement (/api/v1/membre/…), en lettres, chiffres et
 * tirets ; rien d'autre de l'API n'est atteignable par ce relais.
 */
const ALLOWED = /^(|[a-z][a-z0-9-]{1,30}(\/[A-Za-z0-9-]{1,40}){0,3})$/;

type Ctx = { params: Promise<{ path?: string[] }> };

async function relay(request: NextRequest, ctx: Ctx): Promise<Response> {
  const path = ((await ctx.params).path || []).join("/");
  if (!ALLOWED.test(path)) return NextResponse.json({ ok: false, message: "Introuvable." }, { status: 404 });

  const token = request.cookies.get(COOKIE)?.value;
  const lang = request.nextUrl.searchParams.get("lang") || "fr";
  const headers: Record<string, string> = { Accept: request.headers.get("accept") || "application/json", "Accept-Language": lang };
  const type = request.headers.get("content-type");
  if (type) headers["Content-Type"] = type;
  if (token) headers.Authorization = `Bearer ${token}`;
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
  if (ip) headers["X-Forwarded-For"] = ip;
  const ua = request.headers.get("user-agent");
  if (ua) headers["User-Agent"] = ua;

  const hasBody = !["GET", "HEAD"].includes(request.method);
  let upstream: Response;
  try {
    const query = new URLSearchParams(request.nextUrl.searchParams);
    query.set("lang", lang);
    upstream = await fetch(`${API_URL}/api/v1/membre${path ? `/${path}` : ""}?${query.toString()}`, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Service indisponible. Réessayez dans un instant." }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "";
  // Images et documents (carte, photo, pièce) : relayés tels quels, jamais mis en cache
  if (!contentType.includes("application/json")) {
    return new NextResponse(upstream.body, { status: upstream.status, headers: { "Content-Type": contentType || "application/octet-stream", "Cache-Control": "private, no-store" } });
  }

  const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
  const secure = request.nextUrl.protocol === "https:";
  if (path === "connexion" && upstream.ok && typeof data.token === "string") {
    const res = NextResponse.json({ ...data, token: undefined }, { status: upstream.status });
    res.cookies.set(COOKIE, data.token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: MAX_AGE });
    return res;
  }
  const res = NextResponse.json(data, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  if (path === "deconnexion" || upstream.status === 401) res.cookies.delete(COOKIE);
  return res;
}

export const GET = relay;
export const POST = relay;
export const PUT = relay;
// Retrait d'une liste de présence jointe à un rapport d'activité
export const DELETE = relay;
