"use client";

import Script from "next/script";
import { safeUrl } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

/** Fils X et Facebook officiels (page d'accueil et page Président). */
export default function SocialEmbeds({ x, facebook, name, height = 600 }: { x?: string; facebook?: string; name: string; height?: number }) {
  const { t, locale } = useI18n();
  const dataLang = locale === "en" ? "en" : "fr";
  // Facebook affiche son widget en anglais ou en swahili ; lingala, tshiluba et kikongo restent en français
  const fbLocale = locale === "en" ? "en_GB" : locale === "sw" ? "sw_KE" : "fr_FR";
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {x && (
        <article className="bg-white border border-gray-200 shadow-soft flex flex-col reveal">
          <header className="flex items-center justify-between gap-4 p-5 border-b border-gray-200">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 shrink-0 bg-gray-900 text-white flex items-center justify-center text-lg"><i className="fa-brands fa-x-twitter" aria-hidden="true"></i></span>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900">{name} {t("sur X")}</h3>
                <p className="text-sm text-gray-500 truncate">@{x}</p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-ecideGreen"><i className="fa-solid fa-circle-check mr-1" aria-hidden="true"></i>{t("Compte officiel")}</span>
          </header>
          <div className="social-embed flex-1">
            <a className="twitter-timeline" data-height={height} data-lang={dataLang} data-dnt="true" data-chrome="noheader nofooter noborders" href={`https://twitter.com/${x}?ref_src=twsrc%5Etfw`}>
              <span className="social-fallback">
                <i className="fa-brands fa-x-twitter text-4xl text-gray-300" aria-hidden="true"></i>
                <span>{t("Chargement des dernières publications…")}</span>
                <span className="text-sm text-gray-500">{t("Si le fil ne s'affiche pas, ouvrez le compte sur X.")}</span>
              </span>
            </a>
          </div>
          <Script src="https://platform.twitter.com/widgets.js" strategy="lazyOnload" />
        </article>
      )}
      {facebook && (
        <article className="bg-white border border-gray-200 shadow-soft flex flex-col reveal">
          <header className="flex items-center justify-between gap-4 p-5 border-b border-gray-200">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 shrink-0 bg-[#1877f2] text-white flex items-center justify-center text-lg"><i className="fa-brands fa-facebook-f" aria-hidden="true"></i></span>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900">{name} {t("sur Facebook")}</h3>
                <p className="text-sm text-gray-500 truncate">{facebook.replace(/^https?:\/\/(www\.)?/, "")}</p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-ecideGreen"><i className="fa-solid fa-circle-check mr-1" aria-hidden="true"></i>{t("Page officielle")}</span>
          </header>
          <div className="social-embed flex-1">
            <iframe
              title="Facebook"
              src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(facebook)}&tabs=timeline&width=500&height=${height}&small_header=true&adapt_container_width=true&hide_cover=true&show_facepile=false&locale=${fbLocale}`}
              width="100%"
              height={height}
              style={{ border: "none", overflow: "hidden" }}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            ></iframe>
            <a href={safeUrl(facebook)} target="_blank" rel="noopener" className="social-fallback social-fallback--behind">
              <i className="fa-brands fa-facebook text-4xl text-gray-300" aria-hidden="true"></i>
              <span>{t("Chargement des dernières publications…")}</span>
              <span className="text-sm text-gray-500">{t("Si le fil ne s'affiche pas, ouvrez la page sur Facebook.")}</span>
            </a>
          </div>
        </article>
      )}
    </div>
  );
}
