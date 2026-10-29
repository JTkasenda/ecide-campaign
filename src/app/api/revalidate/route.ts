import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CACHE_TAG } from "@/lib/api";

/**
 * Appelé par Laravel après chaque enregistrement de l'administration
 * (REVALIDATE_SECRET partagé) : les pages sont régénérées à la prochaine visite.
 */
/** Comparaison en temps constant : le jeton ne se devine pas caractère par caractère. */
function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const body = (await request.json().catch(() => ({}))) as { secret?: string };
  const given = body.secret || request.headers.get("x-revalidate-secret") || "";
  if (!secret || !sameSecret(given, secret)) {
    return NextResponse.json({ ok: false, message: "Jeton invalide." }, { status: 401 });
  }
  // expire: 0 → le contenu en cache expire tout de suite (et non « périmé mais servi une fois »),
  // pour qu'un enregistrement dans l'administration soit visible dès la visite suivante
  revalidateTag(CACHE_TAG, { expire: 0 });
  return NextResponse.json({ ok: true, revalidated: CACHE_TAG, at: new Date().toISOString() });
}
