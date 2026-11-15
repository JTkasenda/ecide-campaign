"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import type { MemberData } from "@/lib/member";
import MembershipWizard from "./MembershipWizard";
import { MemberPanel, Notice } from "./ui";

/**
 * Parcours de la personne qui adhère : demande en cours (étapes), demande transmise (suivi) ou
 * refusée (motif). Une fois la demande validée, MemberShell affiche l'espace du membre.
 */
export default function MembershipFlow({ data, setData, logout }: { data: MemberData; setData: (d: MemberData) => void; logout: () => Promise<void> }) {
  const { t, locale } = useI18n();
  const m = data.membre;

  if (["compte", "brouillon", "complement"].includes(m.statut)) {
    return (
      <>
        <MembershipWizard data={data} setData={setData} />
        <p className="text-center mt-6">
          <button type="button" onClick={logout} className="text-sm font-semibold text-gray-500 hover:text-ecideDarkBlue underline">{t("Se déconnecter")} · {m.telephone || m.email}</button>
        </p>
      </>
    );
  }

  const pending = m.statut === "en_attente";
  return (
    <MemberPanel
      title={pending ? t("Demande transmise") : t("Demande non retenue")}
      subtitle={m.nomComplet}
      narrow
      aside={
        <button type="button" onClick={logout} className="btn btn--outline-white btn--sm shrink-0 hidden sm:inline-flex">
          <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
          {t("Se déconnecter")}
        </button>
      }
    >
      <div className="space-y-6">
        {pending ? (
          <>
            <Notice tone="success" icon="fa-paper-plane">{t("Votre demande est transmise. Le parti vérifie votre dossier : vous serez prévenu(e) dès la validation de votre carte.")}</Notice>
            <ol className="space-y-4">
              {[
                [t("Demande envoyée"), m.soumisLe ? new Date(m.soumisLe).toLocaleDateString(locale) : "", true],
                [t("Vérification de la fiche, des documents et du paiement"), t("En cours"), false],
                [t("Carte de membre délivrée"), t("Dans votre espace, avec son QR code"), false],
              ].map(([label, detail, ok], i) => (
                <li key={i} className="flex gap-4">
                  <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${ok ? "bg-ecideGreen text-white" : i === 1 ? "bg-ecideYellow text-ecideDarkBlue" : "bg-gray-100 text-gray-400"}`}>
                    <i className={`fa-solid ${ok ? "fa-check" : i === 1 ? "fa-hourglass-half" : "fa-id-card"}`} aria-hidden="true"></i>
                  </span>
                  <span>
                    <span className="block font-bold text-gray-900">{label}</span>
                    <span className="block text-sm text-gray-500">{detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <Notice tone="error">
            <strong>{t("Motif")} :</strong> {m.motif}
          </Notice>
        )}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-gray-100 pt-5">
          <dt className="text-gray-500">{t("Catégorie")}</dt>
          <dd className="font-semibold text-right">{m.categorieLibelle}</dd>
          <dt className="text-gray-500">{t("Résidence")}</dt>
          <dd className="font-semibold text-right">{m.residence}</dd>
        </dl>
        {!pending && <Link href={localePath(locale as Locale, "/contact")} className="btn btn--dark w-full">{t("Contacter le parti")}</Link>}
        <p className="sm:hidden text-center">
          <button type="button" onClick={logout} className="text-sm font-semibold text-ecideDarkBlue underline">{t("Se déconnecter")}</button>
        </p>
      </div>
    </MemberPanel>
  );
}
