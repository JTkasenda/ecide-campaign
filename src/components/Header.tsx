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
 * En-tête façon site de campagne (warnockforgeorgia.com) : bandeau bleu nuit, logo à gauche,
 * pages du site en capitales espacées, boutons « Adhérer » et « Faire un don » à droite.
 * Sur mobile (et quand les libellés traduits ne tiennent pas sur une ligne), un bouton ouvre le
 * menu. La page d'accueil n'affiche pas les liens : elle présente elle-même les pages du site.
 */
export default function Header({ site, locale }: { site: Site; locale: Locale }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLAnchorElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const p = site.params;
  const nav = siteNav(site).filter((n) => n.key !== "home");
  const donUrl = p.don || `${localePath(locale, "/adherer")}#don`;
  const donExternal = /^https?:/i.test(donUrl);

  // Clé de la page courante (home, parti, actualites…) pour marquer le lien actif
  const parts = pathname.split("/").filter(Boolean);
  if (isLocale(parts[0])) parts.shift();
  const current = parts[0] || "home";
  const isHome = current === "home";
  const isActive = (key: string) => key === current;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Le menu de bureau est remplacé par le menu mobile quand logo, liens et boutons ne tiennent pas sur une ligne
  useEffect(() => {
    const natural = (el: HTMLElement) => {
      const prev = el.style.cssText;
      el.style.cssText = `${prev};display:flex;position:absolute;visibility:hidden;width:max-content`;
      const w = el.scrollWidth;
      el.style.cssText = prev;
      return w;
    };
    const check = () => {
      const bar = barRef.current;
      const list = listRef.current;
      const brand = brandRef.current;
      const actions = actionsRef.current;
      if (!bar || !list || !brand || !actions) return;
      const desktop = window.innerWidth >= DESKTOP;
      let next = false;
      if (desktop) next = bar.clientWidth < brand.offsetWidth + natural(list) + actions.offsetWidth + 64;
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

  const showRow = !isHome && !collapsed;
  const desktop = showRow ? "hidden xl:flex" : "hidden";
  const mobile = showRow ? "xl:hidden" : "";
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
        <div ref={barRef} className="max-w-7xl mx-auto px-6 flex justify-between items-center gap-6 h-16 xl:h-20">
          <Link ref={brandRef} href={localePath(locale, "/")} className="flex items-center gap-3 min-w-0 shrink" aria-label={`${p.nom || "ECiDé"}, ${t("retour à l'accueil")}`}>
            <img src="/assets/img/logo-160.png" alt="" width={44} height={44} className="w-11 h-11 shrink-0 rounded-full" />
            <span className="min-w-0 leading-none">
              <span className="font-display font-black text-2xl block leading-none truncate">{p.nom || "ECiDé"}</span>
              <span className="eyebrow text-[9px] tracking-[0.3em] mt-1 hidden sm:block truncate">{p.slogan || "C'est possible"}</span>
            </span>
          </Link>

          <ul ref={listRef} className={`${desktop} items-center gap-5 whitespace-nowrap min-w-0`}>
            {nav.map((n) => (
              <li key={n.id || n.url}>
                <Link href={localePath(locale, n.url)} className="nav-link" aria-current={isActive(n.key) ? "page" : undefined}>
                  {n.libelle}
                </Link>
              </li>
            ))}
          </ul>

          <div ref={actionsRef} className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0 max-w-[calc(100%-3.5rem)] sm:max-w-none">
            <label className="lang-switch hidden sm:flex items-center gap-2 text-blue-100 hover:text-white px-2 py-1.5 text-[11px] font-sans font-bold tracking-widest relative cursor-pointer transition">
              <i className="fa-solid fa-globe" aria-hidden="true"></i>
              <span>{locale.toUpperCase()}</span>
              <i className="fa-solid fa-chevron-down text-[9px] text-blue-300" aria-hidden="true"></i>
              {langSelect("langSelect", "absolute inset-0 w-full h-full opacity-0 cursor-pointer")}
            </label>
            <Link href={localePath(locale, site.cta.url)} className={`btn btn--outline-white btn--sm min-w-0 hidden md:inline-flex ${showRow ? "xl:hidden 2xl:inline-flex" : ""}`}>
              <span className="truncate">{site.cta.label}</span>
            </Link>
            {donLink("btn btn--primary btn--sm min-w-0")}
            <button type="button" onClick={() => setOpen(!open)} className={`${mobile} text-white text-2xl p-1 ml-1 shrink-0`} aria-label={t("Ouvrir le menu")} aria-expanded={open} aria-controls="mobileMenu">
              <i className={open ? "fa-solid fa-xmark" : "fa-solid fa-bars"} aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </nav>

      <div id="mobileMenu" className={`${open ? "" : "hidden"} ${mobile} bg-white text-gray-900 border-t border-gray-200 px-6 py-4 shadow-card absolute w-full max-h-[calc(100vh-4rem)] overflow-y-auto ${showRow ? "" : "xl:w-96 xl:right-6 xl:left-auto xl:border xl:border-gray-200 xl:shadow-2xl"}`}>
        <Link href={localePath(locale, "/")} onClick={() => setOpen(false)} className="mobile-link block py-3 text-gray-700 border-b" aria-current={current === "home" ? "page" : undefined}>
          {t("Accueil")}
        </Link>
        {nav.map((n, i) => (
          <Link key={n.id || n.url} href={localePath(locale, n.url)} onClick={() => setOpen(false)} className={`mobile-link block py-3 text-gray-700 ${i === nav.length - 1 ? "" : "border-b"}`} aria-current={isActive(n.key) ? "page" : undefined}>
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
