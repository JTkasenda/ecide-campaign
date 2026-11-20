import Link from "next/link";
import { localePath, type Locale } from "@/lib/locales";
import type { NewsItem } from "@/lib/types";

/** Vignette d'une actualité (image ou icône de catégorie). */
export function NewsThumb({ n, className, iconSize = "text-3xl", direct = false, badge }: { n: NewsItem; className: string; iconSize?: string; direct?: boolean; badge?: string }) {
  const c = n.categorie;
  return (
    <>
      {n.image ? (
        <img src={n.image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover object-[50%_25%]" />
      ) : direct ? (
        <span className="w-14 h-14 rounded-full bg-white/90 text-gray-600 flex items-center justify-center text-xl"><i className="fa-solid fa-play ml-0.5" aria-hidden="true"></i></span>
      ) : (
        <i className={`${c.icon} ${iconSize} ${c.muted}`} aria-hidden="true"></i>
      )}
      {badge && <span className="absolute top-3 left-3 pill pill--red">{badge}</span>}
      {n.duree && <span className={`absolute bottom-2 right-2 bg-black/60 text-white text-[11px] font-bold px-1.5 py-0.5 ${className}`}>{n.duree}</span>}
    </>
  );
}

/** Étiquette catégorie • date. */
export function NewsMeta({ n, size = "text-xs" }: { n: NewsItem; size?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${size} font-bold uppercase tracking-widest`}>
      <span className={n.categorie.text}>{n.categorie.label}</span>
      <span className="text-gray-400" aria-hidden="true">•</span>
      <time className="text-gray-500 normal-case tracking-normal font-semibold" dateTime={n.date}>{n.dateLabel}</time>
    </p>
  );
}

/** Carte compacte « À lire aussi ». */
export function RelatedCard({ n, locale }: { n: NewsItem; locale: Locale }) {
  const c = n.categorie;
  return (
    <article className="panel panel--white overflow-hidden transition reveal">
      {/* Téléphone et tablette : la vignette sans photo (simple icône de rubrique) est masquée */}
      <div className={`relative h-40 overflow-hidden ${c.bg} flex items-center justify-center${n.image ? "" : " mob-hide"}`}>
        {n.image ? <img src={n.image} alt="" loading="lazy" className="w-full h-full object-cover" /> : <i className={`${c.icon} text-4xl ${c.muted}`} aria-hidden="true"></i>}
        {n.duree && <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">{n.duree}</span>}
      </div>
      <div className="p-6 space-y-2">
        <span className={`text-xs font-bold ${c.text} uppercase tracking-widest`}>{c.label}</span>
        <h3 className="text-2xl text-gray-900 leading-tight">
          <Link href={localePath(locale, n.url)} className="hover:text-ecideBlue">{n.titre}</Link>
        </h3>
      </div>
    </article>
  );
}
