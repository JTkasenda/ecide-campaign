import type { Metadata } from "next";
import Link from "next/link";
import { getPresident } from "@/lib/api";
import { safeUrl } from "@/lib/format";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import { getWikipediaSummary } from "@/lib/wikipedia";
import PageBanner from "@/components/PageBanner";
import { DocumentButtons, DocumentCard } from "@/components/PdfDocument";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getPresident(locale)]);
  const nom = data.president.nom || t("Président Élu");
  return pageMetadata(locale, "/president/biographie", { title: `${t("Biographie")} · ${nom}`, description: data.president.bioTexte || data.president.intro, image: data.president.portrait });
}

/**
 * Biographie du Président, en un seul endroit (la page Président n'en garde qu'une amorce) : le
 * texte court et les repères de l'administration, la carte de l'article Wikipédia en français
 * (titre, description courte, lien), le PDF de la biographie officielle à télécharger (sans
 * aperçu dans la page), puis les grandes étapes du parcours.
 */
export default async function BiographiePage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getPresident(locale), getT(locale)]);
  const { president: pres, biographie, enBref, parcours } = data;
  const nom = pres.nom || t("Président Élu");
  const wikiUrl = /^https:\/\/[a-z-]+\.(?:m\.)?wikipedia\.org\//i.test(pres.wikipedia || "") ? safeUrl(pres.wikipedia) : "";
  const wiki = wikiUrl ? await getWikipediaSummary(wikiUrl) : null;
  const wikiButton = (cls: string) =>
    wikiUrl ? (
      <a href={wikiUrl} target="_blank" rel="noopener" className={cls} hrefLang="fr">
        <i className="fa-brands fa-wikipedia-w" aria-hidden="true"></i>
        {t("Lire l'article sur Wikipédia (en français)")}
      </a>
    ) : null;

  return (
    <main id="main" className="flex-grow">
      <PageBanner eyebrow={pres.bioSurtitre || t("Biographie")} title={nom} text={pres.sousTitre || pres.pastille || ""}>
        <DocumentButtons doc={biographie} t={t} back={{ href: localePath(locale, "/president"), label: t("Président Élu") }} />
      </PageBanner>

      {/* LE TEXTE DE LA BIOGRAPHIE */}
      {(pres.bioTexte || pres.bio2 || pres.bio3 || pres.citation || enBref.length > 0) && (
        <section id="parcours" className="bg-ecideBlue-50 py-16 lg:py-24 px-6 scroll-mt-32">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-7 space-y-6 reveal">
              <h2 className="text-4xl lg:text-5xl text-ecideDarkBlue leading-none">{pres.bioTitre || t("Biographie")}</h2>
              {pres.bioTexte && <p className="text-xl text-gray-800 leading-relaxed">{pres.bioTexte}</p>}
              {pres.bio2 && <p className="text-lg text-gray-600 leading-relaxed">{pres.bio2}</p>}
              {pres.bio3 && <p className="text-lg text-gray-600 leading-relaxed">{pres.bio3}</p>}
              {pres.citation && (
                <blockquote className="pt-6 pl-6 border-l-4 border-ecideYellow">
                  <p className="text-2xl font-semibold leading-snug text-ecideDarkBlue">{pres.citation}</p>
                  <footer className="mt-3 text-sm font-semibold text-gray-500">{nom}</footer>
                </blockquote>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
                <Link href={`${localePath(locale, "/president")}#discours`} className="arrow-link">{t("Discours & vidéos")}</Link>
              </div>
            </div>
            <div className="lg:col-span-5 space-y-6">
              <figure className="panel panel--white p-3 reveal">
                <img src={pres.portrait} alt={`${t("Portrait officiel de")} ${nom}`} className="w-full aspect-[4/3] object-cover object-[50%_20%]" />
                <figcaption className="eyebrow text-[10px] mt-3 px-1">{t("Portrait officiel")}</figcaption>
              </figure>
              {enBref.length > 0 && (
                <aside className="panel panel--white p-7 reveal">
                  <h3 className="text-xl text-ecideDarkBlue mb-3">{pres.enBrefTitre || t("En bref")}</h3>
                  <dl className="divide-y divide-gray-200">
                    {enBref.map((b, i) => (
                      <div key={i} className="py-3 grid grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)] gap-1 sm:gap-3">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 pt-0.5">{b.label}</dt>
                        <dd className="font-semibold text-gray-900">{b.valeur}</dd>
                      </div>
                    ))}
                  </dl>
                </aside>
              )}
            </div>
          </div>
        </section>
      )}

      {/* WIKIPÉDIA : la carte de l'article en français (titre, description courte) et le lien, sans reprendre le récit */}
      {wikiUrl && (
        <section id="wikipedia" className="bg-white py-12 lg:py-16 px-6 scroll-mt-32">
          <div className="max-w-7xl mx-auto panel p-6 lg:p-8 flex flex-col md:flex-row md:items-center gap-6 reveal">
            <span className="icon-tile icon-tile--dark shrink-0"><i className="fa-brands fa-wikipedia-w" aria-hidden="true"></i></span>
            <div className="flex-1 min-w-0 space-y-1">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-xs">{pres.wikiSurtitre || t("Sur Wikipédia")}</span>
              <h2 className="text-2xl text-ecideDarkBlue no-bar leading-tight">
                {wiki?.title || nom}
                {wiki?.description && <span className="font-serif font-normal text-lg text-gray-600"> — {wiki.description}</span>}
              </h2>
              <p className="text-sm text-gray-500 font-sans">{pres.wikiTexte || t("Article de l'encyclopédie libre Wikipédia, en français.")}</p>
            </div>
            {wikiButton("btn btn--dark md:shrink-0")}
          </div>
        </section>
      )}

      {/* LA BIOGRAPHIE OFFICIELLE EN PDF : à télécharger (pas d'aperçu dans la page) */}
      <section id="document" className={`bg-white px-6 scroll-mt-32 ${wikiUrl ? "pb-12 lg:pb-16" : "py-12 lg:py-16"}`}>
        <div className="max-w-7xl mx-auto panel p-6 lg:p-8 reveal">
          <DocumentCard doc={biographie} title={pres.bioPdfTitre || t("Biographie officielle")} t={t} />
        </div>
      </section>

      {/* LES GRANDES ÉTAPES */}
      {parcours.length > 0 && (
        <section id="etapes" className="bg-ecideDarkBlue text-white py-16 lg:py-24 px-6 scroll-mt-32 diag">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="space-y-3 reveal">
              <span className="eyebrow">{pres.parcoursSurtitre || t("Parcours")}</span>
              <h2 className="text-4xl">{pres.parcoursTitre || t("Les grandes étapes")}</h2>
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 reveal">
              {parcours.map((e, i) => (
                <li key={i} className="panel panel--white text-gray-900 p-6 space-y-3">
                  <span className="font-display text-2xl text-ecideBlue uppercase leading-none">{e.repere}</span>
                  <h3 className="text-lg text-gray-900">{e.titre}</h3>
                  <p className="text-sm text-gray-600">{e.texte}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </main>
  );
}
