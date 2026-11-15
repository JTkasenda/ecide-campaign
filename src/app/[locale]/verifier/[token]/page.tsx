import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { API_URL } from "@/lib/api";
import { isLocale } from "@/lib/locales";
import { getT } from "@/lib/server";

type Params = { params: Promise<{ locale: string; token: string }> };

interface Verification {
  ok: boolean;
  valide: boolean;
  etat?: "valide" | "expiree" | "suspendue" | "invalide";
  numero?: string;
  nom?: string;
  categorie?: string;
  rattachement?: string;
  expireLe?: string | null;
  demo?: boolean;
}

export const metadata: Metadata = { title: "Vérification de carte", robots: { index: false, follow: false } };

/**
 * Page ouverte par le QR code d'une carte de membre : dit si la carte est valide, expirée ou
 * suspendue, avec le nom, le numéro et la catégorie seulement (aucune autre donnée personnelle).
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
  const state = v.ok ? v.etat || "invalide" : "inconnue";
  const look = {
    valide: ["bg-ecideGreen", "fa-circle-check", t("Carte valide")],
    expiree: ["bg-ecideYellow-700", "fa-clock", t("Carte expirée")],
    suspendue: ["bg-red-600", "fa-ban", t("Carte suspendue")],
    invalide: ["bg-red-600", "fa-circle-xmark", t("Carte non valide")],
    inconnue: ["bg-red-600", "fa-circle-xmark", t("Carte inconnue")],
  }[state] as [string, string, string];

  return (
    <main id="main" className="flex-grow bg-ecideBlue-50 py-16 px-4">
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
              [t("Catégorie"), v.categorie],
              [t("Rattachement"), v.rattachement],
              [t("Valable jusqu'au"), v.expireLe ? new Date(v.expireLe).toLocaleDateString(locale) : "—"],
            ].map(([k, val]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                <dt className="text-gray-500">{k}</dt>
                <dd className="font-semibold text-right text-gray-900">{val}</dd>
              </div>
            ))}
          </dl>
        )}
        {v.demo && <p className="px-8 pb-6 text-xs text-center text-red-600 font-semibold">{t("Démonstration : carte sans valeur.")}</p>}
      </div>
    </main>
  );
}
