"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { isLocale, localePath, switchLocale, type Locale } from "@/lib/locales";
import { siteNav } from "@/lib/nav";
import type { Site } from "@/lib/types";

/** Largeur d'écran (px) à partir de laquelle Tailwind affiche le menu de bureau (point de rupture xl). */
const DESKTOP = 1280;

/**
 * En-tête façon site de campagne : une première rangée avec le logo et les boutons
 * « Adhérer » / « Faire un don », une seconde avec les pages du site. Sur mobile (et quand les
 * libellés traduits ne tiennent pas sur une ligne), un bouton ouvre le menu.
 */
export default function Header({ site, locale }: { site: Site; locale: Locale }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const p = site.params;
  const nav = siteNav(site).filter((n) => n.key !== "home");
  const donUrl = p.don || `${localePath(locale, "/adherer")}#don`;
  const donExternal = /^https?:/i.test(donUrl);

  // Clé de la page courante (home, parti, actualites…) pour marquer le lien actif
  const parts = pathname.split("/").filter(Boolean);
  if (isLocale(parts[0])) parts.shift();
  const current = parts[0] || "home";
  const isActive = (key: string) => key === current;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Le menu de bureau est remplacé par le menu mobile quand ses libellés ne tiennent pas sur une ligne
  useEffect(() => {
    const check = () => {
      const row = rowRef.current;
      const list = listRef.current;
      if (!row || !list) return;
      const desktop = window.innerWidth >= DESKTOP;
      let next = false;
      if (desktop) {
        const prev = list.style.cssText;
        list.style.cssText = `${prev};display:flex;position:absolute;visibility:hidden;width:max-content`;
        const needed = list.scrollWidth;
        list.style.cssText = prev;
        next = row.clientWidth < needed + 48;
      }
      setCollapsed(next);
      if (desktop && !next) setOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    document.fonts?.ready.then(check).catch(() => {});
    return () => window.removeEventListener("resize", check);
  }, [locale, nav.length]);

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

  const desktop = collapsed ? "hidden" : "hidden xl:flex";
  const mobile = collapsed ? "" : "xl:hidden";
  const donLink = (className: string) =>
    donExternal ? (
      <a href={donUrl} target="_blank" rel="noopener" className={className} onClick={() => setOpen(false)}>
        {t("Faire un don")} <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
      </a>
    ) : (
      <Link href={donUrl} className={className} onClick={() => setOpen(false)}>
        {t("Faire un don")} <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
      </Link>
    );

  return (
    <header className="site-header bg-white sticky top-0 z-40 border-b border-gray-200">
      <nav aria-label={t("Navigation principale")}>
        {/* Rangée 1 : logo, langue, boutons d'action */}
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center gap-4 h-16 xl:h-[4.5rem]">
          <Link href={localePath(locale, "/")} className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink" aria-label={`${p.nom || "ECiDé"}, ${t("retour à l'accueil")}`}>
            <img src="/assets/img/logo-160.png" alt="" width={44} height={44} className="w-11 h-11 shrink-0 rounded-full" />
            <span className="min-w-0 leading-none">
              <span className="font-black text-xl sm:text-2xl text-ecideBlue block leading-none truncate tracking-tight">{p.nom || "ECiDé"}</span>
              <span className="text-[11px] text-gray-600 font-semibold mt-1 hidden sm:block truncate">{p.slogan || "C'est possible"}</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0 max-w-[calc(100%-3.5rem)] sm:max-w-none">
            <label className="lang-switch hidden sm:flex items-center gap-2 text-gray-700 hover:text-ecideBlue px-2 py-1.5 text-[13px] font-semibold relative cursor-pointer transition">
              <i className="fa-solid fa-globe" aria-hidden="true"></i>
              <span>{locale.toUpperCase()}</span>
              <i className="fa-solid fa-chevron-down text-[10px] text-gray-400" aria-hidden="true"></i>
              {langSelect("langSelect", "absolute inset-0 w-full h-full opacity-0 cursor-pointer")}
            </label>
            <Link href={localePath(locale, site.cta.url)} className="btn btn--dark btn--sm min-w-0">
              <span className="truncate">{site.cta.label}</span> <i className="fa-solid fa-arrow-right text-xs shrink-0" aria-hidden="true"></i>
            </Link>
            {donLink("btn btn--primary btn--sm hidden sm:inline-flex")}
            <button type="button" onClick={() => setOpen(!open)} className={`${mobile} text-ecideDarkBlue text-2xl p-1 ml-1 shrink-0`} aria-label={t("Ouvrir le menu")} aria-expanded={open} aria-controls="mobileMenu">
              <i className={open ? "fa-solid fa-xmark" : "fa-solid fa-bars"} aria-hidden="true"></i>
            </button>
          </div>
        </div>

        {/* Rangée 2 : pages du site (grand écran) */}
        <div ref={rowRef} className={`${collapsed ? "hidden" : "hidden xl:block"} border-t border-gray-100`}>
          <ul ref={listRef} className={`${desktop} max-w-7xl mx-auto px-6 items-center gap-8 font-semibold text-gray-700 text-[15px] whitespace-nowrap h-10`}>
            {nav.map((n) => (
              <li key={n.id || n.url}>
                <Link href={localePath(locale, n.url)} className="nav-link" aria-current={isActive(n.key) ? "page" : undefined}>
                  {n.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div id="mobileMenu" className={`${open ? "" : "hidden"} ${mobile} bg-white border-t border-gray-100 px-6 py-4 text-lg font-semibold shadow-card absolute w-full max-h-[calc(100vh-4rem)] overflow-y-auto`}>
        <Link href={localePath(locale, "/")} onClick={() => setOpen(false)} className="mobile-link block py-3 text-gray-700 border-b" aria-current={current === "home" ? "page" : undefined}>
          {t("Accueil")}
        </Link>
        {nav.map((n, i) => (
          <Link key={n.id || n.url} href={localePath(locale, n.url)} onClick={() => setOpen(false)} className={`mobile-link block py-3 text-gray-700 ${i === nav.length - 1 ? "" : "border-b"}`} aria-current={isActive(n.key) ? "page" : undefined}>
            {n.libelle}
          </Link>
        ))}
        <label className="sm:hidden flex items-center gap-3 py-3 border-t text-base text-gray-700">
          <i className="fa-solid fa-globe text-ecideBlue" aria-hidden="true"></i>
          <span>{t("Langue")}</span>
          {langSelect("langSelectMobile", "ml-auto min-w-0 bg-gray-100 px-3 py-2 text-sm font-semibold rounded-lg focus:outline-none")}
        </label>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Link href={localePath(locale, site.cta.url)} onClick={() => setOpen(false)} className="btn btn--dark flex-1">
            {site.cta.label} <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
          </Link>
          {donLink("btn btn--primary flex-1")}
        </div>
      </div>
    </header>
  );
}
