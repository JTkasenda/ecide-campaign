import type { Metadata } from "next";
import Link from "next/link";
import { VideoPlayer, WatchLink } from "@/components/VideoPlayer";
import { getActualites } from "@/lib/api";
import { pad2, safeUrl } from "@/lib/format";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import { NewsMeta, NewsThumb } from "@/components/NewsCard";
import { FeaturedGate, NewsFeed, NewsFilterProvider, NewsTabs } from "@/components/NewsList";
import NewsletterForm from "@/components/NewsletterForm";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getActualites(locale)]);
  return pageMetadata(locale, "/actualites", { title: t("Actualités"), description: data.page.sousTitre });
}

export default async function ActualitesPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getActualites(locale), getT(locale)]);
  const { page: ap, edition, featured, side, news, video, positions, socials } = data;
  const presidentUrl = `${localePath(locale, "/president")}#discours`;

  return (
    <main id="main" className="flex-grow">
      <NewsFilterProvider>
        {/* MANCHETTE */}
        <section className="bg-ecideDarkBlue text-white diag">
          <div className="max-w-7xl mx-auto px-6 pt-16 pb-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 mb-2 border-b border-white/20">
              <div className="space-y-3">
                <p className="eyebrow">
                  <i className="fa-regular fa-calendar mr-2" aria-hidden="true"></i>
                  {t("Édition du")} <time dateTime={edition.date}>{edition.dateLabel}</time> · {ap.signature || "Communication ECiDé"}
                </p>
                <h1 className="text-5xl lg:text-6xl leading-none text-white">{t("Actualités")}</h1>
                <p className="text-lg text-blue-100">{ap.sousTitre || ""}</p>
              </div>
              <a href="#canaux" className="arrow-link arrow-link--light"><i className="fa-solid fa-circle-check text-ecideGreen" aria-hidden="true"></i>{t("Seuls nos canaux officiels font foi")}</a>
            </div>
            <NewsTabs categories={data.categories} labels={{ all: t("Toutes"), sections: t("Rubriques"), declarations: t("Déclarations"), communiques: t("Communiqués"), presse: t("Revue de presse"), directs: t("Directs & replays") }} />
          </div>
        </section>

        {/* À LA UNE */}
        {featured && (
          <FeaturedGate>
            <section className="max-w-7xl mx-auto px-6 py-16">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <article className="lg:col-span-2 group reveal">
                  <Link href={localePath(locale, featured.url)} className="block">
                    <div className={`relative ${featured.categorie.bg} h-64 md:h-96 flex items-center justify-center overflow-hidden`}>
                      {featured.image ? <img src={featured.image} alt="" className="w-full h-full object-cover object-[50%_25%]" /> : <i className={`${featured.categorie.icon} text-8xl ${featured.categorie.muted}`} aria-hidden="true"></i>}
                      <span className="absolute top-5 left-5 pill pill--yellow">{t("À la une")}</span>
                    </div>
                  </Link>
                  <div className="pt-6 space-y-4">
                    <NewsMeta n={featured} />
                    <h2 className="text-3xl lg:text-4xl text-gray-900 normal-case font-bold tracking-tight leading-tight"><Link href={localePath(locale, featured.url)} className="hover:text-ecideBlue">{featured.titre}</Link></h2>
                    <p className="text-xl text-gray-600 leading-relaxed max-w-3xl">{featured.resume}</p>
                    <p className="text-sm text-gray-500"><i className="fa-regular fa-clock mr-1" aria-hidden="true"></i>{featured.lecture ? `${featured.lecture} ${t("de lecture")} · ` : ""}{featured.auteur}</p>
                  </div>
                </article>
                <div className="flex flex-col gap-10 lg:border-l lg:border-gray-200 lg:pl-8">
                  {side.map((n, i) => {
                    const direct = n.categorie.key === "direct";
                    return (
                      <article key={n.id} className={`group reveal ${i === 0 ? "" : "border-t border-gray-200 pt-8"}`}>
                        <Link href={localePath(locale, n.url)} className={`relative block ${n.categorie.bg} h-40 flex items-center justify-center overflow-hidden`}>
                          <NewsThumb n={n} className="bottom-3 right-3 text-xs px-2 py-1" iconSize="text-4xl" direct={direct} badge={direct ? t("Replay") : undefined} />
                        </Link>
                        <div className="pt-4 space-y-2">
                          <NewsMeta n={n} />
                          <h3 className="text-2xl text-gray-900 leading-tight"><Link href={localePath(locale, n.url)} className="hover:text-ecideBlue">{n.titre}</Link></h3>
                          <p className="text-gray-600">{n.resume}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          </FeaturedGate>
        )}

        {/* FLUX + COLONNE LATÉRALE */}
        <section className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-16">
            <NewsFeed locale={locale} news={news} labels={{ allPublications: t("Toutes les publications"), publications: t("publications"), empty: t("Aucune publication pour le moment."), emptyCategory: t("Aucune publication dans cette rubrique pour le moment."), pagination: t("Pagination"), replayVideo: t("Replay vidéo") }} />
            <aside className="news-aside space-y-12 lg:border-l lg:border-gray-200 lg:pl-10">
              {video && (
                <section className="reveal">
                  <h2 className="text-2xl text-ecideDarkBlue rule-title">{t("Directs & vidéos")}</h2>
                  {video.embed ? (
                    <div className="mt-4"><VideoPlayer embed={video.embed} title={video.titre} duree={video.duree} badge={video.typeLabel || t("Vidéo")} label={t("Lire la vidéo :")} watch={{ url: video.lien, plateforme: video.plateforme, here: t("Ici ou sur la plateforme") }} /></div>
                  ) : video.lien ? (
                    <a href={safeUrl(video.lien)} target="_blank" rel="noopener" className="relative block bg-ecideBlue-50 h-44 mt-4 flex items-center justify-center" aria-label={`${t("Lire la vidéo :")} ${video.titre}`}>
                      <span className="w-14 h-14 rounded-full bg-white/90 text-ecideBlue flex items-center justify-center text-xl"><i className="fa-solid fa-play ml-0.5" aria-hidden="true"></i></span>
                      <span className="absolute top-3 left-3 pill">{video.typeLabel || t("Vidéo")}</span>
                      {video.duree && <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-2 py-1">{video.duree}</span>}
                    </a>
                  ) : (
                    <div className="relative bg-ecideBlue-50 h-44 mt-4 flex items-center justify-center">
                      <span className="w-14 h-14 rounded-full bg-white/70 text-gray-400 flex items-center justify-center text-xl"><i className="fa-solid fa-video-slash" aria-hidden="true"></i></span>
                      <span className="absolute top-3 left-3 pill">{t("Vidéo à venir")}</span>
                    </div>
                  )}
                  <h3 className="text-lg text-gray-900 mt-4 leading-tight"><Link href={presidentUrl} className="hover:text-ecideBlue">{video.titre}</Link></h3>
                  {!video.embed && video.lien && <WatchLink url={video.lien} plateforme={video.plateforme} className="text-sm mt-2" />}
                  <p className="text-sm text-gray-500 mt-1">{video.lieu}{video.date ? ` · ${video.dateLabel}` : ""}</p>
                  <Link href={presidentUrl} className="arrow-link mt-4">{t("Tous les discours & vidéos")}</Link>
                </section>
              )}
              {data.newsletter && (
                <NewsletterForm
                  variant="aside"
                  description={t("Les déclarations officielles dans votre boîte mail, dès leur publication.")}
                  labels={{ title: t("Recevoir les communiqués"), placeholder: t("Votre e-mail"), submit: t("S'abonner"), success: t("Merci ! Vous recevrez nos communiqués officiels."), name: t("Votre prénom (facultatif)"), note: t("Nous personnalisons chaque envoi : vos communiqués arrivent dans la langue de cette page.") }}
                />
              )}
            </aside>
          </div>
        </section>
      </NewsFilterProvider>

      {/* POSITIONS & CANAUX */}
      <section className="bg-ecideBlue-50">
        <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-16">
          <section className="reveal">
            <h2 className="text-2xl text-ecideDarkBlue rule-title">{t("Positions officielles")}</h2>
            <ol className="mt-4 space-y-4">
              {positions.map((pos, i) => (
                <li key={i} className="flex gap-4">
                  <span className="font-display text-3xl text-ecideBlue leading-none w-10 shrink-0">{pad2(i + 1)}</span>
                  <div>
                    <p className="font-bold text-gray-900">{pos.titre}</p>
                    <p className="text-sm text-gray-500">{pos.texte}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href={`${localePath(locale, "/parti")}#valeurs`} className="arrow-link mt-4">{t("Notre charte")}</Link>
          </section>
          <section id="canaux" className="reveal">
            <h2 className="text-2xl text-ecideDarkBlue rule-title">{t("Canaux officiels")}</h2>
            <p className="text-sm text-gray-600 mt-3">{ap.canauxTexte || ""}</p>
            <ul className="mt-4 divide-y divide-gray-200">
              {socials.length === 0 && <li className="py-3 text-sm text-gray-500">{t("Les canaux officiels seront annoncés prochainement.")}</li>}
              {socials.map((s) => {
                const sub = s.icon === "fa-youtube" ? ap.youtubeLibelle || t("Directs & discours") : s.icon === "fa-whatsapp" ? ap.whatsappLibelle || t("Communiqués instantanés") : s.handle;
                const col = s.icon === "fa-facebook" ? "text-[#1877f2]" : s.icon === "fa-youtube" ? "text-red-600" : s.icon === "fa-whatsapp" ? "text-ecideGreen" : "text-gray-900";
                return (
                  <li key={s.key}>
                    <a href={safeUrl(s.url)} target="_blank" rel="noopener" className="flex items-center gap-3 py-3 hover:text-ecideBlue">
                      <i className={`fa-brands ${s.icon} w-6 ${col}`} aria-hidden="true"></i>
                      <span className="font-bold">{s.label}</span>
                      <span className="ml-auto text-xs text-gray-500">{sub}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
