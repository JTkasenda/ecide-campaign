import type { Metadata } from "next";
import Link from "next/link";
import { getHome, getSite } from "@/lib/api";
import { safeUrl, textStyle } from "@/lib/format";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import Chyron from "@/components/Chyron";
import { CounterValue } from "@/components/Counter";
import JumpSelect from "@/components/JumpSelect";
import { NewsMeta } from "@/components/NewsCard";
import SocialEmbeds from "@/components/SocialEmbeds";
import { VideoPlayer } from "@/components/VideoPlayer";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const home = await getHome(locale);
  return pageMetadata(locale, "/", { description: home.seo.description, image: home.seo.image });
}

const TILE = { bleu: "icon-tile", jaune: "icon-tile icon-tile--yellow", vert: "icon-tile icon-tile--green" } as const;
const BLOCK = { bleu: "block-gradient text-white", jaune: "block-gradient--yellow text-ecideDarkBlue", vert: "block-gradient--green text-white" } as const;
const BLOCK_BTN = { bleu: "btn btn--white", jaune: "btn btn--dark", vert: "btn btn--white" } as const;
const BAR = { bleu: "bg-ecideBlue", jaune: "bg-ecideYellow", vert: "bg-ecideGreen" } as const;

/**
 * Page d'accueil façon site de campagne : photo plein écran avec le slogan, bloc bleu avec le
 * manifeste et la vidéo ou l'article à la une, cartes d'actualités, combats en trois points,
 * positions officielles, président, fils officiels, « près de chez vous », appels à agir.
 * Tout le contenu vient de l'API ; chaque texte garde sa taille réglée dans l'administration.
 */
