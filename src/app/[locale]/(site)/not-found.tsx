"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/locales";

export default function NotFound() {
  const { t, locale } = useI18n();
  const l = isLocale(locale) ? locale : "fr";
  return (
    <main id="main" className="flex-grow">
      <section className="py-32 px-6 bg-ecideDarkBlue text-white diag flex-grow">
        <div className="max-w-2xl mx-auto text-center space-y-10">
          <p className="font-display text-9xl text-ecideYellow leading-none">404</p>
          <h1 className="text-4xl md:text-5xl">{t("Page introuvable")}</h1>
          <p className="text-lg text-blue-100">{t("La page que vous cherchez n'existe pas ou a été déplacée. Vérifiez l'adresse ou revenez à l'accueil.")}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href={localePath(l, "/")} className="btn btn--primary btn--lg"><i className="fa-solid fa-house text-sm" aria-hidden="true"></i>{t("Retour à l'accueil")}</Link>
            <Link href={localePath(l, "/actualites")} className="btn btn--outline-white btn--lg">{t("Voir les actualités")}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
