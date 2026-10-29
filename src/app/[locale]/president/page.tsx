import type { Metadata } from "next";
import Link from "next/link";
import { VideoGallery } from "@/components/VideoGallery";
import { getPresident } from "@/lib/api";
import { telHref, safeUrl } from "@/lib/format";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import PageSubnav from "@/components/PageSubnav";
import SocialEmbeds from "@/components/SocialEmbeds";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getPresident(locale)]);
  return pageMetadata(locale, "/president", { title: data.president.nom || t("Président Élu"), description: data.president.intro, image: data.president.portrait });
}


export default async function PresidentPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getPresident(locale), getT(locale)]);
  const { president: pres, enBref, parcours, videos, presse } = data;
  const nom = (pres.nom || "").trim().split(/ (.+)/);
  const main = videos[0];
  const pastille = (pres.pastille || t("Président Élu")).split("·");
  const showFils = pres.afficherFils && (pres.x || pres.facebook);
  const faits = [
    { icon: "fa-cake-candles text-ecideBlue", label: pres.fait1Label, val: pres.fait1 },
    { icon: "fa-landmark text-ecideYellow-700", label: pres.fait2Label, val: pres.fait2 },
    { icon: "fa-check-to-slot text-ecideGreen", label: pres.fait3Label, val: pres.fait3 },
  ];
  const lire = t("Lire la vidéo :");
  const subnav = [
    { href: "#biographie", label: t("Biographie") },
    ...(parcours.length ? [{ href: "#parcours", label: t("Parcours") }] : []),
    { href: "#discours", label: t("Discours & vidéos") },
    ...(showFils ? [{ href: "#communication", label: t("Réseaux sociaux") }] : []),
    { href: "#presse", label: t("Presse") },
  ];

  return (
    <main id="main" className="flex-grow">
      {/* PORTRAIT */}
      <section className="president-hero relative bg-ecideDarkBlue text-white overflow-hidden lg:min-h-[34rem] lg:grid lg:grid-cols-2">
        <img src="/assets/img/logo-512.png" alt="" aria-hidden="true" className="hidden lg:block absolute -left-28 -bottom-28 w-[30rem] opacity-[0.05] pointer-events-none select-none" />
        <figure className="relative h-72 sm:h-96 lg:h-auto lg:order-2">
          <img src={pres.portrait} alt={`${t("Portrait officiel de")} ${pres.nom}`} className="absolute inset-0 w-full h-full object-cover object-[50%_20%]" />
          <span className="hidden lg:block absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-ecideDarkBlue to-transparent" aria-hidden="true"></span>
          <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ecideDarkBlue/60 to-transparent" aria-hidden="true"></span>
          <figcaption className="absolute bottom-5 left-6 lg:left-12 flex items-center gap-3 text-white">
            <span className="w-8 h-0.5 bg-ecideYellow" aria-hidden="true"></span>
            <span className="text-xs font-bold uppercase tracking-widest">{t("Portrait officiel")}</span>
          </figcaption>
        </figure>
        <div className="relative flex items-center px-6 py-12 lg:py-10 lg:pb-16 lg:pl-[max(1.5rem,calc((100vw-72rem)/2))] lg:pr-16 lg:order-1">
          <div className="relative pl-6 lg:pl-8 space-y-5 max-w-xl">
            <span className="absolute left-0 top-1 bottom-1 w-1.5 bg-gradient-to-b from-ecideBlue via-ecideYellow to-ecideGreen" aria-hidden="true"></span>
            <div className="space-y-4">
              <span className="pill pill--yellow inline-flex items-center gap-2">
                {pastille[0].trim()}
                {pastille[1] && (
                  <>
                    {" "}
                    <span className="opacity-50" aria-hidden="true">·</span> {pastille[1].trim()}
                  </>
                )}
              </span>
              <h1 className="text-5xl sm:text-6xl lg:text-[clamp(3rem,8vh,4.5rem)] leading-[0.95] text-white">
                {nom[0] || ""}
                <br />
                <span className="text-ecideYellow">{nom[1] || ""}</span>
              </h1>
              {pres.sousTitre && <p className="text-2xl font-semibold text-blue-100">{pres.sousTitre}</p>}
            </div>
            <p className="text-lg 2xl:text-xl leading-relaxed text-blue-100">{pres.intro || ""}</p>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-white/20 py-3 text-sm">
              {faits.filter((f) => f.val).map((f, i) => (
                <div key={i} className="relative pl-7">
                  <i className={`fa-solid ${f.icon} absolute left-0 top-0.5`} aria-hidden="true"></i>
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-blue-200">{f.label}</dt>
                  <dd className="font-semibold text-white">{f.val}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center gap-4">
              <a href="#discours" className="btn btn--primary"><i className="fa-solid fa-play text-sm" aria-hidden="true"></i>{t("Discours & vidéos")}</a>
              <a href="#presse" className="btn btn--outline-white">{t("Dossier de presse")}</a>
              {(pres.x || pres.facebook) && (
                <span className="flex items-center gap-3 sm:ml-auto text-blue-200">
                  <span className="text-xs font-bold uppercase tracking-widest">{t("Le suivre")}</span>
                  {pres.x && <a href={`https://x.com/${pres.x}`} target="_blank" rel="noopener" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white hover:text-gray-900 transition" aria-label={`${pres.nom} ${t("sur X")}`}><i className="fa-brands fa-x-twitter" aria-hidden="true"></i></a>}
                  {pres.facebook && <a href={safeUrl(pres.facebook)} target="_blank" rel="noopener" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white hover:text-[#1877f2] transition" aria-label={`${pres.nom} ${t("sur Facebook")}`}><i className="fa-brands fa-facebook-f" aria-hidden="true"></i></a>}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <PageSubnav label={t("Sommaire de la page")} links={subnav}>
        <Link href={localePath(locale, "/adherer")} className="ml-auto shrink-0 whitespace-nowrap text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue py-4 pl-4"><i className="fa-solid fa-id-card mr-2" aria-hidden="true"></i>{t("Rejoindre le mouvement")}</Link>
      </PageSubnav>

      {/* BIOGRAPHIE */}
      <section id="biographie" className="bg-white py-20 lg:py-24 px-6 scroll-mt-32">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-3 space-y-6 reveal">
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Biographie")}</span>
            <h2 className="text-4xl lg:text-5xl font-black text-ecideDarkBlue leading-none">{pres.bioTitre || ""}</h2>
            {pres.bioTexte && <p className="text-xl text-gray-700 leading-relaxed">{pres.bioTexte}</p>}
            {pres.bio2 && <p className="text-lg text-gray-600 leading-relaxed">{pres.bio2}</p>}
            {pres.bio3 && <p className="text-lg text-gray-600 leading-relaxed">{pres.bio3}</p>}
            {pres.citation && (
              <blockquote className="border-l-4 border-ecideYellow bg-ecideYellow-50 px-8 pb-7 my-6">
                <p className="font-serif italic font-semibold text-2xl leading-snug text-ecideDarkBlue">{pres.citation}</p>
                <footer className="mt-4 font-sans not-italic text-xs font-bold uppercase tracking-widest text-ecideYellow-700">{pres.nom}</footer>
              </blockquote>
            )}
            <div className="flex flex-wrap gap-4 pt-2">
              <a href="#presse" className="inline-flex items-center gap-2 text-ecideBlue font-bold hover:text-ecideDarkBlue">{t("Biographie officielle (PDF)")} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></a>
              <Link href={localePath(locale, "/parti")} className="inline-flex items-center gap-2 text-ecideBlue font-bold hover:text-ecideDarkBlue">{t("Le parti qu'il a fondé")} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>
            </div>
          </div>
          {enBref.length > 0 && (
            <aside className="lg:col-span-2 bg-ecideBlue-50 border border-ecideBlue-100 p-8 space-y-5 reveal">
              <h3 className="text-2xl text-ecideDarkBlue">{t("En bref")}</h3>
              <dl className="divide-y divide-ecideBlue-100">
                {enBref.map((b, i) => (
                  <div key={i} className="py-3 grid grid-cols-1 sm:grid-cols-[8.5rem_minmax(0,1fr)] gap-1 sm:gap-3">
                    <dt className="text-xs font-bold uppercase tracking-widest text-gray-500 pt-0.5">{b.label}</dt>
                    <dd className="font-semibold text-gray-900">{b.valeur}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          )}
        </div>
      </section>

      {/* PARCOURS */}
      {parcours.length > 0 && (
        <section id="parcours" className="bg-gray-50 py-20 lg:py-24 px-6 border-y border-gray-200 scroll-mt-32">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-2xl space-y-3 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Parcours")}</span>
              <h2 className="text-4xl font-black text-ecideDarkBlue">{t("Les grandes étapes")}</h2>
              <p className="text-lg text-gray-600">{t("Du secteur privé à la scène politique nationale, une trajectoire marquée par la constance.")}</p>
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 reveal">
              {parcours.map((e, i) => (
                <li key={i} className={`bg-white border border-gray-200 p-6 space-y-3`}>
                  <span className="font-display text-3xl font-bold text-ecideBlue-600 uppercase leading-none">{e.repere}</span>
                  <h3 className="text-lg text-gray-900">{e.titre}</h3>
                  <p className="text-sm text-gray-600">{e.texte}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* DISCOURS & VIDÉOS */}
      <section id="discours" className="bg-white py-20 lg:py-24 px-6 scroll-mt-32">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 reveal">
            <div className="space-y-3">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Médias")}</span>
              <h2 className="text-4xl font-black text-ecideDarkBlue">{t("Discours & vidéos")}</h2>
              <p className="text-lg text-gray-600">{pres.videosIntro || ""}</p>
            </div>
            {pres.youtube && <a href={safeUrl(pres.youtube)} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-ecideBlue font-bold hover:text-ecideDarkBlue"><i className="fa-brands fa-youtube text-red-600 text-xl" aria-hidden="true"></i> {t("Chaîne YouTube officielle")}</a>}
          </div>
          {main ? (
            <VideoGallery videos={videos.slice(0, 3)} labels={{ lire, latest: t("Dernière intervention"), allLives: t("Tous les directs & replays"), lives: t("Directs"), inNews: t("Dans la rubrique Actualités") }} newsUrl={localePath(locale, "/actualites")} />
          ) : (
            <p className="text-gray-500 reveal">{t("Aucune vidéo publiée pour le moment.")}</p>
          )}
        </div>
      </section>

      {/* RÉSEAUX SOCIAUX */}
      {showFils && (
        <section id="communication" className="py-20 lg:py-24 px-6 bg-ecideGreen-50 border-t border-ecideGreen-100 scroll-mt-32">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 reveal">
              <div className="space-y-3 max-w-2xl">
                <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Communication")}</span>
                <h2 className="text-4xl font-black text-ecideDarkBlue">{t("Sur les réseaux sociaux")}</h2>
                <p className="text-lg text-gray-600">{pres.communicationTexte || ""}</p>
              </div>
              <div className="flex flex-wrap gap-3 md:shrink-0">
                {pres.x && <a href={`https://x.com/${pres.x}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 bg-gray-900 text-white font-bold px-5 py-3 hover:bg-black transition text-sm"><i className="fa-brands fa-x-twitter" aria-hidden="true"></i> {t("Suivre sur X")}</a>}
                {pres.facebook && <a href={safeUrl(pres.facebook)} target="_blank" rel="noopener" className="inline-flex items-center gap-2 bg-[#1877f2] text-white font-bold px-5 py-3 hover:bg-[#145dbf] transition text-sm"><i className="fa-brands fa-facebook" aria-hidden="true"></i> {t("Suivre sur Facebook")}</a>}
              </div>
            </div>
            <SocialEmbeds x={pres.x} facebook={pres.facebook} name={pres.nom} height={640} />
            <p className="text-sm text-gray-500 text-center reveal">{t("Les fils sont fournis par X et Facebook et s'affichent lorsque le site est en ligne. Ils ne suivent pas les visiteurs sur ce site.")}</p>
          </div>
        </section>
      )}

      {/* DOSSIER DE PRESSE */}
      <section id="presse" className="py-20 lg:py-24 px-6 bg-white border-t border-gray-200 scroll-mt-32">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-2 space-y-6 reveal">
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Presse")}</span>
            <h2 className="text-4xl font-black text-ecideDarkBlue">{t("Dossier de presse & visuels")}</h2>
            <p className="text-lg text-gray-600 leading-relaxed">{pres.presseTexte || ""}</p>
            <div className="bg-ecideYellow-50 border border-ecideYellow-100 p-6 space-y-3">
              <h3 className="text-xl text-ecideDarkBlue">{t("Service presse")}</h3>
              <p className="text-sm text-gray-600">{t("Demandes d'interview, d'accréditation et de visuels.")}</p>
              {pres.presseMail && <p className="font-semibold text-gray-900"><i className="fa-solid fa-envelope text-ecideYellow-700 w-6" aria-hidden="true"></i><a href={`mailto:${pres.presseMail}`} className="hover:text-ecideBlue">{pres.presseMail}</a></p>}
              {pres.presseTel && <p className="font-semibold text-gray-900"><i className="fa-solid fa-phone text-ecideYellow-700 w-6" aria-hidden="true"></i><a href={telHref(pres.presseTel)} className="hover:text-ecideBlue">{pres.presseTel}</a></p>}
            </div>
          </div>
          <ul className="lg:col-span-3 divide-y divide-gray-200 border-y border-gray-200 reveal">
            {presse.length === 0 && <li className="py-8 text-center text-gray-500">{t("Le dossier de presse sera publié prochainement.")}</li>}
            {presse.map((f, i) => {
              const zip = f.type === "ZIP";
              return (
                <li key={i}>
                  <a href={safeUrl(f.url || "#")} className="flex items-center gap-5 py-5 group">
                    <span className={`w-12 h-12 ${zip ? "bg-ecideBlue-50 text-ecideBlue" : "bg-red-50 text-red-600"} flex items-center justify-center text-xl shrink-0`}><i className={zip ? "fa-regular fa-images" : "fa-regular fa-file-pdf"} aria-hidden="true"></i></span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-gray-900 group-hover:text-ecideBlue">{f.nom}</span>
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
