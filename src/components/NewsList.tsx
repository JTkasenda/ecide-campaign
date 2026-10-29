"use client";

import Link from "next/link";
import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import type { NewsItem } from "@/lib/types";
import { NewsMeta } from "./NewsCard";
import { VideoPlayer, WatchLink } from "./VideoPlayer";

/*
 * Page Actualités : le filtre par rubrique est partagé entre les onglets (en tête
 * de page), la une (masquée hors « Toutes ») et la liste paginée. Les sections
 * rendues par le serveur sont passées en enfants, jamais en propriétés.
 */
const FilterContext = createContext<{ filter: string; setFilter: (f: string) => void }>({ filter: "all", setFilter: () => {} });

export function NewsFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState("all");
  return <FilterContext.Provider value={{ filter, setFilter }}>{children}</FilterContext.Provider>;
}

/** Onglets par rubrique. */
export function NewsTabs({ categories, labels }: { categories: { key: string; label: string }[]; labels: { all: string; sections: string; declarations: string; communiques: string; presse: string; directs: string } }) {
  const { filter, setFilter } = useContext(FilterContext);
  const tabLabel: Record<string, string> = { declaration: labels.declarations, communique: labels.communiques, presse: labels.presse, direct: labels.directs };
  return (
    <nav className="flex gap-1 scroll-x -mb-px" aria-label={labels.sections}>
      <button type="button" onClick={() => setFilter("all")} className={`news-tab ${filter === "all" ? "is-active" : ""}`} aria-pressed={filter === "all"}>{labels.all}</button>
      {categories.map((c) => (
        <button type="button" key={c.key} onClick={() => setFilter(c.key)} className={`news-tab ${filter === c.key ? "is-active" : ""}`} aria-pressed={filter === c.key}>
          {tabLabel[c.key] || c.label}
        </button>
      ))}
    </nav>
  );
}

/** La une et ses deux articles : visibles uniquement sans filtre. */
export function FeaturedGate({ children }: { children: ReactNode }) {
  const { filter } = useContext(FilterContext);
  return filter === "all" ? <>{children}</> : null;
}

const PAGE_SIZE = 4;

interface FeedLabels {
  allPublications: string;
  publications: string;
  empty: string;
  emptyCategory: string;
  pagination: string;
  replayVideo: string;
}

/** Liste façon journal, filtrée et paginée côté client. */
export function NewsFeed({ locale, news, labels }: { locale: Locale; news: NewsItem[]; labels: FeedLabels }) {
  const { t } = useI18n();
  const { filter } = useContext(FilterContext);
  const [page, setPage] = useState(1);
  const [playing, setPlaying] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => news.filter((n) => filter === "all" || n.categorie.key === filter), [news, filter]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const goTo = (p: number) => {
    setPage(p);
    const top = (listRef.current?.getBoundingClientRect().top || 0) + window.scrollY - 90;
    window.scrollTo({ top, behavior: "smooth" });
  };
  const btn = (p: number, label: ReactNode, aria: string, disabled: boolean) => (
    <button type="button" onClick={() => goTo(p)} disabled={disabled} className="w-11 h-11 flex items-center justify-center border border-gray-300 font-display font-semibold hover:border-ecideDarkBlue disabled:opacity-40 disabled:hover:border-gray-300" aria-label={aria}>
      {label}
    </button>
  );

  return (
    <div className="lg:col-span-2 flex flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pb-4 border-b border-gray-200">
        <h2 className="text-3xl text-ecideDarkBlue rule-title">{labels.allPublications}</h2>
        <p className="text-sm text-gray-500 shrink-0"><span>{filtered.length}</span> {labels.publications}</p>
      </div>
      <div ref={listRef} className="divide-y divide-gray-200 flex-1">
        {news.length === 0 && <p className="py-16 text-center text-gray-500">{labels.empty}</p>}
        {news.length > 0 && filtered.length === 0 && <p className="py-16 text-center text-gray-500">{labels.emptyCategory}</p>}
        {visible.map((n) => (
          <article key={n.id} className={`news-row reveal is-visible${playing === n.id ? " is-playing" : ""}`}>
            {n.embed ? (
              <div className={playing === n.id ? "sm:col-span-2" : ""}>
                <VideoPlayer embed={n.embed} title={n.titre} poster={n.image} duree={n.duree} label={t("Lire la vidéo :")} onPlay={() => setPlaying(n.id)} className={playing === n.id ? "" : "news-thumb"} compact={playing !== n.id} watch={{ url: n.lienVideo, plateforme: n.plateforme }} />
              </div>
            ) : (
              <Link href={localePath(locale, n.url)} className={`news-thumb ${n.categorie.bg} relative`}>
                {n.image ? <img src={n.image} alt="" loading="lazy" className="w-full h-full object-cover" /> : <i className={`${n.categorie.icon} text-3xl ${n.categorie.muted}`} aria-hidden="true"></i>}
                {n.duree && <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] font-bold px-1.5 py-0.5">{n.duree}</span>}
              </Link>
            )}
            <div className="min-w-0 space-y-2">
              <NewsMeta n={n} />
              <h3 className="text-2xl text-gray-900 leading-tight"><Link href={localePath(locale, n.url)} className="hover:text-ecideBlue">{n.titre}</Link></h3>
              <p className="text-gray-600">{n.resume}</p>
              <p className="text-sm text-gray-500">
                {n.video ? (
                  <>
                    <i className={`${n.embed?.provider === "youtube" ? "fa-brands fa-youtube text-red-600" : n.embed?.provider === "facebook" ? "fa-brands fa-facebook text-[#1877f2]" : "fa-solid fa-video text-ecideBlue"} mr-1`} aria-hidden="true"></i>
                    {labels.replayVideo} ·{" "}
                    {n.lienVideo && playing !== n.id && (
                      <>
                        <WatchLink url={n.lienVideo} plateforme={n.plateforme} /> ·{" "}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <i className="fa-regular fa-clock mr-1" aria-hidden="true"></i>
                    {n.lecture ? `${n.lecture} · ` : ""}
                  </>
                )}
                {n.auteur}
              </p>
            </div>
          </article>
        ))}
      </div>
      {filtered.length > 0 && (
        <nav className="flex flex-wrap items-center justify-between gap-4 pt-8 border-t border-gray-200 mt-auto" aria-label={labels.pagination}>
          <span className="text-sm text-gray-500">
            {pages > 1 ? t("Page :page sur :pages · :n publications", { page: current, pages, n: filtered.length }) : t(filtered.length > 1 ? ":n publications" : ":n publication", { n: filtered.length })}
          </span>
          {pages > 1 && (
            <div className="flex items-center gap-1">
              {btn(current - 1, <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true"></i>, t("Page précédente"), current === 1)}
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) =>
                p === current ? (
                  <span key={p} className="w-11 h-11 flex items-center justify-center bg-ecideDarkBlue text-white font-display font-semibold" aria-current="page">{p}</span>
                ) : (
                  <span key={p}>{btn(p, p, t("Page :page", { page: p }), false)}</span>
                ),
              )}
              {btn(current + 1, <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>, t("Page suivante"), current === pages)}
            </div>
          )}
        </nav>
      )}
    </div>
  );
}
