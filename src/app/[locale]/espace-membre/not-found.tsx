"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/locales";

/** Adresse inconnue dans l'espace membre (document introuvable…) : page 404 dans le cadre de l'application. */
export default function MemberNotFound() {
  const { t, locale } = useI18n();
  const l = isLocale(locale) ? locale : "fr";
  return (
    <div className="member-box m-card m-state !py-14">
      <i className="fa-regular fa-compass" aria-hidden="true"></i>
      <h1>{t("Page introuvable")}</h1>
      <p className="max-w-md">{t("La page que vous cherchez n'existe pas ou a été déplacée. Vérifiez l'adresse ou revenez à l'accueil.")}</p>
      <Link href={localePath(l, "/espace-membre")} className="btn btn--primary mt-2">{t("Espace membre")}</Link>
    </div>
  );
}