export default async function HomePage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [site, home, t] = await Promise.all([getSite(locale), getHome(locale), getT(locale)]);
  const { hero, chiffres, manifeste: m, combats, positions, sections: s, president: pres, news, fils, proximite, agir } = home;
  const nom = site.params.nom || "ECiDé";
  const featured = news.featured;
  const donUrl = site.params.don || `${localePath(locale, "/adherer")}#don`;
  const donExternal = /^https?:/i.test(donUrl);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(home.jsonld).replace(/</g, "\\u003c") }} />
      <main id="main" className="flex-grow">
        {/* HERO : photo pleine largeur, titre en capitales en bas à gauche, deux boutons pilules */}
        <section className="hero-photo text-white relative overflow-hidden flex items-end min-h-[32rem] md:min-h-[36rem] lg:min-h-[40rem]">
          <img src={hero.image} alt="" fetchPriority="high" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: `center ${hero.cadrage}%` }} aria-hidden="true" />
          <div className="hero-overlay absolute inset-0" style={{ opacity: Math.min(1, Math.max(0.5, hero.voile / 60)) }} aria-hidden="true"></div>
          <div className="max-w-7xl mx-auto w-full px-6 pb-12 pt-32 relative">
            <div className="max-w-3xl space-y-7">
              <h1 className="hero-titre font-black leading-[0.98]" style={textStyle(hero.tailleTitre)}>
                {hero.titre}
                {hero.slogan && <span className="hero-titre block text-ecideYellow mt-1" style={textStyle(hero.tailleSlogan)}>{hero.slogan}</span>}
              </h1>
              <div className="flex flex-wrap gap-3">
                {donExternal ? (
                  <a href={donUrl} target="_blank" rel="noopener" className="btn btn--primary btn--lg">{t("Faire un don")} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></a>
                ) : (
                  <Link href={donUrl} className="btn btn--primary btn--lg">{t("Faire un don")} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>
                )}
                <Link href={localePath(locale, site.cta.url)} className="btn btn--outline-white btn--lg">{site.cta.label} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>
              </div>
            </div>
          </div>
        </section>
        <Chyron site={site} locale={locale} label={t("Fil d'actualité")} />

        {/* MANIFESTE : bloc bleu, texte à gauche, vidéo ou article à la une à droite, chiffres clés dessous */}
        <section className="bg-ecideBlue text-white py-16 lg:py-20 px-6">
          <div className="max-w-7xl mx-auto space-y-14">
            <div className={`grid grid-cols-1 ${featured ? "lg:grid-cols-2" : ""} gap-10 lg:gap-16 items-center`}>
              <div className="space-y-6 reveal">
                <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm" style={textStyle(m.tailleSurtitre)}>{m.surtitre || t("Qui sommes-nous")}</span>
                <h2 className="text-2xl lg:text-3xl font-bold normal-case tracking-tight leading-snug" style={textStyle(m.tailleTexte)}>{m.texte}</h2>
                <p className="hero-texte text-blue-100 leading-relaxed max-w-xl" style={textStyle(hero.tailleTexte)}>{hero.texte}</p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {m.lien1 && <Link href={localePath(locale, m.url1)} className="btn btn--white" style={textStyle(m.tailleLiens)}>{m.lien1} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>}
                  {m.lien2 && <Link href={localePath(locale, m.url2)} className="btn btn--outline-white" style={textStyle(m.tailleLiens)}>{m.lien2} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>}
                </div>
              </div>
              {featured && (
                <div className="reveal">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-2xl text-gray-900">
                    {featured.embed ? (
                      <VideoPlayer embed={featured.embed} title={featured.titre} poster={featured.image} duree={featured.duree} badge={featured.categorie.label} label={t("Lire la vidéo :")} />
                    ) : (
                      <Link href={localePath(locale, featured.url)} className={`relative block aspect-video overflow-hidden ${featured.categorie.bg} flex items-center justify-center`}>
                        {featured.image ? <img src={featured.image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover object-[50%_25%]" /> : <i className={`${featured.categorie.icon} text-7xl ${featured.categorie.muted}`} aria-hidden="true"></i>}
                        <span className="pill pill--yellow absolute top-4 left-4">{t("À la une")}</span>
                      </Link>
                    )}
                    <div className="p-6 space-y-2">
                      <NewsMeta n={featured} />
                      <h3 className="text-xl md:text-2xl leading-tight" style={textStyle(s.actuTailleUneTitre)}>
                        <Link href={localePath(locale, featured.url)} className="hover:text-ecideBlue">{featured.titre}</Link>
                      </h3>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {chiffres.length > 0 && (
              <dl className={`grid grid-cols-1 ${chiffres.length === 1 ? "" : chiffres.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-6 pt-10 border-t border-white/20`} aria-label={t("Chiffres clés")}>
                {chiffres.map((c, i) => (
                  <div key={i} className="flex items-start gap-4 reveal">
                    <span className={`block w-1.5 self-stretch rounded-full ${BAR[c.couleur] || BAR.bleu} ${c.couleur === "bleu" ? "bg-white/70" : ""}`} aria-hidden="true"></span>
                    <div>
                      <dt className="sr-only">{c.libelle}</dt>
                      <dd className="hero-chiffre font-display text-white tabular-nums leading-none" style={textStyle(hero.tailleChiffres)}><CounterValue value={c.valeur} /></dd>
                      <dd className="text-blue-100 font-semibold text-sm mt-2" style={textStyle(hero.tailleChiffresLibelle)}>{c.libelle}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>

        {/* DERNIÈRES ACTUALITÉS : cartes blanches arrondies, une grande et les suivantes empilées */}
        {(featured || news.latest.length > 0) && (
          <section className="bg-white py-16 lg:py-20 px-6">
            <div className="max-w-7xl mx-auto space-y-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 reveal">
                <div className="space-y-3">
                  <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm" style={textStyle(s.actuTailleSurtitre)}>{(s.actuSurtitre as string) || t("À la une")}</span>
                  <h2 className="text-4xl lg:text-5xl text-ecideDarkBlue" style={textStyle(s.actuTailleTitre)}>{(s.actuTitre as string) || t("Dernières actualités")}</h2>
                </div>
                <Link href={localePath(locale, "/actualites")} className="btn btn--outline text-ecideBlue" style={textStyle(s.actuTailleLien)}>
                  {(s.actuLien as string) || t("Toutes les actualités")} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i>
                </Link>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {featured && (
                  <article className="card lg:col-span-2 p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 reveal">
                    <div className="flex flex-col gap-4 order-2 md:order-1">
                      <span className="pill self-start">{t("À la une")}</span>
                      <h3 className="text-2xl lg:text-3xl font-semibold leading-tight tracking-tight" style={textStyle(s.actuTailleUneTitre)}>
                        <Link href={localePath(locale, featured.url)} className="hover:text-ecideBlue">{featured.titre}</Link>
                      </h3>
                      <p className="text-gray-600 leading-relaxed" style={textStyle(s.actuTailleUneResume)}>{featured.resume}</p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-auto pt-4">
                        <time dateTime={featured.date}>{featured.dateLabel}</time>
                        {featured.lecture ? ` · ${featured.lecture} ${t("de lecture")}` : ""}
                      </p>
                    </div>
                    <Link href={localePath(locale, featured.url)} className={`relative block rounded-xl overflow-hidden min-h-56 md:min-h-full ${featured.categorie.bg} flex items-center justify-center order-1 md:order-2`}>
                      {featured.image ? <img src={featured.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover object-[50%_25%]" /> : <i className={`${featured.categorie.icon} text-7xl ${featured.categorie.muted}`} aria-hidden="true"></i>}
                      {featured.duree && <span className="absolute bottom-3 right-3 bg-black/60 text-white text-[11px] font-bold px-2 py-1 rounded-md">{featured.duree}</span>}
                    </Link>
                  </article>
                )}
                <div className="flex flex-col gap-6">
                  {news.latest.map((n) => (
                    <article key={n.id} className="card p-6 flex-1 flex flex-col gap-3 reveal">
                      <span className="pill pill--soft self-start">{n.categorie.label}</span>
                      <h3 className="text-lg font-semibold leading-snug tracking-tight" style={textStyle(s.actuTailleListeTitre)}>
                        <Link href={localePath(locale, n.url)} className="hover:text-ecideBlue">{n.titre}</Link>
                      </h3>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-auto pt-2">
                        <time dateTime={n.date}>{n.dateLabel}</time>
                        {n.duree ? ` · ${n.duree}` : ""}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* COMBATS MAJEURS : trois cartes gris clair avec tuile d'icône */}
        {combats.length > 0 && (
          <section className="bg-white pb-16 lg:pb-20 px-6">
            <div className="max-w-7xl mx-auto space-y-10">
              <h2 className="text-4xl lg:text-5xl text-ecideDarkBlue reveal">{t("Les Combats Majeurs")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {combats.map((c, i) => (
                  <article key={i} className="card card--paper p-7 lg:p-8 space-y-4 reveal">
                    <span className={TILE[c.couleur] || TILE.bleu} aria-hidden="true"><i className={`fa-solid ${c.icone}`}></i></span>
                    <h3 className="text-xl font-bold text-gray-900" style={textStyle(s.combatsTailleTitre)}>{c.titre}</h3>
                    <p className="text-gray-700 leading-relaxed" style={textStyle(s.combatsTailleTexte)}>{c.texte}</p>
                    {c.lien && <Link href={localePath(locale, c.url)} className="inline-flex items-center gap-2 text-ecideBlue font-semibold hover:text-ecideDarkBlue" style={textStyle(s.combatsTailleLien)}>{c.lien} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* POSITIONS OFFICIELLES : grand bloc bleu arrondi, citation en capitales à gauche, liste à droite */}
        <section className="px-6 pb-16 lg:pb-20 bg-white">
          <div className="max-w-7xl mx-auto bg-ecideBlue text-white rounded-3xl p-8 md:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-6 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm" style={textStyle(s.positionsTailleSurtitre)}>{(s.positionsSurtitre as string) || t("Positions officielles")}</span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl leading-[1.05]" style={textStyle(s.positionsTailleTitre)}>{(s.positionsTitre as string) || ""}</h2>
              <p className="text-lg text-blue-100 leading-relaxed" style={textStyle(s.positionsTailleTexte)}>{(s.positionsTexte as string) || ""}</p>
              {s.positionsBouton && (
                <Link href={localePath(locale, s.positionsUrl)} className="btn btn--dark" style={textStyle(s.positionsTailleBouton)}>{s.positionsBouton as string} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>
              )}
            </div>
            <ul className="space-y-4">
              {positions.map((pos, i) => {
                const oui = pos.ton === "oui";
                return (
                  <li key={i} className="bg-white text-gray-900 rounded-2xl p-6 flex gap-5 reveal">
                    <span className={`icon-tile shrink-0 ${oui ? "icon-tile--green" : "icon-tile--yellow"}`} aria-hidden="true">
                      <i className={`fa-solid ${oui ? "fa-comments" : pos.titre.toLowerCase().includes("mandat") ? "fa-ban" : "fa-triangle-exclamation"}`}></i>
                    </span>
                    <div>
                      <h3 className="font-bold text-lg" style={textStyle(s.positionsTailleListeTitre)}>{pos.titre}</h3>
                      <p className="text-gray-600 mt-1" style={textStyle(s.positionsTailleListeTexte)}>{pos.texte}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* LE PRÉSIDENT ÉLU : bloc arrondi, portrait à droite, texte sur fond bleu nuit */}
        <section className="px-6 pb-16 lg:pb-20 bg-white">
          <div className="max-w-7xl mx-auto rounded-3xl overflow-hidden bg-ecideDarkBlue text-white grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-7 p-8 md:p-12 lg:p-16 space-y-6 reveal order-2 lg:order-1">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm" style={textStyle(s.presidentTailleSurtitre)}>{(s.presidentSurtitre as string) || t("Président Élu")}</span>
              <h2 className="text-4xl lg:text-5xl leading-none" style={textStyle(s.presidentTailleNom)}>{pres.nom}</h2>
              {s.presidentSousTitre && <p className="text-xl text-ecideYellow font-semibold" style={textStyle(s.presidentTailleSousTitre)}>{s.presidentSousTitre as string}</p>}
              <p className="text-lg leading-relaxed text-blue-100" style={textStyle(s.presidentTailleTexte)}>{(s.presidentTexte as string) || ""}</p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {s.presidentBouton1 && <Link href={localePath(locale, s.presidentUrl1)} className="btn btn--primary" style={textStyle(s.presidentTailleBoutons)}>{s.presidentBouton1 as string} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>}
                {s.presidentBouton2 && (
                  <Link href={localePath(locale, s.presidentUrl2)} className="btn btn--outline-white" style={textStyle(s.presidentTailleBoutons)}>
                    <i className="fa-solid fa-play text-sm" aria-hidden="true"></i>
                    {s.presidentBouton2 as string}
                  </Link>
                )}
                {s.presidentSuivre && (pres.x || pres.facebook) && (
                  <span className="flex items-center gap-2 text-blue-200 sm:ml-auto">
                    <span className="text-xs font-semibold uppercase tracking-widest">{t("Le suivre")}</span>
                    {pres.x && <a href={`https://x.com/${pres.x}`} target="_blank" rel="noopener" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white hover:text-gray-900 transition" aria-label={`${pres.nom} ${t("sur X")}`}><i className="fa-brands fa-x-twitter" aria-hidden="true"></i></a>}
                    {pres.facebook && <a href={safeUrl(pres.facebook)} target="_blank" rel="noopener" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white hover:text-[#1877f2] transition" aria-label={`${pres.nom} ${t("sur Facebook")}`}><i className="fa-brands fa-facebook-f" aria-hidden="true"></i></a>}
                  </span>
                )}
              </div>
            </div>
            <figure className="lg:col-span-5 relative min-h-72 lg:min-h-full order-1 lg:order-2">
              <img src={pres.portrait} alt={`${t("Portrait officiel de")} ${pres.nom}`} loading="lazy" className="absolute inset-0 w-full h-full object-cover object-[50%_20%]" />
            </figure>
          </div>
        </section>

        {/* FILS OFFICIELS DU PARTI */}
        {fils.actif && (fils.x || fils.facebook) && (
          <section id="fils" className="bg-ecideBlue-50 py-16 lg:py-20 px-6">
            <div className="max-w-7xl mx-auto space-y-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 reveal">
                <div className="space-y-3 max-w-2xl">
                  <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm" style={textStyle(s.filsTailleSurtitre)}>{(s.filsSurtitre as string) || t("En direct du parti")}</span>
                  <h2 className="text-4xl text-ecideDarkBlue" style={textStyle(s.filsTailleTitre)}>{(s.filsTitre as string) || ""}</h2>
                  <p className="text-lg text-gray-600" style={textStyle(s.filsTailleTexte)}>{(s.filsTexte as string) || ""}</p>
                </div>
                <div className="flex flex-wrap gap-3 md:shrink-0">
                  {fils.x && <a href={`https://x.com/${fils.x}`} target="_blank" rel="noopener" className="btn btn--dark btn--sm"><i className="fa-brands fa-x-twitter" aria-hidden="true"></i> @{fils.x}</a>}
                  {fils.facebook && <a href={safeUrl(fils.facebook)} target="_blank" rel="noopener" className="btn btn--sm bg-[#1877f2] text-white hover:bg-[#145dbf]"><i className="fa-brands fa-facebook" aria-hidden="true"></i> {nom} {t("Officiel")}</a>}
                </div>
              </div>
              <SocialEmbeds x={fils.x} facebook={fils.facebook} name={nom} />
              {s.filsNote && <p className="text-sm text-gray-500 text-center reveal" style={textStyle(s.filsTailleNote)}>{s.filsNote as string}</p>}
            </div>
          </section>
        )}

        {/* PRÈS DE CHEZ VOUS */}
        <section className="bg-white py-16 lg:py-20 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-4 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm" style={textStyle(s.proximiteTailleSurtitre)}>{(s.proximiteSurtitre as string) || t("Près de chez vous")}</span>
              <h2 className="text-4xl text-ecideDarkBlue" style={textStyle(s.proximiteTailleTitre)}>{(s.proximiteTitre as string) || t("Trouvez votre secrétariat provincial")}</h2>
              <p className="text-lg text-gray-600 leading-relaxed" style={textStyle(s.proximiteTailleTexte)}>{(s.proximiteTexte as string) || ""}</p>
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="card card--paper p-6 block reveal">
                <span className="flex items-center gap-3 text-sm font-bold text-gray-900 mb-4">
                  <span className="icon-tile w-10 h-10 text-base"><i className="fa-solid fa-map" aria-hidden="true"></i></span>
                  {t("En RDC · ma province")}
                </span>
                <JumpSelect
                  label={t("Choisir une province")}
                  placeholder={t("Choisir une province…")}
                  options={proximite.provinces.map((prov) => ({ value: `${localePath(locale, "/cadres")}#niveau=provincial&province=${encodeURIComponent(prov)}`, label: prov }))}
                />
                <span className="block text-xs text-gray-500 mt-3" style={textStyle(s.proximiteTailleAide)}>{(s.proximiteAideProvince as string) || ""}</span>
              </label>
              <label className="card card--paper p-6 block reveal">
                <span className="flex items-center gap-3 text-sm font-bold text-gray-900 mb-4">
                  <span className="icon-tile icon-tile--green w-10 h-10 text-base"><i className="fa-solid fa-earth-africa" aria-hidden="true"></i></span>
                  {t("À l'étranger · mon pays")}
                </span>
                <JumpSelect
                  label={t("Choisir un pays")}
                  placeholder={t("Choisir un pays…")}
                  options={[
                    ...proximite.pays.map((p) => ({ value: `${localePath(locale, "/diaspora")}#continent=${p.continent}&pays=${encodeURIComponent(p.nom)}`, label: p.nom })),
                    { value: `${localePath(locale, "/diaspora")}#rejoindre`, label: (s.proximiteAutrePays as string) || t("Mon pays n'est pas dans la liste") },
                  ]}
                />
                <span className="block text-xs text-gray-500 mt-3" style={textStyle(s.proximiteTailleAide)}>{(s.proximiteAidePays as string) || ""}</span>
              </label>
            </div>
          </div>
        </section>

        {/* AGIR : blocs de couleur arrondis (adhésion, don, bénévolat) */}
        {agir.length > 0 && (
          <section className="px-6 pb-16 lg:pb-20 bg-white">
            <div className="max-w-7xl mx-auto space-y-10">
              <div className="space-y-3 reveal">
                <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm" style={textStyle(s.agirTailleSurtitre)}>{(s.agirSurtitre as string) || t("Agir")}</span>
                <h2 className="text-4xl lg:text-5xl text-ecideDarkBlue" style={textStyle(s.agirTailleTitre)}>{(s.agirTitre as string) || ""}</h2>
              </div>
              <div className={`grid grid-cols-1 ${agir.length === 1 ? "" : agir.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-6`}>
                {agir.map((a, i) => (
                  <div key={i} className={`${BLOCK[a.couleur] || BLOCK.bleu} rounded-3xl p-8 lg:p-10 min-h-80 flex flex-col gap-5 relative overflow-hidden reveal`}>
                    <i className={`fa-solid ${a.icone} watermark-icon`} aria-hidden="true"></i>
                    <h3 className="text-3xl lg:text-4xl font-black uppercase leading-none tracking-tight" style={textStyle(s.agirTailleCarteTitre)}>{a.titre}</h3>
                    <p className="leading-relaxed opacity-90 max-w-sm" style={textStyle(s.agirTailleCarteTexte)}>{a.texte}</p>
                    {a.bouton && <Link href={localePath(locale, a.url)} className={`${BLOCK_BTN[a.couleur] || BLOCK_BTN.bleu} self-start mt-auto`} style={textStyle(s.agirTailleCarteBouton)}>{a.bouton} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
