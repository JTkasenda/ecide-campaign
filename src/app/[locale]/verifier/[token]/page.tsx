import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { isLocale, localePath } from "@/lib/locales";
import { getT } from "@/lib/server";

type Params = { params: Promise<{ locale: string; token: string }> };

interface Verification {
  ok: boolean;
  valide: boolean;
  numero?: string;
  nom?: string;
  demo?: boolean;
}

export const metadata: Metadata = { title: "Vérification de carte", robots: { index: false, follow: false } };

/**
 * Page ouverte par le QR code d'une carte de membre : dit si la carte est valide ou non, avec le nom
 * et le numéro à comparer à la pièce d'identité, rien de plus (ni catégorie, ni lieu, ni motif).
 */
export default async function VerifierPage({ params }: Params) {
  const { locale, token } = await params;
  if (!isLocale(locale) || !/^[A-Za-z0-9]{32,64}$/.test(token)) notFound();
  const t = await getT(locale);
  let v: Verification = { ok: false, valide: false };
  try {
    const res = await fetch(`${API_URL}/api/v1/carte/${token}?lang=${locale}`, { headers: { Accept: "application/json" }, cache: "no-store" });
    v = (await res.json()) as Verification;
  } catch {
    v = { ok: false, valide: false };
  }
  const state = v.ok ? (v.valide ? "valide" : "invalide") : "inconnue";
  const look = {
    valide: ["bg-ecideGreen", "fa-circle-check", t("Carte valide")],
    invalide: ["bg-red-600", "fa-circle-xmark", t("Carte non valide")],
    inconnue: ["bg-red-600", "fa-circle-xmark", t("Carte inconnue")],
  }[state] as [string, string, string];

  return (
    <main id="main" className="flex-grow bg-ecideBlue-50 py-20 px-4">
      <div className="max-w-md mx-auto bg-white shadow-card overflow-hidden">
        <div className={`${look[0]} text-white p-8 text-center space-y-3`}>
          <i className={`fa-solid ${look[1]} text-6xl`} aria-hidden="true"></i>
          <h1 className="text-4xl no-bar">{look[2]}</h1>
        </div>
        {v.ok && (
          <dl className="p-8 space-y-3 text-sm">
            {[
              [t("Membre"), v.nom],
              [t("N° de carte"), v.numero],
            ].map(([k, val]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                <dt className="text-gray-500">{k}</dt>
                <dd className="font-semibold text-right text-gray-900">{val}</dd>
              </div>
            ))}
          </dl>
        )}
        {v.ok && <p className="px-8 pb-2 text-sm text-gray-600">{t("Comparez le nom et la photo de la carte avec la pièce d'identité de la personne.")}</p>}
        {v.demo && <p className="px-8 pb-2 text-xs text-center text-red-600 font-semibold">{t("Démonstration : carte sans valeur.")}</p>}
        <p className="px-8 pb-8 pt-4 text-center">
          <Link href={localePath(locale, "/verifier")} className="arrow-link">{t("Vérifier une autre carte")}</Link>
        </p>
      </div>
    </main>
  );
}
