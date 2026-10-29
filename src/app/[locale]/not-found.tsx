"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/locales";

export default function NotFound() {
  const { t, locale } = useI18n();
  const l = isLocale(locale) ? locale : "fr";
  return (
    <main id="main" className="flex-grow">
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <p className="text-8xl font-black text-ecideBlue">404</p>
          <h1 className="text-3xl md:text-4xl font-black text-ecideDarkBlue">{t("Page introuvable")}</h1>
          <p className="text-lg text-gray-600">{t("La page que vous cherchez n'existe pas ou a été déplacée. Vérifiez l'adresse ou revenez à l'accueil.")}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href={localePath(l, "/")} className="bg-ecideBlue text-white font-bold px-8 py-4 hover:bg-ecideDarkBlue transition"><i className="fa-solid fa-house mr-2" aria-hidden="true"></i>{t("Retour à l'accueil")}</Link>
            <Link href={localePath(l, "/actualites")} className="border-2 border-ecideBlue text-ecideBlue font-bold px-8 py-4 hover:bg-ecideBlue hover:text-white transition">{t("Voir les actualités")}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
