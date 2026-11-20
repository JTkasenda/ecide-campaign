"use client";

import { useState } from "react";
import { safeUrl } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Plateforme, VideoEmbed } from "@/lib/types";

/** Libellé et icône du lien « regarder sur la plateforme ». */
export function watchLabel(plateforme: Plateforme | null, t: (s: string) => string): { label: string; icon: string; color: string } {
  switch (plateforme) {
    case "youtube": return { label: t("Regarder sur YouTube"), icon: "fa-brands fa-youtube", color: "text-red-600" };
    case "facebook": return { label: t("Regarder sur Facebook"), icon: "fa-brands fa-facebook", color: "text-[#1877f2]" };
    case "vimeo": return { label: t("Regarder sur Vimeo"), icon: "fa-brands fa-vimeo-v", color: "text-[#1ab7ea]" };
    case "dailymotion": return { label: t("Regarder sur Dailymotion"), icon: "fa-solid fa-play", color: "text-ecideBlue" };
    default: return { label: t("Ouvrir la vidéo"), icon: "fa-solid fa-arrow-up-right-from-square", color: "text-ecideBlue" };
  }
}

/** Lien externe « Regarder sur YouTube » (ou autre plateforme). */
export function WatchLink({ url, plateforme, className = "" }: { url: string; plateforme: Plateforme | null; className?: string }) {
  const { t } = useI18n();
  if (!url) return null;
  const w = watchLabel(plateforme, t);
  return (
    <a href={safeUrl(url)} target="_blank" rel="noopener" className={`inline-flex items-center gap-2 font-bold text-ecideBlue hover:text-ecideDarkBlue ${className}`}>
      <i className={`${w.icon} ${w.color}`} aria-hidden="true"></i>
      {w.label}
      <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-gray-400" aria-hidden="true"></i>
    </a>
  );
}

/*
 * Lecteur vidéo du site : YouTube, Facebook, Vimeo et Dailymotion en iframe, fichiers
 * téléversés (MP4, WebM…) en <video>. Par défaut, une vignette avec bouton « lecture »
 * est affichée et le lecteur n'est chargé qu'au clic (pages plus légères, pas de
 * requête vers les plateformes avant que le visiteur ne le décide). `immediate` charge
 * le lecteur tout de suite (page d'un article).
 */
const ALLOW = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";

function withAutoplay(embed: VideoEmbed, autoplay: boolean): string {
  if (!autoplay) return embed.src;
  const sep = embed.src.includes("?") ? "&" : "?";
  if (embed.provider === "facebook") return `${embed.src}${sep}autoplay=true`;
  if (embed.provider === "dailymotion") return `${embed.src}${sep}autoplay=1&mute=0`;
  return `${embed.src}${sep}autoplay=1`;
}

export function VideoPlayer({
  embed,
  title,
  poster = "",
  duree = "",
  badge = "",
  label = "",
  immediate = false,
  compact = false,
  className = "",
  onPlay,
  watch,
}: {
  embed: VideoEmbed;
  title: string;
  /** Image de vignette (image de l'article) ; sans elle, un fond de couleur */
  poster?: string;
  duree?: string;
  /** Petit libellé en haut à gauche de la vignette (type de vidéo) */
  badge?: string;
  /** Préfixe du libellé accessible du bouton, ex. « Lire la vidéo : » */
  label?: string;
  immediate?: boolean;
  /** Vignette réduite (liste des actualités) : bouton plus petit */
  compact?: boolean;
  className?: string;
  onPlay?: () => void;
  /** Lien « regarder sur la plateforme », affiché sous le lecteur avec la mention « ici ou sur la plateforme » */
  watch?: { url: string; plateforme: Plateforme | null; here?: string };
}) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(immediate);
  const strip = watch && watch.url && !compact ? (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-gray-500 pt-2">
      <span><i className="fa-solid fa-circle-play text-ecideBlue mr-1.5" aria-hidden="true"></i>{watch.here || t("Regardez la vidéo ici ou sur la plateforme.")}</span>
      <WatchLink url={watch.url} plateforme={watch.plateforme} />
    </div>
  ) : null;

  if (playing) {
    return (
      <div className={className}>
      <div className="relative aspect-video bg-black overflow-hidden" data-video={embed.provider}>
        {embed.provider === "file" ? (
          <video className="absolute inset-0 w-full h-full" src={embed.src} poster={poster || undefined} controls autoPlay={!immediate} playsInline preload="metadata" title={title}>
            <a href={embed.src}>{title}</a>
          </video>
        ) : (
          <iframe className="absolute inset-0 w-full h-full" src={withAutoplay(embed, !immediate)} title={title} loading={immediate ? "eager" : "lazy"} allow={ALLOW} allowFullScreen referrerPolicy="strict-origin-when-cross-origin"></iframe>
        )}
      </div>
      {strip}
      </div>
    );
  }

  return (
    <div className={compact ? "contents" : ""}>
    <button
      type="button"
      onClick={() => {
        setPlaying(true);
        onPlay?.();
      }}
      className={`group relative block w-full ${compact ? "" : "aspect-video"} bg-ecideBlue-50 overflow-hidden text-left ${compact ? className : ""}`}
      aria-label={`${label} ${title}`.trim()}
      data-video={embed.provider}
    >
      {poster ? <img src={poster} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" /> : <span className="absolute inset-0 bg-gradient-to-br from-ecideBlue-100 to-ecideBlue-50" aria-hidden="true"></span>}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className={`${compact ? "w-11 h-11 text-base" : "video-play w-16 h-16 md:w-20 md:h-20 text-2xl md:text-3xl"} rounded-full bg-white/90 text-ecideBlue flex items-center justify-center shadow-card group-hover:scale-110 transition`}>
          <i className="fa-solid fa-play ml-0.5" aria-hidden="true"></i>
        </span>
      </span>
      {badge && <span className="absolute top-3 left-3 pill">{badge}</span>}
      {duree && <span className={`absolute ${compact ? "bottom-2 right-2 text-[11px] px-1.5 py-0.5" : "bottom-3 right-3 text-xs px-2 py-1"} bg-black/60 text-white font-bold`}>{duree}</span>}
    </button>
    {strip}
    </div>
  );
}
