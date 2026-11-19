import type { Metadata } from "next";
import Link from "next/link";
import { VideoPlayer, WatchLink } from "@/components/VideoPlayer";
import { notFound } from "next/navigation";
import { getArticle } from "@/lib/api";
import { safeUrl } from "@/lib/format";
import { isLocale, localePath } from "@/lib/locales";
import type { ArticleParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import { RelatedCard } from "@/components/NewsCard";
import ShareButtons from "@/components/ShareButtons";

export async function generateMetadata({ params }: ArticleParams): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const data = await getArticle(locale, slug);
  if (!data) return {};
  const a = data.article;
  return pageMetadata(locale, `/actualites/${a.slug}`, { title: a.seoTitre || a.titre, description: a.seoDesc || a.resume, image: a.image || undefined, type: "article", article: { publishedTime: a.date || undefined, author: a.auteur, section: a.categorie?.label } });
}

export default async function ArticlePage({ params }: ArticleParams) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [data, t] = await Promise.all([getArticle(locale, slug), getT(locale)]);
  if (!data) notFound();
  const { article, related } = data;
  const cat = article.categorie;
  const hasBody = article.contenu.replace(/<[^>]*>/g, "").trim() !== "";

  return (
    <main id="main" className="flex-grow">
      <div className="bg-ecideDarkBlue text-blue-200 px-6 py-4">
        <nav className="max-w-4xl mx-auto text-sm font-sans flex flex-wrap items-center gap-2" aria-label={t("Fil d'Ariane")}>
          <Link href={localePath(locale, "/")} className="hover:text-white">{t("Accueil")}</Link>
          <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>
          <Link href={localePath(locale, "/actualites")} className="hover:text-white">{t("Actualités")}</Link>
          <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>
          <span className="text-white" aria-current="page">{article.titre}</span>
        </nav>
      </div>

      <article className="py-20 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          <header className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-widest">
              <span className="pill">{cat.long}</span>
              <time className="text-gray-500" dateTime={article.date}>{article.dateLabel}</time>
              {article.auteur && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{article.auteur}</span>
                </>
              )}
              {article.lecture && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500 normal-case tracking-normal"><i className="fa-regular fa-clock mr-1" aria-hidden="true"></i>{article.lecture} {t("de lecture")}</span>
                </>
              )}
            </div>
            <h1 className="text-4xl md:text-6xl text-ecideDarkBlue leading-none rule-title">{article.titre}</h1>
            {article.resume && <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">{article.resume}</p>}
          </header>

          {article.embed ? (
            <figure className="shadow-card">
              <VideoPlayer embed={article.embed} title={article.titre} poster={article.image} duree={article.duree} immediate label={t("Lire la vidéo :")} watch={{ url: article.lienVideo, plateforme: article.plateforme }} className="bg-white" />
              {article.legende && <figcaption className="bg-white border border-gray-200 border-t-0 px-5 py-3 text-sm text-gray-500">{article.legende}</figcaption>}
            </figure>
          ) : article.video ? (
            <a href={safeUrl(article.video)} target="_blank" rel="noopener" className={`relative block ${cat.bg} h-72 md:h-96 shadow-card group`} aria-label={`${t("Lire la vidéo :")} ${article.titre}`}>
              {article.image && <img src={article.image} alt="" className="absolute inset-0 w-full h-full object-cover object-[50%_25%]" />}
              <span className="absolute inset-0 flex items-center justify-center"><span className="w-20 h-20 rounded-full bg-white/90 text-ecideBlue flex items-center justify-center text-3xl group-hover:scale-110 transition"><i className="fa-solid fa-play ml-1" aria-hidden="true"></i></span></span>
            </a>
          ) : article.image ? (
            <figure className="shadow-card">
              <img src={article.image} alt="" fetchPriority="high" decoding="async" className="w-full h-72 md:h-96 object-cover object-[50%_25%]" />
              {article.legende && <figcaption className="bg-white border border-gray-200 border-t-0 px-5 py-3 text-sm text-gray-500">{article.legende}</figcaption>}
            </figure>
          ) : (
            <div className={`${cat.bg} h-72 md:h-96 flex items-center justify-center shadow-card`}><i className={`${cat.icon} text-8xl ${cat.muted}`} aria-hidden="true"></i></div>
          )}

          {!article.embed && article.lienVideo && <WatchLink url={article.lienVideo} plateforme={article.plateforme} className="text-sm" />}

          <div className="prose-lg space-y-6 text-gray-700 text-lg leading-relaxed">
            {hasBody ? (
              <div dangerouslySetInnerHTML={{ __html: article.contenu }} />
            ) : (
              <>
                <p>{article.resume}</p>
                <p className="text-sm text-gray-500 italic">{t("Le texte complet sera publié prochainement.")}</p>
              </>
            )}
          </div>

          <ShareButtons title={article.titre} />

          <Link href={localePath(locale, "/actualites")} className="arrow-link">{t("Retour aux actualités")}</Link>
        </div>
      </article>

      {related.length > 0 && (
        <section className="bg-ecideBlue-50 py-28 px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            <h2 className="text-4xl text-ecideDarkBlue reveal">{t("À lire aussi")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {related.map((n) => (
                <RelatedCard key={n.id} n={n} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
