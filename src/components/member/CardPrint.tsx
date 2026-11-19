"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import { memberApi, memberFile, type MemberData } from "@/lib/member";

/**
 * Impression de la carte : recto et verso au format réel (85,6 × 54 mm), à découper ou à
 * enregistrer en PDF depuis la fenêtre d'impression du navigateur.
 */
export default function CardPrint() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<MemberData | null | false>(null);

  useEffect(() => {
    memberApi("", locale).then((r) => setData(r.ok && r.data.membre.carte ? r.data : false));
  }, [locale]);

  if (data === null) return <p className="text-center text-gray-500 py-20"><i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>{t("Chargement…")}</p>;
  if (data === false) {
    return (
      <div className="member-box m-card max-w-md mx-auto bg-white border border-gray-200 p-8 text-center space-y-4">
        <p className="text-gray-700">{t("Connectez-vous à votre espace membre pour imprimer votre carte.")}</p>
        <Link href={localePath(locale as Locale, "/espace-membre")} className="btn btn--primary">{t("Espace membre")}</Link>
      </div>
    );
  }
  const v = `${data.membre.carte?.numero}-${data.membre.statut}`;
  return (
    <div className="card-print space-y-6 py-2">
      <div className="print:hidden member-box m-card max-w-2xl mx-auto bg-white border border-gray-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-gray-600">{t("Format carte bancaire (85,6 × 54 mm). Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF » pour garder une copie.")}</p>
        <button type="button" onClick={() => window.print()} className="btn btn--primary"><i className="fa-solid fa-print" aria-hidden="true"></i>{t("Imprimer ou enregistrer en PDF")}</button>
      </div>
      <div className="flex flex-col items-center gap-6 print:gap-[8mm]">
        {(["recto", "verso"] as const).map((face) => (
          <img key={face} src={memberFile(`carte/${face}`, v)} alt={face === "recto" ? t("Carte de membre, recto") : t("Carte de membre, verso")} className="card-print-face w-[85.6mm] h-[54mm] rounded-[3mm] shadow-xl print:shadow-none outline outline-1 outline-gray-300" />
        ))}
      </div>
    </div>
  );
}
