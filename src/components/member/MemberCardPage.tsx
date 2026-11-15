"use client";

import { useI18n } from "@/lib/i18n";
import MemberCard from "./MemberCard";
import { useMember } from "./MemberContext";
import { MemberCardBox, MemberPageHeader, Notice } from "./ui";

/** Page « Ma carte » : la carte numérique et ses informations. */
export default function MemberCardPage() {
  const { t, locale } = useI18n();
  const { data } = useMember();
  const m = data.membre;
  const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString(locale) : "—");
  return (
    <div className="space-y-6">
      <MemberPageHeader title={t("Ma carte de membre")} subtitle={t("Présentez-la à l'entrée des réunions et des congrès : son QR code permet de la vérifier.")} />
      {m.statut === "suspendu" && <Notice tone="error"><strong>{t("Votre adhésion est suspendue.")}</strong> {m.motif ? `${t("Motif")} : ${m.motif}` : ""}</Notice>}
      <MemberCardBox className="space-y-6">
        <MemberCard membre={m} />
      </MemberCardBox>
      {m.carte && (
        <MemberCardBox>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              [t("N° de carte"), m.carte.numero],
              [t("Catégorie"), m.categorieLibelle],
              [t("Délivrée le"), date(m.carte.delivreeLe)],
              [t("Valable jusqu'au"), date(m.carte.expireLe)],
              [t("Cellule / section"), m.section],
              [t("Résidence"), m.residence],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                <dt className="text-gray-500">{k}</dt>
                <dd className="font-semibold text-right text-gray-900">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </MemberCardBox>
      )}
    </div>
  );
}
