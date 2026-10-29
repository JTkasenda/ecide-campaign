import type { Metadata } from "next";
import Link from "next/link";
import { getParti } from "@/lib/api";
import { pad2, tint, safeUrl } from "@/lib/format";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import { CounterValue } from "@/components/Counter";
import PageSubnav from "@/components/PageSubnav";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getParti(locale)]);
  return pageMetadata(locale, "/parti", { title: t("Le Parti"), description: data.parti.intro });
}


export default async function PartiPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getParti(locale), getT(locale)]);
  const { parti, page: pp, chiffres, engagements, valeurs, etapes, organes, membres = [], documents } = data;
  const missions = data.missions || [];
  const projetAxes = data.projetAxes || [];
  const hasVision = !!(parti.vision || parti.visionCitation);
  const hasMission = !!(parti.mission || missions.length);
  const hasProjet = !!(parti.projetIntro || projetAxes.length);
  const programme = documents.find((d) => d.url && /programme/i.test(d.nom));
  const n = organes.length;

  const orgCard = (o: { titre: string; texte: string; icone: string }, tone: string) => {
    const low = o.titre.toLowerCase();
    let extra = null;
    if (low.includes("diaspora")) extra = <Link href={localePath(locale, "/diaspora")} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue">{t("Voir la diaspora")} →</Link>;
    if (low.includes("provinci")) extra = <Link href={`${localePath(locale, "/cadres")}#niveau=provincial`} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue">{t("Voir les secrétariats provinciaux")} →</Link>;
    if (low.includes("section") || low.includes("cellule")) extra = <Link href={`${localePath(locale, "/cadres")}#niveau=provincial`} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue">{t("Trouver ma section")} →</Link>;
    return (
      <div className={`org-card org-card--${tone}`}>
        <i className={`fa-solid ${o.icone}`} aria-hidden="true"></i>
        <div>
          <h3 className="text-lg text-gray-900">{o.titre}</h3>
          <p className="text-sm text-gray-600">{o.texte}</p>
          {extra}
        </div>
      </div>
    );
  };

  return (
    <main id="main" className="flex-grow">
      <h1 className="sr-only">{t("Le Parti")}</h1>
      {/* IDENTITÉ DU PARTI */}
      <section className="bg-ecideDarkBlue text-white relative overflow-hidden flex items-center lg:min-h-[32rem] diag">
        <img src="/assets/img/logo-512.png" alt="" aria-hidden="true" className="hidden lg:block absolute -right-20 -bottom-24 w-[26rem] opacity-[0.08] pointer-events-none select-none" />
        <div className="max-w-7xl mx-auto w-full px-6 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative">
          <div className="lg:col-span-7 space-y-6">
            {parti.badge && <span className="pill pill--yellow">{parti.badge}</span>}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl leading-none no-bar">
              {parti.titre} <span className="text-ecideYellow">{parti.titreAccent}</span>
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
      >
        <Link href={localePath(locale, "/cadres")} className="ml-auto shrink-0 whitespace-nowrap text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue py-4 pl-4"><i className="fa-solid fa-people-group mr-2" aria-hidden="true"></i>{t("Annuaire des cadres")}</Link>
      </PageSubnav>

      {/* VISION */}
      {hasVision && (
        <section id="vision" className="bg-ecideDarkBlue text-white py-20 lg:py-24 px-6 scroll-mt-32 relative overflow-hidden">
          <span className="absolute -right-10 -bottom-16 text-[18rem] leading-none font-display text-white/5 select-none" aria-hidden="true">“</span>
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start relative">
            <div className="lg:col-span-2 space-y-5 reveal">
              <span className="text-ecideYellow font-bold uppercase tracking-widest text-sm">{t("Vision")}</span>
              <h2 className="text-4xl font-black">{t("Notre vision")}</h2>
              <span className="block w-12 h-1 bg-ecideYellow" aria-hidden="true"></span>
              <i className="fa-solid fa-eye text-3xl text-ecideYellow" aria-hidden="true"></i>
            </div>
            <div className="lg:col-span-3 space-y-6 reveal">
              {parti.visionCitation && <p className="font-display text-3xl md:text-4xl leading-tight text-ecideYellow">« {parti.visionCitation} »</p>}
              {parti.vision && <p className="text-xl text-blue-100 leading-relaxed">{parti.vision}</p>}
            </div>
          </div>
        </section>
      )}

      {/* HISTORIQUE */}
      <section id="historique" className="bg-gray-50 py-20 lg:py-24 px-6 border-b border-gray-200 scroll-mt-32">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-2 space-y-5 reveal">
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Historique")}</span>
            <h2 className="text-4xl font-black text-ecideDarkBlue">{t("Notre histoire")}</h2>
            <span className="block w-12 h-1 bg-ecideBlue-200" aria-hidden="true"></span>
            <i className="fa-solid fa-landmark text-3xl text-ecideBlue-600" aria-hidden="true"></i>
          </div>
          <div className="lg:col-span-3 space-y-6 reveal">
            {parti.hist1 && <p className="text-xl text-gray-700 leading-relaxed">{parti.hist1}</p>}
            {parti.hist2 && <p className="text-xl text-gray-700 leading-relaxed">{parti.hist2}</p>}
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-16 pt-16 border-t border-gray-200">
        <span id="etapes" className="block scroll-mt-32" aria-hidden="true"></span>
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 reveal">
            <div className="max-w-2xl space-y-3">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Repères")}</span>
              <h3 className="text-3xl font-black text-ecideDarkBlue">{t("Les grandes étapes")}</h3>
              <p className="text-lg text-gray-600">{pp.etapesTexte || ""}</p>
            </div>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 reveal">
            {etapes.map((e, i) => (
              <li key={i} className={`bg-white border border-gray-200 p-6 space-y-3`}>
                <span className="font-display text-3xl font-bold text-ecideBlue-600 uppercase leading-none">{e.repere}</span>
                <h3 className="text-lg text-gray-900">{e.titre}</h3>
                <p className="text-sm text-gray-600">{e.texte}</p>
              </li>
            ))}
          </ol>
        </div>
        </div>
      </section>

      {/* CHARTE ET VALEURS */}
      <section id="charte-valeurs" className="bg-white py-20 lg:py-24 px-6 border-b border-gray-200 scroll-mt-32">
        <span id="valeurs" className="block scroll-mt-32" aria-hidden="true"></span>
        <span id="charte" className="block scroll-mt-32" aria-hidden="true"></span>
        <span id="statuts" className="block scroll-mt-32" aria-hidden="true"></span>
        <span id="textes" className="block scroll-mt-32" aria-hidden="true"></span>
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="text-center space-y-4 reveal">
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Textes fondateurs")}</span>
            <h2 className="text-4xl font-black text-ecideDarkBlue">{t("Charte et valeurs")}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">{valeurs.length === 13 ? t("Les 13 valeurs de l'ECiDé") : t("Nos valeurs")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {valeurs.map((v, i) => {
              const tt = tint(v.couleur);
              return (
                <div key={i} className="p-8 bg-gray-50 border border-gray-100 space-y-3 reveal relative overflow-hidden">
                  <span className="card-index" aria-hidden="true">{pad2(i + 1)}</span>
                  <div className={`w-14 h-14 ${tt.bg} ${tt.text} flex items-center justify-center text-2xl`}><i className={`fa-solid ${v.icone}`} aria-hidden="true"></i></div>
                  <h3 className="text-xl font-bold text-gray-900">{v.titre}</h3>
                  <p className="text-gray-600">{v.texte}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-16 pt-16 border-t border-gray-200">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-2 space-y-6 reveal">
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Textes fondateurs")}</span>
            <h3 className="text-3xl font-black text-ecideDarkBlue">{t("Statuts & charte")}</h3>
            <span className="block w-12 h-1 bg-ecideYellow" aria-hidden="true"></span>
            <p className="text-lg text-gray-600 leading-relaxed">{pp.docsTexte || ""}</p>
            <ul className="divide-y divide-gray-200 border-y border-gray-200 bg-white">
              {documents.length === 0 && <li className="px-6 py-8 text-center text-gray-500">{t("Aucun document publié pour le moment.")}</li>}
              {documents.map((d, i) =>
                d.url ? (
                  <li key={i}>
                    <a href={safeUrl(d.url)} target="_blank" rel="noopener" className="flex items-center gap-5 px-5 py-4 group">
                      <span className="w-11 h-11 bg-red-50 text-red-600 flex items-center justify-center text-lg shrink-0"><i className="fa-regular fa-file-pdf" aria-hidden="true"></i></span>
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
            <Link href={localePath(locale, "/adherer")} className="inline-flex items-center gap-2 bg-ecideBlue text-white font-bold px-7 py-4 hover:bg-ecideDarkBlue transition">{t("Rejoindre le parti")} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>
          </div>
          <div className="lg:col-span-3 space-y-6 reveal">
            <h3 className="text-2xl text-ecideDarkBlue"><i className="fa-solid fa-file-signature text-ecideYellow-700 mr-3" aria-hidden="true"></i>{t("Les engagements de la charte")}</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6 text-lg text-gray-700">
              {engagements.map((e, i) => (
                <li key={i} className="flex items-start gap-4"><i className="fa-solid fa-check text-ecideGreen text-2xl mt-1" aria-hidden="true"></i><span>{e}</span></li>
              ))}
            </ul>
          </div>
        </div>
        </div>
      </section>

      {/* MISSION */}
      {hasMission && (
        <section id="mission" className="bg-ecideGreen-50 py-20 lg:py-24 px-6 border-y border-ecideGreen-100 scroll-mt-32">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-2 space-y-5 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Mission")}</span>
              <h2 className="text-4xl font-black text-ecideDarkBlue">{t("Notre mission")}</h2>
              <span className="block w-12 h-1 bg-ecideGreen" aria-hidden="true"></span>
              {parti.mission && <p className="text-lg text-gray-600 leading-relaxed">{parti.mission}</p>}
            </div>
            <ol className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-5 reveal">
              {missions.map((m, i) => (
                <li key={i} className="flex items-start gap-4 bg-white border border-ecideGreen-100 p-5">
                  <span className="font-display text-2xl text-ecideGreen leading-none pt-0.5">{pad2(i + 1)}</span>
                  <span className="text-gray-800 leading-relaxed">{m}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* PROJET DE SOCIÉTÉ */}
      {hasProjet && (
        <section id="projet" className="bg-gray-50 py-20 lg:py-24 px-6 border-b border-gray-200 scroll-mt-32">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 reveal">
              <div className="max-w-3xl space-y-3">
                <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Projet de société")}</span>
                <h2 className="text-4xl font-black text-ecideDarkBlue">{t("Notre projet de société")}</h2>
                {parti.projetIntro && <p className="text-lg text-gray-600 leading-relaxed">{parti.projetIntro}</p>}
              </div>
              {programme && <a href={safeUrl(programme.url)} target="_blank" rel="noopener" className="inline-flex items-center gap-2 bg-ecideBlue text-white font-bold px-6 py-3.5 hover:bg-ecideDarkBlue transition shrink-0"><i className="fa-regular fa-file-pdf" aria-hidden="true"></i>{t("Lire le programme")}</a>}
            </div>
            {projetAxes.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {projetAxes.map((a, i) => (
                  <article key={i} className="bg-white border border-gray-200 p-7 space-y-4 reveal relative overflow-hidden">
                    <span className="card-index" aria-hidden="true">{pad2(i + 1)}</span>
                    <div className="w-12 h-12 bg-ecideBlue-50 text-ecideBlue flex items-center justify-center text-xl"><i className={`fa-solid ${a.icone}`} aria-hidden="true"></i></div>
                    <h3 className="text-xl font-bold text-gray-900">{a.titre}</h3>
                    <p className="text-gray-600">{a.texte}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ORGANISATION */}
      <section id="organisation" className="bg-white py-20 lg:py-24 px-6 scroll-mt-32">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4 space-y-5 reveal lg:sticky lg:top-32">
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Structure")}</span>
            <h2 className="text-4xl font-black text-ecideDarkBlue">{t("Organigramme")}</h2>
            <p className="text-lg text-gray-600 leading-relaxed">{pp.orgaTexte || ""}</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-3"><span className="w-3 h-3 bg-ecideBlue" aria-hidden="true"></span>{t("Organes nationaux")}</li>
              <li className="flex items-center gap-3"><span className="w-3 h-3 bg-ecideYellow" aria-hidden="true"></span>{t("Relais territoriaux")}</li>
              <li className="flex items-center gap-3"><span className="w-3 h-3 bg-ecideGreen" aria-hidden="true"></span>{t("Structures spécialisées")}</li>
            </ul>
            <Link href={localePath(locale, "/cadres")} className="inline-flex items-center gap-2 text-ecideBlue font-bold hover:text-ecideDarkBlue">{t("Consulter l'annuaire des cadres")} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>
          </div>
          <div className="lg:col-span-8 orgchart reveal">
            {organes.map((o, i) => {
              if (n >= 6 && i === n - 2) {
                return (
                  <div key={i} className="org-level org-level--split">
                    {orgCard(o, "yellow")}
                    {orgCard(organes[i + 1], "green")}
                  </div>
                );
              }
              if (n >= 6 && i === n - 1) return null;
              return (
                <div key={i} className="org-level">
                  {orgCard(o, i < 4 ? "blue" : "yellow")}
                </div>
              );
            })}
            <div className="org-level">
              <div className="org-card org-card--yellow">
                <i className="fa-solid fa-house-user" aria-hidden="true"></i>
                <div>
                  <h3 className="text-lg text-gray-900">{t("Cellules et places de résistance")}</h3>
                  <p className="text-sm text-gray-600">{t("Présence de proximité : une cellule par quartier, avenue ou rue, et des places de résistance.")}</p>
                  <Link href={`${localePath(locale, "/cadres")}#niveau=provincial`} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue">{t("Trouver ma section")} →</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        {membres.length > 0 && (
          <div className="max-w-6xl mx-auto mt-16 pt-16 border-t border-gray-200">
        <span id="membres" className="block scroll-mt-32" aria-hidden="true"></span>
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-2xl space-y-3 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Membres")}</span>
              <h3 className="text-3xl font-black text-ecideDarkBlue">{t("Les membres du parti")}</h3>
              <p className="text-lg text-gray-600">{t("Qui peut être membre de l'ECiDé, et à quel titre.")}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {membres.map((m, i) => {
                const tt = tint(m.couleur);
                return (
                  <article key={i} className={`bg-white border p-8 space-y-4 reveal relative overflow-hidden`}>
                    <span className="card-index" aria-hidden="true">{pad2(i + 1)}</span>
                    <div className={`w-12 h-12 ${tt.bg} ${tt.text} flex items-center justify-center text-xl`}><i className={`fa-solid ${m.icone}`} aria-hidden="true"></i></div>
                    <h3 className="text-xl font-bold text-gray-900">{m.titre}</h3>
                    <p className="text-gray-600">{m.texte}</p>
                  </article>
                );
              })}
            </div>
          </div>
          </div>
        )}
      </section>
    </main>
  );
}
