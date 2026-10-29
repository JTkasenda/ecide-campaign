import type { Metadata } from "next";
import Link from "next/link";
import { getParti } from "@/lib/api";
import { pad2 } from "@/lib/format";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import PageBanner from "@/components/PageBanner";
import PdfDocument, { DocumentButtons } from "@/components/PdfDocument";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getParti(locale)]);
  return pageMetadata(locale, "/projet-societe", { title: t("Projet de société"), description: data.parti.projetIntro || data.parti.intro });
}

/**
 * Projet de société : l'introduction, le PDF publié dans l'administration (aperçu dans la page et
 * téléchargement), puis les axes du projet et l'appel à rejoindre le parti.
 */
export default async function ProjetSocietePage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getParti(locale), getT(locale)]);
  const { parti, projet } = data;
  const projetAxes = data.projetAxes || [];
  return (
    <main id="main" className="flex-grow">
      <PageBanner eyebrow={t("Projet de société")} title={t("Notre projet de société")} text={parti.projetIntro || ""}>
        <DocumentButtons doc={projet} t={t} back={{ href: localePath(locale, "/parti"), label: t("Le Parti") }} />
      </PageBanner>

      <PdfDocument doc={projet} title={t("Projet de société")} t={t} />

      {/* LES AXES */}
      {projetAxes.length > 0 && (
        <section id="axes" className="bg-ecideBlue-50 py-20 lg:py-24 px-6 scroll-mt-32">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="space-y-4 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Projet de société")}</span>
              <h2 className="text-4xl lg:text-5xl text-ecideDarkBlue">{t("Les axes du projet")}</h2>
            </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projetAxes.map((a, i) => (
              <article key={i} className="panel panel--white p-7 space-y-4 reveal relative overflow-hidden">
                <span className="card-index" aria-hidden="true">{pad2(i + 1)}</span>
                <div className="icon-tile icon-tile--dark"><i className={`fa-solid ${a.icone}`} aria-hidden="true"></i></div>
                <h3 className="text-xl font-bold text-gray-900">{a.titre}</h3>
                <p className="text-gray-600">{a.texte}</p>
              </article>
            ))}
          </div>
          </div>
        </section>
      )}

      {/* REJOINDRE */}
      <section className="bg-ecideDarkBlue text-white py-16 lg:py-20 px-6 diag">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-8 reveal">
          <div className="space-y-3 max-w-2xl">
            <span className="eyebrow">{t("Agir")}</span>
            <h2 className="text-4xl no-bar">{parti.mission ? t("Notre mission") : t("Rejoindre le parti")}</h2>
            {parti.mission && <p className="text-lg text-blue-100 leading-relaxed">{parti.mission}</p>}
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link href={localePath(locale, parti.url1 || "/adherer")} className="btn btn--primary btn--lg">{parti.bouton1 || t("Rejoindre le parti")}</Link>
            <Link href={localePath(locale, "/parti")} className="btn btn--outline-white btn--lg">{t("Le Parti")}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
