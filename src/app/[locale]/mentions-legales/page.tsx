import type { Metadata } from "next";
import Link from "next/link";
import { getMentions } from "@/lib/api";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getMentions(locale)]);
  return pageMetadata(locale, "/mentions-legales", { title: t("Mentions légales"), description: t("Mentions légales du site :nom.", { nom: data.params.nom || "ECiDé" }) });
}

export default async function MentionsPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getMentions(locale), getT(locale)]);
  const p = data.params;

  return (
    <main id="main" className="flex-grow">
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="space-y-3">
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Informations légales")}</span>
            <h1 className="text-4xl md:text-5xl font-black text-ecideDarkBlue">{t("Mentions légales")}</h1>
          </header>
          <div className="bg-white border border-gray-200 p-8 lg:p-10 space-y-6 text-gray-700 text-lg leading-relaxed">
            {data.paragraphs.length > 0 ? (
              data.paragraphs.map((para, i) => (
                <p key={i} className="whitespace-pre-line">{para}</p>
              ))
            ) : (
              <>
                <p>
                  <strong className="text-ecideDarkBlue">{t("Éditeur :")}</strong> {p.nomLong || ""} ({p.nom || "ECiDé"}){p.adresse ? `, ${p.adresse}` : ""}.
                </p>
                {p.email && (
                  <p>
                    <strong className="text-ecideDarkBlue">{t("Contact :")}</strong> <a href={`mailto:${p.email}`} className="text-ecideBlue font-bold">{p.email}</a>{p.telephone ? ` · ${p.telephone}` : ""}.
                  </p>
                )}
                <p>
                  <strong className="text-ecideDarkBlue">{t("Hébergement et données personnelles :")}</strong> {t("à compléter dans l'administration (Paramètres › Navigation & pied de page › Page « Mentions légales »).")}
                </p>
              </>
            )}
          </div>
          <Link href={localePath(locale, "/")} className="inline-flex items-center gap-2 text-ecideBlue font-bold hover:text-ecideDarkBlue"><i className="fa-solid fa-arrow-left text-sm" aria-hidden="true"></i> {t("Retour à l'accueil")}</Link>
        </div>
      </section>
    </main>
  );
}
