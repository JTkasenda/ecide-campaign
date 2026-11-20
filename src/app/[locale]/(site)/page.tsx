import type { Metadata } from "next";
import Link from "next/link";
import { getAdherer, getHome, getSite } from "@/lib/api";
import type { HomePage as HomePageData } from "@/lib/types";
import { formatNumber, safeUrl, textStyle } from "@/lib/format";
import { localePath, type Locale } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import { Acronym } from "@/components/Acronym";
import Chyron from "@/components/Chyron";
import { CounterValue } from "@/components/Counter";
import JumpSelect from "@/components/JumpSelect";
import NewsletterForm from "@/components/NewsletterForm";
import SocialEmbeds from "@/components/SocialEmbeds";
import { VideoPlayer } from "@/components/VideoPlayer";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const home = await getHome(locale);
  return pageMetadata(locale, "/", { description: home.seo.description, image: home.seo.image });
}

/**
 * Page d'accueil façon warnockforgeorgia.com : photo plein écran avec le titre en serif et le
 * formulaire d'inscription (aucun menu sur la photo : la navigation passe par le hamburger), panneau blanc du manifeste qui chevauche la section bleu nuit des
 * combats, bandeau jaune d'appel au don avec les montants, président, positions, actualités
 * « dans la presse », fils officiels, « près de chez vous », appels à agir.
 * Tout le contenu vient de l'API ; chaque texte garde sa taille réglée dans l'administration.
 * Sous 1024 px, les classes mob-* (globals.css) reprennent la version mobile de ce site : photo en
 * haut du bandeau et contenu centré dessous, sections en cartes blanches sur fond gris-bleu,
 * montants du don en tuiles, actualités en cartes ; l'ordinateur reste tel quel.
 */
export default async function HomePage({ params }: PageParams) {
  const locale = await pageLocale(params);
  return <HomeView locale={locale} home={await getHome(locale)} />;
}

/**
 * Contenu de la page d'accueil, à partir des données de l'API. Sert aussi à l'aperçu de
 * l'administration (apercu-accueil/[jeton]) avec les modifications pas encore enregistrées ;
 * chaque section porte data-apercu pour que l'aperçu puisse s'y rendre.
 */
