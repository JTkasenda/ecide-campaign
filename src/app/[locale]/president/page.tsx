import type { Metadata } from "next";
import Link from "next/link";
import { VideoGallery } from "@/components/VideoGallery";
import { getPresident } from "@/lib/api";
import { telHref, safeUrl } from "@/lib/format";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import PageSubnav from "@/components/PageSubnav";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getPresident(locale)]);
  return pageMetadata(locale, "/president", { title: data.president.nom || t("Président Élu"), description: data.president.intro, image: data.president.portrait });
}

/**
 * Page du Président : une mise en page volontairement sobre, en trois temps.
 * 1. Portrait et présentation (nom, sous-titre, introduction, deux boutons).
 * 2. Biographie : le texte, puis « En bref » et les grandes étapes dans une colonne calme.
 * 3. Discours & vidéos, puis le dossier de presse ; les réseaux sociaux tiennent en une ligne.
 */
export default async function PresidentPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getPresident(locale), getT(locale)]);
  const { president: pres, enBref, parcours, videos, presse } = data;
  const nom = (pres.nom || "").trim().split(/ (.+)/);
  const main = videos[0];
  const pastille = (pres.pastille || t("Président Élu")).split("·");
  const showFils = pres.afficherFils && (pres.x || pres.facebook);
  const lire = t("Lire la vidéo :");
  const subnav = [
    { href: "#biographie", label: t("Biographie") },
    { href: "#discours", label: t("Discours & vidéos") },
    { href: "#presse", label: t("Presse") },
  ];

  return (
    <main id="main" className="flex-grow">
      {/* PORTRAIT ET PRÉSENTATION */}
      <section className="president-hero bg-ecideDarkBlue text-white lg:min-h-[32rem] lg:grid lg:grid-cols-2 diag">
        <figure className="relative h-72 sm:h-96 lg:h-auto lg:order-2">
          <img src={pres.portrait} alt={`${t("Portrait officiel de")} ${pres.nom}`} className="absolute inset-0 w-full h-full object-cover object-[50%_20%]" />
        </figure>
        <div className="flex items-center px-6 py-12 lg:py-16 lg:pl-[max(1.5rem,calc((100vw-80rem)/2))] lg:pr-16 lg:order-1">
          <div className="space-y-6 max-w-xl">
            <span className="pill pill--yellow inline-flex flex-wrap items-center gap-2 whitespace-normal max-w-full">
              {pastille[0].trim()}
              {pastille[1] && (
                <>
                  {" "}
                  <span className="opacity-50" aria-hidden="true">·</span> {pastille[1].trim()}
                </>
              )}
            </span>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl leading-[0.95] text-white">
              {nom[0] || ""}
              <br />
              <span className="text-ecideYellow">{nom[1] || ""}</span>
            </h1>
            {pres.sousTitre && <p className="text-xl font-semibold text-blue-100">{pres.sousTitre}</p>}
            <p className="text-lg leading-relaxed text-blue-100">{pres.intro || ""}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href="#discours" className="btn btn--primary"><i className="fa-solid fa-play text-sm" aria-hidden="true"></i>{t("Discours & vidéos")}</a>
              <a href="#biographie" className="btn btn--outline-white">{t("Biographie")}</a>
            </div>
          </div>
        </div>
      </section>

      <PageSubnav label={t("Sommaire de la page")} links={subnav} />

      {/* BIOGRAPHIE : le texte, puis une colonne calme avec « En bref » et les grandes étapes */}
      <section id="biographie" className="bg-white py-16 lg:py-24 px-6 scroll-mt-32">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-7 space-y-6 reveal">
            <h2 className="text-4xl lg:text-5xl text-ecideDarkBlue leading-none">{pres.bioTitre || t("Biographie")}</h2>
            {pres.bioTexte && <p className="text-xl text-gray-800 leading-relaxed">{pres.bioTexte}</p>}
            {pres.bio2 && <p className="text-lg text-gray-600 leading-relaxed">{pres.bio2}</p>}
            {pres.bio3 && <p className="text-lg text-gray-600 leading-relaxed">{pres.bio3}</p>}
            {pres.citation && (
              <blockquote className="pt-10 pl-6 border-l-4 border-ecideYellow">
                <p className="text-2xl font-semibold leading-snug text-ecideDarkBlue">{pres.citation}</p>
                <footer className="mt-3 text-sm font-semibold text-gray-500">{pres.nom}</footer>
              </blockquote>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
              <a href="#presse" className="inline-flex items-center gap-2 text-ecideBlue font-semibold hover:text-ecideDarkBlue">{t("Biographie officielle (PDF)")} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></a>
              <Link href={localePath(locale, "/parti")} className="inline-flex items-center gap-2 text-ecideBlue font-semibold hover:text-ecideDarkBlue">{t("Le parti qu'il a fondé")} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>
            </div>
          </div>
          <div className="lg:col-span-5 space-y-6">
            {enBref.length > 0 && (
              <aside className="panel p-7 reveal">
                <h3 className="text-xl text-ecideDarkBlue mb-3">{t("En bref")}</h3>
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
            {parcours.length > 0 && (
              <section id="parcours" className="panel panel--white border border-gray-200 p-7 reveal scroll-mt-32" aria-labelledby="parcours-titre">
                <h3 id="parcours-titre" className="text-xl text-ecideDarkBlue mb-4">{t("Les grandes étapes")}</h3>
                <ol className="space-y-4">
                  {parcours.map((e, i) => (
                    <li key={i} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
                      <span className="font-display text-ecideBlue uppercase text-sm leading-snug pt-0.5">{e.repere}</span>
                      <div>
                        <p className="font-semibold text-gray-900 leading-snug">{e.titre}</p>
                        <p className="text-sm text-gray-600">{e.texte}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </div>
      </section>

      {/* DISCOURS & VIDÉOS */}
      <section id="discours" className="bg-ecideBlue-50 py-16 lg:py-24 px-6 scroll-mt-32">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 reveal">
            <div className="space-y-3 max-w-2xl">
              <h2 className="text-4xl text-ecideDarkBlue">{t("Discours & vidéos")}</h2>
              {pres.videosIntro && <p className="text-lg text-gray-600">{pres.videosIntro}</p>}
            </div>
            {pres.youtube && <a href={safeUrl(pres.youtube)} target="_blank" rel="noopener" className="btn btn--outline text-ecideBlue btn--sm md:shrink-0"><i className="fa-brands fa-youtube text-red-600 text-lg" aria-hidden="true"></i> {t("Chaîne YouTube officielle")}</a>}
          </div>
          {main ? (
            <VideoGallery videos={videos.slice(0, 3)} labels={{ lire, latest: t("Dernière intervention"), allLives: t("Tous les directs & replays"), lives: t("Directs"), inNews: t("Dans la rubrique Actualités") }} newsUrl={localePath(locale, "/actualites")} />
          ) : (
            <p className="text-gray-500 reveal">{t("Aucune vidéo publiée pour le moment.")}</p>
          )}
          {showFils && (
            <div id="communication" className="panel panel--white p-6 flex flex-col md:flex-row md:items-center gap-5 scroll-mt-32 reveal">
              <p className="text-gray-700 flex-1 min-w-0">
                <span className="font-semibold text-gray-900">{t("Sur les réseaux sociaux")}</span>
                {pres.communicationTexte ? ` — ${pres.communicationTexte}` : ""}
              </p>
              <div className="flex flex-wrap gap-3 md:shrink-0">
                {pres.x && <a href={`https://x.com/${pres.x}`} target="_blank" rel="noopener" className="btn btn--dark btn--sm"><i className="fa-brands fa-x-twitter" aria-hidden="true"></i> {t("Suivre sur X")}</a>}
                {pres.facebook && <a href={safeUrl(pres.facebook)} target="_blank" rel="noopener" className="btn btn--sm bg-[#1877f2] text-white hover:bg-[#145dbf]"><i className="fa-brands fa-facebook" aria-hidden="true"></i> {t("Suivre sur Facebook")}</a>}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* DOSSIER DE PRESSE */}
      <section id="presse" className="py-16 lg:py-24 px-6 bg-white scroll-mt-32">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-5 space-y-5 reveal">
            <h2 className="text-4xl text-ecideDarkBlue">{t("Dossier de presse & visuels")}</h2>
            <p className="text-lg text-gray-600 leading-relaxed">{pres.presseTexte || ""}</p>
            {(pres.presseMail || pres.presseTel) && (
              <p className="text-gray-700 leading-relaxed">
                <span className="font-semibold text-gray-900">{t("Service presse")}</span>
                {pres.presseMail && (
                  <>
                    <br />
                    <a href={`mailto:${pres.presseMail}`} className="text-ecideBlue font-semibold hover:text-ecideDarkBlue">{pres.presseMail}</a>
                  </>
                )}
                {pres.presseTel && (
                  <>
                    <br />
                    <a href={telHref(pres.presseTel)} className="text-ecideBlue font-semibold hover:text-ecideDarkBlue">{pres.presseTel}</a>
                  </>
                )}
              </p>
            )}
          </div>
          <ul className="lg:col-span-7 divide-y divide-gray-200 border-y border-gray-200 reveal">
            {presse.length === 0 && <li className="py-8 text-center text-gray-500">{t("Le dossier de presse sera publié prochainement.")}</li>}
            {presse.map((f, i) => {
              const zip = f.type === "ZIP";
              return (
                <li key={i}>
                  <a href={safeUrl(f.url || "#")} className="flex items-center gap-5 py-5 group">
                    <span className={`icon-tile shrink-0 ${zip ? "" : "bg-red-600"}`} aria-hidden="true"><i className={zip ? "fa-regular fa-images" : "fa-regular fa-file-pdf"}></i></span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-gray-900 group-hover:text-ecideBlue">{f.nom}</span>
                      <span className="block text-sm text-gray-500">{f.type}{f.taille ? ` · ${f.taille}` : ""}{f.date ? ` · ${t("mise à jour")} ${f.dateLabel}` : ""}</span>
                    </span>
                    <i className="fa-solid fa-download text-gray-400 group-hover:text-ecideBlue" aria-hidden="true"></i>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </main>
  );
}
