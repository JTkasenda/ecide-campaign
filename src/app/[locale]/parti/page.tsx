import type { Metadata } from "next";
import Link from "next/link";
import { getParti, getSite } from "@/lib/api";
import { pad2, safeUrl } from "@/lib/format";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import { Acronym, spellsAcronym } from "@/components/Acronym";
import { CounterValue } from "@/components/Counter";
import PageSubnav from "@/components/PageSubnav";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getParti(locale)]);
  return pageMetadata(locale, "/parti", { title: t("Le Parti"), description: data.parti.intro });
}


export default async function PartiPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, site, t] = await Promise.all([getParti(locale), getSite(locale), getT(locale)]);
  const { parti, page: pp, chiffres, valeurs, etapes, documents } = data;
  const missions = data.missions || [];
  const projetAxes = data.projetAxes || [];
  const hasVision = !!(parti.vision || parti.visionCitation);
  const hasMission = !!(parti.mission || missions.length);
  const hasProjet = !!(parti.projetIntro || projetAxes.length);
  const nomComplet = `${parti.titre || ""} ${parti.titreAccent || ""}`.trim();
  return (
    <main id="main" className="flex-grow">
      <h1 className="sr-only">{t("Le Parti")}</h1>
      {/* IDENTITÉ DU PARTI */}
      <section className="bg-ecideDarkBlue text-white relative overflow-hidden flex items-center lg:min-h-[32rem] diag">
        <img src={site.assets.logo512 || "/assets/img/logo-512.png"} alt="" aria-hidden="true" className="hidden lg:block absolute -right-20 -bottom-24 w-[26rem] opacity-[0.08] pointer-events-none select-none" />
        <div className="max-w-7xl mx-auto w-full px-6 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
          <div className="lg:col-span-7 space-y-6">
            {parti.badge && <span className="pill pill--yellow">{parti.badge}</span>}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl leading-none no-bar">
              {/* Le nom complet du parti (titre + accent) : les lettres E · Ci · Dé, alignées, épellent le sigle */}
              {spellsAcronym(nomComplet) ? (
                <Acronym text={nomComplet} />
              ) : (
                <>
                  {parti.titre} <span className="text-ecideYellow">{parti.titreAccent}</span>
                </>
              )}
            </h2>
            {parti.devise && <p className="text-2xl font-semibold text-white">{parti.devise}</p>}
            <p className="text-lg text-blue-100 leading-relaxed max-w-2xl">{parti.intro}</p>
            <div className="flex flex-wrap gap-4 pt-2">
              {parti.bouton1 && <Link href={localePath(locale, parti.url1)} className="btn btn--primary">{parti.bouton1} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>}
              {parti.bouton2 && <Link href={localePath(locale, parti.url2)} className="btn btn--outline-white">{parti.bouton2} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>}
            </div>
          </div>
          {chiffres.length > 0 && (
            <dl className="lg:col-span-5 grid grid-cols-2 gap-4">
              {chiffres.map((c, i) => (
                <div key={i} className="bg-white text-gray-900 p-5">
                  <dd className="font-display text-4xl text-ecideDarkBlue leading-none"><CounterValue value={c.valeur} /></dd>
                  <dt className="text-xs font-semibold text-gray-500 mt-2">{c.libelle}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <PageSubnav
        label={t("Sommaire de la page")}
        links={[
          ...(hasVision ? [{ href: "#vision", label: t("Notre vision") }] : []),
          { href: "#historique", label: t("Historique") },
          { href: "#charte-valeurs", label: t("Charte et valeurs") },
          ...(hasMission ? [{ href: "#mission", label: t("Notre mission") }] : []),
          ...(hasProjet ? [{ href: "#projet", label: t("Notre projet de société") }] : []),
          { href: "#organisation", label: t("Organigramme") },
        ]}
      />

      {/* VISION */}
      {hasVision && (
        <section id="vision" className="bg-ecideDarkBlue text-white py-28 lg:py-32 px-6 scroll-mt-32 diag">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-20 items-start relative">
            <div className="lg:col-span-2 space-y-5 reveal">
              <span className="eyebrow">{t("Vision")}</span>
              <h2 className="text-4xl">{t("Notre vision")}</h2>
            </div>
            <div className="lg:col-span-3 space-y-6 reveal">
              {parti.visionCitation && <p className="font-display text-4xl md:text-5xl leading-none text-ecideYellow">« {parti.visionCitation} »</p>}
              {parti.vision && <p className="text-xl text-blue-100 leading-relaxed">{parti.vision}</p>}
            </div>
          </div>
        </section>
      )}

      {/* HISTORIQUE */}
      <section id="historique" className="bg-white py-28 lg:py-32 px-6 scroll-mt-32">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-20 items-start">
          <div className="lg:col-span-2 space-y-5 reveal">
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Historique")}</span>
            <h2 className="text-4xl text-ecideDarkBlue">{t("Notre histoire")}</h2>
          </div>
          <div className="lg:col-span-3 space-y-6 reveal">
            {parti.hist1 && <p className="text-xl text-gray-700 leading-relaxed">{parti.hist1}</p>}
            {parti.hist2 && <p className="text-xl text-gray-700 leading-relaxed">{parti.hist2}</p>}
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-20 pt-20 border-t border-ecideDarkBlue/20">
        <span id="etapes" className="block scroll-mt-32" aria-hidden="true"></span>
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 reveal">
            <div className="max-w-2xl space-y-3">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Repères")}</span>
              <h3 className="text-3xl text-ecideDarkBlue">{t("Les grandes étapes")}</h3>
              <p className="text-lg text-gray-600">{pp.etapesTexte || ""}</p>
            </div>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 reveal">
            {etapes.map((e, i) => (
              <li key={i} className="panel p-6 space-y-3">
                <span className="font-display text-3xl text-ecideBlue leading-none">{e.repere}</span>
                <h3 className="text-lg text-gray-900">{e.titre}</h3>
                <p className="text-sm text-gray-600">{e.texte}</p>
              </li>
            ))}
          </ol>
        </div>
        </div>
      </section>

      {/* CHARTE ET VALEURS : une amorce (les noms des valeurs) et les statuts ; les cartes des valeurs et les
          engagements sont sur la page Charte des valeurs, pour ne pas les répéter ici */}
      <section id="charte-valeurs" className="bg-ecideBlue-50 py-28 lg:py-32 px-6 scroll-mt-32">
        <span id="valeurs" className="block scroll-mt-32" aria-hidden="true"></span>
        <span id="charte" className="block scroll-mt-32" aria-hidden="true"></span>
        <span id="statuts" className="block scroll-mt-32" aria-hidden="true"></span>
        <span id="textes" className="block scroll-mt-32" aria-hidden="true"></span>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-16 lg:gap-20 items-start">
          <div className="lg:col-span-3 space-y-6 reveal">
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Textes fondateurs")}</span>
            <h2 className="text-4xl lg:text-5xl text-ecideDarkBlue">{t("Charte et valeurs")}</h2>
            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">{pp.charteTexte || (valeurs.length === 13 ? t("Les 13 valeurs de l'ECiDé") : t("Nos valeurs"))}</p>
            {valeurs.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label={valeurs.length === 13 ? t("Les 13 valeurs de l'ECiDé") : t("Nos valeurs")}>
                {valeurs.map((v, i) => (
                  <li key={i} className="chip inline-flex items-center gap-2 px-3 py-1.5 bg-white"><i className={`fa-solid ${v.icone} text-ecideBlue`} aria-hidden="true"></i>{v.titre}</li>
                ))}
              </ul>
            )}
            <Link href={localePath(locale, "/charte-valeurs")} className="btn btn--dark"><i className="fa-regular fa-file-pdf" aria-hidden="true"></i>{t("Lire la charte des valeurs")}</Link>
          </div>
          <div className="lg:col-span-2 space-y-6 reveal">
            <h3 className="text-3xl text-ecideDarkBlue">{t("Statuts & charte")}</h3>
            <p className="text-lg text-gray-600 leading-relaxed">{pp.docsTexte || ""}</p>
            <ul className="divide-y divide-gray-200 bg-white panel panel--white">
              {documents.length === 0 && <li className="px-6 py-8 text-center text-gray-500">{t("Aucun document publié pour le moment.")}</li>}
              {documents.map((d, i) =>
                d.url ? (
                  <li key={i}>
                    <a href={safeUrl(d.url)} target="_blank" rel="noopener" className="flex items-center gap-5 px-5 py-4 group">
                      <span className="icon-tile w-11 h-11 bg-red-600 shrink-0"><i className="fa-regular fa-file-pdf" aria-hidden="true"></i></span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-gray-900 group-hover:text-ecideBlue">{d.nom}</span>
                        <span className="block text-sm text-gray-500">PDF{d.taille ? ` · ${d.taille}` : ""}{d.date ? ` · ${t("mis à jour le")} ${d.dateLabel}` : ""}</span>
                      </span>
                      <i className="fa-solid fa-download text-gray-400 group-hover:text-ecideBlue" aria-hidden="true"></i>
                    </a>
                  </li>
                ) : (
                  <li key={i} className="flex items-center gap-5 px-5 py-4 text-gray-500">
                    <span className="w-11 h-11 bg-gray-100 text-gray-400 flex items-center justify-center text-lg shrink-0"><i className="fa-regular fa-file-pdf" aria-hidden="true"></i></span>
                    <span className="flex-1 min-w-0"><span className="block font-bold text-gray-700">{d.nom}</span><span className="block text-sm">PDF · {t("publication à venir")}</span></span>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* MISSION */}
      {hasMission && (
        <section id="mission" className="bg-ecideDarkBlue text-white py-28 lg:py-32 px-6 scroll-mt-32 diag">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-20 items-start">
            <div className="lg:col-span-2 space-y-5 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Mission")}</span>
              <h2 className="text-4xl">{t("Notre mission")}</h2>
              {parti.mission && <p className="text-lg text-blue-100 leading-relaxed">{parti.mission}</p>}
            </div>
            <ol className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-5 reveal">
              {missions.map((m, i) => (
                <li key={i} className="flex items-start gap-4 panel panel--white text-gray-900 p-5">
                  <span className="font-display text-3xl text-ecideBlue leading-none">{pad2(i + 1)}</span>
                  <span className="text-gray-800 leading-relaxed font-serif">{m}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* PROJET DE SOCIÉTÉ : une amorce (intitulés des axes) ; les axes détaillés et le PDF sont sur la page dédiée */}
      {hasProjet && (
        <section id="projet" className="bg-white py-28 lg:py-32 px-6 scroll-mt-32">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            <div className="lg:col-span-8 space-y-5 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Projet de société")}</span>
              <h2 className="text-4xl lg:text-5xl text-ecideDarkBlue">{t("Notre projet de société")}</h2>
              {parti.projetIntro && <p className="text-lg text-gray-600 leading-relaxed max-w-3xl">{parti.projetIntro}</p>}
              {projetAxes.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label={t("Les axes du projet")}>
                  {projetAxes.map((a, i) => (
                    <li key={i} className="chip inline-flex items-center gap-2 px-3 py-1.5"><i className={`fa-solid ${a.icone} text-ecideBlue`} aria-hidden="true"></i>{a.titre}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="lg:col-span-4 flex lg:justify-end reveal">
              <Link href={localePath(locale, "/projet-societe")} className="btn btn--dark btn--lg"><i className="fa-regular fa-file-pdf" aria-hidden="true"></i>{t("Lire le projet de société")}</Link>
            </div>
          </div>
        </section>
      )}

      {/* ORGANIGRAMME : page dédiée */}
      <section id="organisation" className="bg-ecideDarkBlue text-white py-20 lg:py-32 px-6 scroll-mt-32 diag">
        <span id="membres" className="block scroll-mt-32" aria-hidden="true"></span>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-8 space-y-5 reveal">
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Structure")}</span>
            <h2 className="text-4xl lg:text-5xl">{t("Organigramme")}</h2>
            <p className="text-lg text-blue-100 leading-relaxed max-w-3xl">{pp.orgaTexte || ""}</p>
          </div>
          <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-3 reveal">
            <Link href={localePath(locale, "/organigramme")} className="btn btn--primary btn--lg">{t("Voir l'organigramme")}</Link>
            <Link href={localePath(locale, "/cadres")} className="btn btn--outline-white btn--lg">{t("Annuaire des cadres")}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