export async function HomeView({ locale, home }: { locale: Locale; home: HomePageData }) {
  const [site, adherer, t] = await Promise.all([getSite(locale), getAdherer(locale).catch(() => null), getT(locale)]);
  const { hero, chiffres, manifeste: m, combats, positions, sections: s, president: pres, news, fils, proximite, agir } = home;
  const nom = site.params.nom || "ECiDé";
  // Nom du Président découpé en mots : sur téléphone, seuls les deux premiers s'affichent
  const presNom = String(pres.nom || "").trim().split(/\s+/).filter(Boolean);
  const featured = news.featured;
  const donUrl = site.params.don && /^https?:\/\//i.test(site.params.don) ? site.params.don : localePath(locale, "/don");
  const donExternal = /^https?:/i.test(donUrl);
  const paiement = adherer?.paiement;
  const devise = paiement ? (paiement.deviseDefaut === "usd" ? "USD" : "FC") : "";
  const montants = paiement ? (paiement.deviseDefaut === "usd" ? paiement.usd.amounts : paiement.cdf.amounts).slice(0, 4) : [];
  const donButton = (className: string, label: string) =>
    donExternal ? (
      <a href={donUrl} target="_blank" rel="noopener" className={className}>{label}</a>
    ) : (
      <Link href={donUrl} className={className}>{label}</Link>
    );
  const newsItems = [...(featured ? [featured] : []), ...news.latest].slice(0, 3);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(home.jsonld).replace(/</g, "\\u003c") }} />
      <main id="main" className="flex-grow">
        {/* HERO : photo plein écran, étiquette, titre en serif, formulaire d'inscription */}
        <section data-apercu="hero" className="hero-photo text-white relative overflow-hidden flex items-center min-h-[36rem] lg:min-h-[calc(100svh-5rem)]">
          <img src={hero.image} alt="" fetchPriority="high" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: `center ${hero.cadrage}%` }} aria-hidden="true" />
          <div className="hero-overlay absolute inset-0" style={{ opacity: Math.min(1, Math.max(0.6, hero.voile / 60)) }} aria-hidden="true"></div>
          {/* Moins d'air en haut qu'en bas : le bloc de texte se place un peu au-dessus du centre de la photo */}
          <div className="hero-body max-w-7xl mx-auto w-full px-6 pt-12 pb-24 lg:pt-14 lg:pb-40 relative">
            <div className="hero-stack max-w-2xl space-y-10">
              {/* Téléphone et tablette : emblème du parti à la jonction de la photo et du fond bleu nuit */}
              <img src={site.assets.logo || "/assets/img/logo-160.png"} alt="" width={88} height={88} className="hero-emblem lg:hidden" aria-hidden="true" />
              {/* Téléphone et tablette : le logo puis le nom court du parti, centrés, puis directement le formulaire.
                  Le titre complet reste dans la page (moteurs de recherche, lecteurs d'écran), masqué à l'œil. */}
              <p className="hero-nom lg:hidden" aria-hidden="true" translate="no">{nom}</p>
              {hero.slogan && <p className="eyebrow text-xl max-lg:hidden" style={textStyle(hero.tailleSlogan)}>{hero.slogan}</p>}
              <h1 className="hero-titre leading-[1.02] max-lg:sr-only" style={textStyle(hero.tailleTitre)}><Acronym text={hero.titre} /></h1>
              <p className="hero-texte text-blue-50 leading-relaxed max-w-xl max-lg:hidden" style={textStyle(hero.tailleTexte)}>{hero.texte}</p>
              {site.params.newsletter ? (
                <NewsletterForm
                  variant="hero"
                  labels={{ title: t("Recevoir les communiqués"), placeholder: t("Votre e-mail"), name: t("Prénom (facultatif)"), submit: t("S'abonner"), success: t("Merci ! Vous recevrez nos communiqués officiels."), note: t("Nous personnalisons chaque envoi : vos communiqués arrivent dans la langue de cette page.") }}
                />
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Link href={localePath(locale, site.cta.url)} className="btn btn--primary btn--lg">{site.cta.label}</Link>
                </div>
              )}
              {/* Téléphone et tablette : « Adhérer » sous le formulaire (la barre fixe du bas d'écran est retirée) */}
              {site.params.newsletter && (
                <Link href={localePath(locale, site.cta.url)} className="hero-adherer lg:hidden">
                  <i className="fa-solid fa-id-card" aria-hidden="true"></i>
                  {t("Adhérer en ligne")}
                </Link>
              )}
            </div>
          </div>
        </section>
        <Chyron site={site} locale={locale} label={t("Fil d'actualité")} />

        {/* MANIFESTE : panneau blanc qui chevauche la section bleu nuit des combats */}
        <section data-apercu="manifeste" className="mob-band bg-white px-6 pt-20 lg:pt-28">
          <div className="mob-card max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-7 bg-white lg:pr-16 pb-0 lg:pb-20 space-y-6 reveal relative z-10">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm" style={textStyle(m.tailleSurtitre)}>{m.surtitre || t("Qui sommes-nous")}</span>
              <h2 className="bar-title text-3xl md:text-4xl text-ecideDarkBlue" style={textStyle(m.tailleTexte)}>{m.texte}</h2>
              <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
                {m.lien1 && <Link href={localePath(locale, m.url1)} className="arrow-link" style={textStyle(m.tailleLiens)}>{m.lien1}</Link>}
                {m.lien2 && <Link href={localePath(locale, m.url2)} className="arrow-link" style={textStyle(m.tailleLiens)}>{m.lien2}</Link>}
              </div>
            </div>
            {chiffres.length > 0 && (
              /* Le libellé (dt) s'affiche sous le chiffre, et n'est lu qu'une fois par les lecteurs d'écran ;
                 chiffres clés sur ordinateur seulement (masqués sur téléphone et tablette) */
              <dl className="max-lg:hidden lg:col-span-5 grid grid-cols-3 gap-4 pb-0 lg:pb-20" aria-label={t("Chiffres clés")}>
                {chiffres.map((c, i) => (
                  <div key={i} className="border-t-4 border-ecideYellow pt-5 reveal flex flex-col">
                    <dt className="order-last font-sans font-bold uppercase tracking-widest text-xs lg:text-[13px] text-gray-500 mt-3" style={textStyle(hero.tailleChiffresLibelle)}>{c.libelle}</dt>
                    <dd className="hero-chiffre font-display font-black text-ecideDarkBlue tabular-nums leading-none" style={textStyle(hero.tailleChiffres)}><CounterValue value={c.valeur} /></dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>

        {/* COMBATS MAJEURS : section bleu nuit, cartes gris-bleu (« On the issues ») */}
        {combats.length > 0 && (
          <section data-apercu="combats" className="mob-band mob-band--from-dark bg-ecideDarkBlue text-white py-20 lg:py-32 px-6 diag">
            <div className="max-w-7xl mx-auto space-y-12">
              <h2 className="bar-title text-4xl lg:text-5xl reveal">{(s.combatsTitre as string) || t("Les Combats Majeurs")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {combats.map((c, i) => (
                  <article key={i} className="mob-card bg-ecideBlue-50 text-gray-900 p-8 lg:p-10 space-y-4 reveal border-b-8 border-ecideYellow">
                    <span className="eyebrow eyebrow--dark font-sans"><i className={`fa-solid ${c.icone} mr-2`} aria-hidden="true"></i>{t("Combat")} {i + 1}</span>
                    <h3 className="text-2xl text-ecideDarkBlue" style={textStyle(s.combatsTailleTitre)}>{c.titre}</h3>
                    <p className="text-gray-700 leading-relaxed" style={textStyle(s.combatsTailleTexte)}>{c.texte}</p>
                    {c.lien && <Link href={localePath(locale, c.url)} className="arrow-link" style={textStyle(s.combatsTailleLien)}>{c.lien}</Link>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* APPEL AU DON : bandeau jaune avec les montants (bandeau orange de warnockforgeorgia.com) */}
        {s.donActif !== false && (
        <section data-apercu="don" className="mob-don bg-ecideYellow text-ecideDarkBlue py-16 lg:py-20 px-6">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center gap-10">
            <div className="space-y-2 lg:w-1/3">
              <span className="eyebrow eyebrow--dark font-sans">{(s.donSurtitre as string) || t("Soutenir le Combat (Don)")}</span>
              <h2 className="text-3xl md:text-4xl leading-tight no-bar max-lg:sr-only">{(s.donTitre as string) || t("Chaque contribution finance la mobilisation, la communication et la défense de la vérité des urnes.")}</h2>
            </div>
            <div className="mob-don__grid flex flex-wrap items-stretch gap-3 lg:flex-1 lg:justify-end">
              {montants.map((n) => (
                <Link key={n} href={`${localePath(locale, "/don")}?montant=${n}`} className="mob-don__tile min-w-28 px-5 py-4 bg-white/60 hover:bg-white text-ecideDarkBlue font-display font-black text-3xl leading-none text-center transition">
                  {formatNumber(n, locale)}
                  <span className="block font-sans text-[11px] font-bold tracking-widest mt-1">{devise}</span>
                </Link>
              ))}
              {donButton("mob-don__cta btn btn--dark btn--lg", (s.donBouton as string) || t("Faire un don"))}
            </div>
          </div>
        </section>
        )}

        {/* LE PRÉSIDENT ÉLU : photo et panneau blanc (« Why I'm running ») */}
        <section data-apercu="president" className="mob-band bg-ecideBlue-50 px-6 py-20 lg:py-32">
          <div className="mob-pres max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 items-center">
            <figure className="lg:col-span-6 relative h-80 sm:h-[26rem] lg:h-[34rem] reveal">
              <img src={pres.portrait} alt={`${t("Portrait officiel de")} ${pres.nom}`} loading="lazy" className="absolute inset-0 w-full h-full object-cover object-[50%_20%]" />
            </figure>
            <div className="mob-pres__panel lg:col-span-6 bg-white p-8 md:p-12 lg:p-14 lg:-ml-16 relative z-10 space-y-6 reveal shadow-card">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm" style={textStyle(s.presidentTailleSurtitre)}>{(s.presidentSurtitre as string) || t("Président Élu")}</span>
              <h2 className="bar-title text-4xl lg:text-5xl text-ecideDarkBlue leading-none" style={textStyle(s.presidentTailleNom)}>
                {/* Téléphone et tablette : prénom et nom seulement (« Martin Fayulu ») ; le nom complet reste sur ordinateur */}
                {presNom.slice(0, 2).join(" ")}
                {presNom.length > 2 && <span className="max-lg:hidden"> {presNom.slice(2).join(" ")}</span>}
              </h2>
              {s.presidentSousTitre && <p className="text-xl font-semibold text-ecideBlue" style={textStyle(s.presidentTailleSousTitre)}>{s.presidentSousTitre as string}</p>}
              <p className="mob-clamp text-lg leading-relaxed text-gray-700" style={textStyle(s.presidentTailleTexte)}>{(s.presidentTexte as string) || ""}</p>
              <div className="flex flex-wrap items-center gap-x-10 gap-y-3 pt-2">
                {s.presidentBouton1 && <Link href={localePath(locale, s.presidentUrl1)} className="btn btn--dark" style={textStyle(s.presidentTailleBoutons)}>{s.presidentBouton1 as string}</Link>}
                {s.presidentBouton2 && <Link href={localePath(locale, s.presidentUrl2)} className="arrow-link mob-hide" style={textStyle(s.presidentTailleBoutons)}><i className="fa-solid fa-play text-sm" aria-hidden="true"></i>{s.presidentBouton2 as string}</Link>}
                {s.presidentSuivre && (pres.x || pres.facebook) && (
                  <span className="mob-hide flex items-center gap-2 text-gray-500 sm:ml-auto">
                    <span className="eyebrow eyebrow--dark text-[10px]">{t("Le suivre")}</span>
                    {pres.x && <a href={`https://x.com/${pres.x}`} target="_blank" rel="noopener" className="w-9 h-9 flex items-center justify-center bg-ecideDarkBlue text-white hover:bg-ecideYellow hover:text-ecideDarkBlue transition" aria-label={`${pres.nom} ${t("sur X")}`}><i className="fa-brands fa-x-twitter" aria-hidden="true"></i></a>}
                    {pres.facebook && <a href={safeUrl(pres.facebook)} target="_blank" rel="noopener" className="w-9 h-9 flex items-center justify-center bg-ecideDarkBlue text-white hover:bg-ecideYellow hover:text-ecideDarkBlue transition" aria-label={`${pres.nom} ${t("sur Facebook")}`}><i className="fa-brands fa-facebook-f" aria-hidden="true"></i></a>}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* POSITIONS OFFICIELLES (téléphone : titre, positions et bouton ; textes explicatifs sur ordinateur seulement) */}
        <section data-apercu="positions" className="mob-band bg-white py-20 lg:py-32 px-6">
          <div className="mob-card max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
            <div className="lg:col-span-5 space-y-6 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm" style={textStyle(s.positionsTailleSurtitre)}>{(s.positionsSurtitre as string) || t("Positions officielles")}</span>
              <h2 className="bar-title text-4xl lg:text-5xl text-ecideDarkBlue" style={textStyle(s.positionsTailleTitre)}>{(s.positionsTitre as string) || ""}</h2>
              <p className="mob-hide text-lg text-gray-700 leading-relaxed" style={textStyle(s.positionsTailleTexte)}>{(s.positionsTexte as string) || ""}</p>
              {s.positionsBouton && <Link href={localePath(locale, s.positionsUrl)} className="btn btn--dark" style={textStyle(s.positionsTailleBouton)}>{s.positionsBouton as string}</Link>}
            </div>
            <ul className="lg:col-span-7 divide-y divide-gray-200 border-y border-gray-200">
              {positions.map((pos, i) => {
                const oui = pos.ton === "oui";
                return (
                  <li key={i} className="py-6 max-lg:py-4 flex gap-5 max-lg:items-center reveal">
                    <span className={`icon-tile shrink-0 ${oui ? "icon-tile--green" : "icon-tile--yellow"}`} aria-hidden="true">
                      <i className={`fa-solid ${oui ? "fa-comments" : pos.titre.toLowerCase().includes("mandat") ? "fa-ban" : "fa-triangle-exclamation"}`}></i>
                    </span>
                    <div>
                      <h3 className="text-xl text-ecideDarkBlue" style={textStyle(s.positionsTailleListeTitre)}>{pos.titre}</h3>
                      <p className="mob-hide text-gray-600 mt-1" style={textStyle(s.positionsTailleListeTexte)}>{pos.texte}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ACTUALITÉS : « dans la presse », cartes blanches sur bleu nuit */}
        {newsItems.length > 0 && (
          <section data-apercu="actu" className="mob-news bg-ecideDarkBlue text-white py-20 lg:py-32 px-6 diag">
            <div className="max-w-7xl mx-auto space-y-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 reveal">
                <div className="space-y-3">
                  <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm" style={textStyle(s.actuTailleSurtitre)}>{(s.actuSurtitre as string) || t("À la une")}</span>
                  <h2 className="bar-title text-4xl lg:text-5xl" style={textStyle(s.actuTailleTitre)}>{(s.actuTitre as string) || t("Dernières actualités")}</h2>
                </div>
                <Link href={localePath(locale, "/actualites")} className="btn btn--primary" style={textStyle(s.actuTailleLien)}>{(s.actuLien as string) || t("Toutes les actualités")}</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {newsItems.map((n, i) => (
                  <article key={n.id} className="mob-news__card bg-white text-gray-900 flex flex-col reveal">
                    {i === 0 && n.embed ? (
                      <VideoPlayer embed={n.embed} title={n.titre} poster={n.image} duree={n.duree} badge={n.categorie.label} label={t("Lire la vidéo :")} />
                    ) : (
                      <Link href={localePath(locale, n.url)} className={`relative block aspect-[16/10] overflow-hidden ${n.categorie.bg} flex items-center justify-center`}>
                        {n.image ? <img src={n.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover object-[50%_25%]" /> : <i className={`${n.categorie.icon} text-6xl ${n.categorie.muted}`} aria-hidden="true"></i>}
                        {n.duree && <span className="absolute bottom-3 right-3 bg-black/70 text-white text-[11px] font-bold px-2 py-1">{n.duree}</span>}
                      </Link>
                    )}
                    <div className="p-7 flex flex-col gap-3 flex-1">
                      <p className="mob-news__meta eyebrow eyebrow--dark text-[10px]"><time dateTime={n.date}>{n.dateLabel}</time> • {n.categorie.label}</p>
                      <h3 className="mob-news__title text-3xl text-ecideDarkBlue" style={textStyle(i === 0 ? s.actuTailleUneTitre : s.actuTailleListeTitre)}>
                        <Link href={localePath(locale, n.url)} className="hover:text-ecideBlue">{n.titre}</Link>
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed line-clamp-3" style={textStyle(s.actuTailleUneResume)}>{n.resume}</p>
                      <Link href={localePath(locale, n.url)} className="arrow-link mt-auto pt-2">{t("Lire la suite")}</Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FILS OFFICIELS DU PARTI */}
        {fils.actif && (fils.x || fils.facebook) && (
          <section data-apercu="fils" id="fils" className="mob-hide mob-band bg-white py-20 lg:py-32 px-6 border-b border-gray-200">
            <div className="max-w-7xl mx-auto space-y-12">
              <div className="mob-card flex flex-col md:flex-row md:items-end justify-between gap-6 reveal">
                <div className="space-y-3 max-w-2xl">
                  <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm" style={textStyle(s.filsTailleSurtitre)}>{(s.filsSurtitre as string) || t("En direct du parti")}</span>
                  <h2 className="bar-title text-4xl text-ecideDarkBlue" style={textStyle(s.filsTailleTitre)}>{(s.filsTitre as string) || ""}</h2>
                  <p className="text-lg text-gray-600" style={textStyle(s.filsTailleTexte)}>{(s.filsTexte as string) || ""}</p>
                </div>
                <div className="flex flex-wrap gap-3 md:shrink-0">
                  {fils.x && <a href={`https://x.com/${fils.x}`} target="_blank" rel="noopener" className="btn btn--dark btn--sm"><i className="fa-brands fa-x-twitter" aria-hidden="true"></i> @{fils.x}</a>}
                  {fils.facebook && <a href={safeUrl(fils.facebook)} target="_blank" rel="noopener" className="btn btn--sm bg-[#1877f2] text-white hover:bg-[#145dbf]"><i className="fa-brands fa-facebook" aria-hidden="true"></i> {nom} {t("Officiel")}</a>}
                </div>
              </div>
              <SocialEmbeds x={fils.x} facebook={fils.facebook} name={nom} />
              {s.filsNote && <p className="text-sm text-gray-500 text-center reveal font-sans" style={textStyle(s.filsTailleNote)}>{s.filsNote as string}</p>}
            </div>
          </section>
        )}

        {/* PRÈS DE CHEZ VOUS (téléphone : titre et sélecteurs ; texte d'introduction et aides sur ordinateur seulement) */}
        <section data-apercu="proximite" className="mob-band bg-ecideBlue-50 py-20 lg:py-32 px-6">
          <div className="mob-stack max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="mob-card lg:col-span-5 space-y-4 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm" style={textStyle(s.proximiteTailleSurtitre)}>{(s.proximiteSurtitre as string) || t("Près de chez vous")}</span>
              <h2 className="bar-title text-4xl text-ecideDarkBlue" style={textStyle(s.proximiteTailleTitre)}>{(s.proximiteTitre as string) || t("Trouvez votre secrétariat provincial")}</h2>
              <p className="mob-hide text-lg text-gray-700 leading-relaxed" style={textStyle(s.proximiteTailleTexte)}>{(s.proximiteTexte as string) || ""}</p>
            </div>
            <div className="mob-stack lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="bg-white p-6 block reveal border-t-4 border-ecideYellow">
                <span className="flex items-center gap-3 eyebrow eyebrow--dark mb-4">
                  <span className="icon-tile icon-tile--dark w-9 h-9 text-sm"><i className="fa-solid fa-map" aria-hidden="true"></i></span>
                  {(s.proximiteCarteProvince as string) || t("En RDC · ma province")}
                </span>
                <JumpSelect
                  label={t("Choisir une province")}
                  placeholder={t("Choisir une province…")}
                  options={proximite.provinces.map((prov) => ({ value: `${localePath(locale, "/cadres")}#niveau=provincial&province=${encodeURIComponent(prov)}`, label: prov }))}
                />
                <span className="mob-hide block text-xs text-gray-500 mt-3 font-sans" style={textStyle(s.proximiteTailleAide)}>{(s.proximiteAideProvince as string) || ""}</span>
              </label>
              <label className="bg-white p-6 block reveal border-t-4 border-ecideGreen">
                <span className="flex items-center gap-3 eyebrow eyebrow--dark mb-4">
                  <span className="icon-tile icon-tile--green w-9 h-9 text-sm"><i className="fa-solid fa-earth-africa" aria-hidden="true"></i></span>
                  {(s.proximiteCartePays as string) || t("À l'étranger · mon pays")}
                </span>
                <JumpSelect
                  label={t("Choisir un pays")}
                  placeholder={t("Choisir un pays…")}
                  options={[
                    ...proximite.pays.map((p) => ({ value: `${localePath(locale, "/diaspora")}#continent=${p.continent}&pays=${encodeURIComponent(p.nom)}`, label: p.nom })),
                    { value: `${localePath(locale, "/diaspora")}#rejoindre`, label: (s.proximiteAutrePays as string) || t("Mon pays n'est pas dans la liste") },
                  ]}
                />
                <span className="mob-hide block text-xs text-gray-500 mt-3 font-sans" style={textStyle(s.proximiteTailleAide)}>{(s.proximiteAidePays as string) || ""}</span>
              </label>
            </div>
          </div>
        </section>

        {/* AGIR : trois panneaux */}
        {agir.length > 0 && (
          <section data-apercu="agir" className="mob-band bg-white px-6 py-20 lg:py-32">
            <div className="max-w-7xl mx-auto space-y-12">
              <div className="space-y-3 reveal">
                <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm" style={textStyle(s.agirTailleSurtitre)}>{(s.agirSurtitre as string) || t("Agir")}</span>
                <h2 className="bar-title text-4xl lg:text-5xl text-ecideDarkBlue" style={textStyle(s.agirTailleTitre)}>{(s.agirTitre as string) || ""}</h2>
              </div>
              <div className={`grid grid-cols-1 ${agir.length === 1 ? "" : agir.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-6`}>
                {agir.map((a, i) => (
                  <div key={i} className="mob-card mob-card--from-dark bg-ecideDarkBlue text-white p-8 lg:p-10 min-h-72 flex flex-col gap-5 relative overflow-hidden reveal diag">
                    <span className="icon-tile icon-tile--yellow" aria-hidden="true"><i className={`fa-solid ${a.icone}`}></i></span>
                    <h3 className="text-2xl lg:text-3xl leading-tight" style={textStyle(s.agirTailleCarteTitre)}>{a.titre}</h3>
                    <p className="leading-relaxed text-blue-100 max-w-sm" style={textStyle(s.agirTailleCarteTexte)}>{a.texte}</p>
                    {a.bouton && <Link href={localePath(locale, a.url)} className="btn btn--primary self-start mt-auto" style={textStyle(s.agirTailleCarteBouton)}>{a.bouton}</Link>}
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
