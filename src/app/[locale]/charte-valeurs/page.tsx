import type { Metadata } from "next";
import Link from "next/link";
import { getParti } from "@/lib/api";
import { pad2, tint } from "@/lib/format";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import PageBanner from "@/components/PageBanner";
import PdfDocument, { DocumentButtons } from "@/components/PdfDocument";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getParti(locale)]);
  return pageMetadata(locale, "/charte-valeurs", { title: t("Charte des valeurs"), description: data.page.charteTexte || data.page.docsTexte || data.parti.intro });
}

/**
 * Charte des valeurs : le PDF publié dans l'administration (aperçu dans la page et téléchargement),
 * puis les 13 valeurs et les engagements de la charte.
 */
export default async function CharteValeursPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getParti(locale), getT(locale)]);
  const { page: pp, valeurs, engagements, charte } = data;
  return (
    <main id="main" className="flex-grow">
      <PageBanner eyebrow={t("Textes fondateurs")} title={t("Charte des valeurs")} text={pp.charteTexte || pp.docsTexte || ""}>
        <DocumentButtons doc={charte} t={t} back={{ href: localePath(locale, "/parti"), label: t("Le Parti") }} />
      </PageBanner>

      <PdfDocument doc={charte} title={t("Charte des valeurs")} t={t} />

      {/* LES VALEURS */}
      {valeurs.length > 0 && (
        <section id="valeurs" className="bg-ecideBlue-50 py-20 lg:py-24 px-6 scroll-mt-32">
          <div className="max-w-6xl mx-auto space-y-14">
            <div className="space-y-4 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Textes fondateurs")}</span>
              <h2 className="text-4xl lg:text-5xl text-ecideDarkBlue">{valeurs.length === 13 ? t("Les 13 valeurs de l'ECiDé") : t("Nos valeurs")}</h2>
            </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {valeurs.map((v, i) => {
              const tt = tint(v.couleur);
              return (
                <div key={i} className="panel panel--white p-8 space-y-3 reveal relative overflow-hidden">
                  <span className="card-index" aria-hidden="true">{pad2(i + 1)}</span>
                  <div className={`w-14 h-14 ${tt.bg} ${tt.text} flex items-center justify-center text-2xl`}><i className={`fa-solid ${v.icone}`} aria-hidden="true"></i></div>
                  <h3 className="text-xl font-bold text-gray-900">{v.titre}</h3>
                  <p className="text-gray-600">{v.texte}</p>
                </div>
              );
            })}
          </div>
          </div>
        </section>
      )}

      {/* LES ENGAGEMENTS */}
      {engagements.length > 0 && (
        <section id="engagements" className="bg-ecideDarkBlue text-white py-20 lg:py-24 px-6 scroll-mt-32 diag">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-2 space-y-5 reveal">
              <span className="eyebrow">{t("Textes fondateurs")}</span>
              <h2 className="text-4xl">{t("Les engagements de la charte")}</h2>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href={localePath(locale, "/adherer")} className="btn btn--primary">{t("Rejoindre le parti")}</Link>
                <Link href={localePath(locale, "/parti")} className="btn btn--outline-white">{t("Le Parti")}</Link>
              </div>
            </div>
            <ul className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6 text-lg reveal">
              {engagements.map((e, i) => (
                <li key={i} className="flex items-start gap-4"><i className="fa-solid fa-check text-ecideYellow text-2xl mt-1" aria-hidden="true"></i><span className="text-blue-100">{e}</span></li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
