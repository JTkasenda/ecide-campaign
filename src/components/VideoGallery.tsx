"use client";

import Link from "next/link";
import { useState } from "react";
import { safeUrl } from "@/lib/format";
import type { Video } from "@/lib/types";
import { VideoPlayer, WatchLink } from "./VideoPlayer";

const VID_TINT = ["bg-ecideYellow-50 text-ecideYellow-700", "bg-ecideGreen-50 text-ecideGreen", "bg-ecideBlue-50 text-ecideBlue"];
const TYPE_TINT: Record<string, string> = { Discours: "text-ecideBlue", Meeting: "text-ecideYellow-700", Interview: "text-ecideGreen", Direct: "text-red-600" };

/** Galerie « Discours & vidéos » : un lecteur principal, les autres vidéos s'y chargent au clic. */
export function VideoGallery({ videos, labels, newsUrl }: { videos: Video[]; labels: { lire: string; latest: string; allLives: string; lives: string; inNews: string }; newsUrl: string }) {
  const [current, setCurrent] = useState(0);
  const main = videos[current] || videos[0];
  if (!main) return null;
  const others = videos.map((v, i) => ({ v, i })).filter(({ i }) => i !== current);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <article className="lg:col-span-2 reveal">
        {main.embed ? (
          <VideoPlayer key={main.id || current} embed={main.embed} title={main.titre} duree={main.duree} badge={current === 0 ? labels.latest : main.typeLabel} label={labels.lire} immediate={current !== 0} watch={{ url: main.lien, plateforme: main.plateforme }} />
        ) : (
          <a href={safeUrl(main.url || "#")} target="_blank" rel="noopener" className="relative bg-ecideBlue-50 aspect-video flex items-center justify-center group" aria-label={`${labels.lire} ${main.titre}`}>
            <span className="w-20 h-20 rounded-full bg-white/90 text-ecideBlue flex items-center justify-center text-3xl group-hover:scale-110 transition"><i className="fa-solid fa-play ml-1" aria-hidden="true"></i></span>
            <span className="absolute top-4 left-4 pill pill--yellow">{current === 0 ? labels.latest : main.typeLabel}</span>
            {main.duree && <span className="absolute bottom-4 right-4 bg-black/60 text-white text-xs font-bold px-2 py-1">{main.duree}</span>}
          </a>
        )}
        <div className="pt-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest">
            <span className={TYPE_TINT[main.type] || "text-ecideBlue"}>{main.typeLabel}</span>
            <span className="text-gray-400 mx-2" aria-hidden="true">•</span>
            <span className="text-gray-500 normal-case tracking-normal font-semibold">{main.lieu}{main.date ? ` · ${main.dateLabel}` : ""}</span>
          </p>
          <h3 className="text-3xl text-gray-900 leading-tight">
            {main.embed ? main.titre : <a href={safeUrl(main.url || "#")} target="_blank" rel="noopener" className="hover:text-ecideBlue">{main.titre}</a>}
          </h3>
          {!main.embed && main.lien && <WatchLink url={main.lien} plateforme={main.plateforme} className="text-sm" />}
        </div>
      </article>
      <div className="flex flex-col divide-y divide-gray-200 lg:border-l lg:border-gray-200 lg:pl-8">
        {others.map(({ v, i }) => {
          const thumb = (
            <>
              <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center"><i className="fa-solid fa-play ml-0.5 text-sm" aria-hidden="true"></i></span>
              {v.duree && <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">{v.duree}</span>}
            </>
          );
          const cls = `relative w-36 h-24 shrink-0 ${VID_TINT[i % 3]} flex items-center justify-center`;
          return (
            <article key={v.id || i} className="flex gap-4 py-5 first:pt-0 reveal">
              {v.embed ? (
                <button type="button" onClick={() => setCurrent(i)} className={cls} aria-label={`${labels.lire} ${v.titre}`}>{thumb}</button>
              ) : (
                <a href={safeUrl(v.url || "#")} target="_blank" rel="noopener" className={cls} aria-label={`${labels.lire} ${v.titre}`}>{thumb}</a>
              )}
              <div className="min-w-0">
                <p className={`text-[11px] font-bold uppercase tracking-widest ${TYPE_TINT[v.type] || "text-ecideBlue"}`}>{v.typeLabel}</p>
                <h3 className="text-lg text-gray-900 leading-tight mt-1">
                  {v.embed ? <button type="button" onClick={() => setCurrent(i)} className="text-left hover:text-ecideBlue">{v.titre}</button> : <a href={safeUrl(v.url || "#")} target="_blank" rel="noopener" className="hover:text-ecideBlue">{v.titre}</a>}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{v.lieu}{v.date ? ` · ${v.dateLabel}` : ""}</p>
              </div>
            </article>
          );
        })}
        <article className="flex gap-4 py-5 reveal">
          <Link href={newsUrl} className="relative w-36 h-24 shrink-0 bg-gray-100 flex items-center justify-center" aria-label={labels.allLives}><i className="fa-solid fa-tower-broadcast text-2xl text-gray-400" aria-hidden="true"></i></Link>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{labels.lives}</p>
            <h3 className="text-lg text-gray-900 leading-tight mt-1"><Link href={newsUrl} className="hover:text-ecideBlue">{labels.allLives}</Link></h3>
            <p className="text-sm text-gray-500 mt-1">{labels.inNews}</p>
          </div>
        </article>
      </div>
    </div>
  );
}
