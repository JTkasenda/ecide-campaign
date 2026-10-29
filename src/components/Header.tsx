"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { isLocale, localePath, switchLocale, type Locale } from "@/lib/locales";
import { siteNav } from "@/lib/nav";
import type { Site } from "@/lib/types";

/**
 * En-tête façon site de campagne : bandeau bleu nuit, logo à gauche, boutons « Adhérer » et
 * « Faire un don » à droite, et un bouton de menu (hamburger) à toutes les largeurs et sur toutes
 * les pages, qui ouvre un panneau minimaliste : les pages principales seulement. Les pages sont aussi listées sur l'accueil
 * (section « Explorer le site ») et dans le pied de page.
 */
export default function Header({ site, locale }: { site: Site; locale: Locale }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const p = site.params;
  // Menu minimaliste : les pages principales seulement ; les sous-pages (organigramme, charte, projet,
  // biographie) restent accessibles depuis leur page parente, le pied de page et les cartes de l'accueil
  const nav = siteNav(site, t).filter((n) => n.key !== "home" && !n.sub);
  const donUrl = p.don || `${localePath(locale, "/adherer")}#don`;
  const donExternal = /^https?:/i.test(donUrl);

  // Clé de la page courante (home, parti, actualites…) pour marquer le lien actif
  const parts = pathname.split("/").filter(Boolean);
  if (isLocale(parts[0])) parts.shift();
  const current = parts[0] || "home";
  const path = "/" + parts.join("/");
  // Une sous-page (ex. /president/biographie) marque sa propre entrée, pas celle de sa page parente
  const exact = nav.find((n) => n.url === path);
  const isActive = (n: { key: string; url: string }) => (exact ? n === exact : n.key === current);

  // Fermeture du panneau : touche Échap, clic en dehors, changement de page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (open && menuRef.current && !menuRef.current.contains(el) && !el.closest("[aria-controls=mobileMenu]")) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  const changeLang = (code: string) => {
    if (!isLocale(code) || code === locale) return;
    try {
      localStorage.setItem("ecide-lang", code);
    } catch {}
    router.push(switchLocale(pathname, code));
  };

  const langSelect = (id: string, className: string) => (
    <select id={id} value={locale} onChange={(e) => changeLang(e.target.value)} className={className} aria-label={t("Choisir la langue")}>
      {site.languages.map((l) => (
        <option key={l.code} value={l.code}>
          {l.nom}
        </option>
      ))}
    </select>
  );

  const donLink = (className: string) =>
    donExternal ? (
      <a href={donUrl} target="_blank" rel="noopener" className={className} onClick={() => setOpen(false)}>
        {t("Faire un don")}
      </a>
    ) : (
      <Link href={donUrl} className={className} onClick={() => setOpen(false)}>
        {t("Faire un don")}
      </Link>
    );

  return (
    <header className="site-header bg-ecideDarkBlue text-white sticky top-0 z-40">
      <nav aria-label={t("Navigation principale")}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center gap-6 h-16 xl:h-20">
          <Link href={localePath(locale, "/")} className="flex items-center gap-3 min-w-0 shrink" aria-label={`${p.nom || "ECiDé"}, ${t("retour à l'accueil")}`}>
            <img src="/assets/img/logo-160.png" alt="" width={44} height={44} className="w-11 h-11 shrink-0 rounded-full" />
            <span className="min-w-0 leading-none">
              <span className="font-display font-black text-2xl block leading-none truncate">{p.nom || "ECiDé"}</span>
              <span className="eyebrow text-[9px] tracking-[0.3em] mt-1 hidden sm:block truncate">{p.slogan || "C'est possible"}</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0 max-w-[calc(100%-3.5rem)] sm:max-w-none">
            <label className="lang-switch hidden sm:flex items-center gap-2 text-blue-100 hover:text-white px-2 py-1.5 text-[11px] font-sans font-bold tracking-widest relative cursor-pointer transition">
              <i className="fa-solid fa-globe" aria-hidden="true"></i>
              <span>{locale.toUpperCase()}</span>
              <i className="fa-solid fa-chevron-down text-[9px] text-blue-300" aria-hidden="true"></i>
              {langSelect("langSelect", "absolute inset-0 w-full h-full opacity-0 cursor-pointer")}
            </label>
            <Link href={localePath(locale, site.cta.url)} className="btn btn--outline-white btn--sm min-w-0 hidden md:inline-flex">
              <span className="truncate">{site.cta.label}</span>
            </Link>
            {donLink("btn btn--primary btn--sm min-w-0")}
            <button type="button" onClick={() => setOpen(!open)} className="text-white text-2xl p-1 ml-1 shrink-0" aria-label={t("Ouvrir le menu")} aria-expanded={open} aria-controls="mobileMenu">
              <i className={open ? "fa-solid fa-xmark" : "fa-solid fa-bars"} aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </nav>

      <div id="mobileMenu" ref={menuRef} className={`${open ? "" : "hidden"} bg-white text-gray-900 border-t border-gray-200 px-6 py-4 shadow-card absolute w-full max-h-[calc(100vh-4rem)] overflow-y-auto xl:w-96 xl:right-6 xl:left-auto xl:border xl:border-gray-200 xl:shadow-2xl`}>
        <Link href={localePath(locale, "/")} onClick={() => setOpen(false)} className="mobile-link block py-3 text-gray-700 border-b" aria-current={current === "home" ? "page" : undefined}>
          {t("Accueil")}
        </Link>
        {nav.map((n, i) => (
          <Link key={n.id || n.url} href={localePath(locale, n.url)} onClick={() => setOpen(false)} className={`mobile-link block py-3 text-gray-700 ${i === nav.length - 1 ? "" : "border-b"}`} aria-current={isActive(n) ? "page" : undefined}>
            {n.libelle}
          </Link>
        ))}
        <label className="sm:hidden flex items-center gap-3 py-3 border-t text-sm font-sans font-semibold text-gray-700">
          <i className="fa-solid fa-globe text-ecideBlue" aria-hidden="true"></i>
          <span>{t("Langue")}</span>
          {langSelect("langSelectMobile", "ml-auto min-w-0 bg-gray-100 px-3 py-2 text-sm font-semibold focus:outline-none")}
        </label>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Link href={localePath(locale, site.cta.url)} onClick={() => setOpen(false)} className="btn btn--dark flex-1">
            {site.cta.label}
          </Link>
          {donLink("btn btn--primary flex-1")}
        </div>
      </div>
    </header>
  );
}
