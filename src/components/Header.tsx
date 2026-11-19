"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { isLocale, localePath, switchLocale, type Locale } from "@/lib/locales";
import { headerNav, type NavGroup } from "@/lib/nav";
import type { Site } from "@/lib/types";

/**
 * En-tête : bandeau bleu nuit, logo à gauche, boutons « Adhérer » et « Faire un don » à droite.
* Un seul bouton par action : « Adhérer » (page Adhésion) et « Faire un don » ; pas de rappel dans les menus.
 * Sur ordinateur (≥ 1024 px), quelques entrées seulement (Le Parti, Président, Actualités, Contact) ;
 * celles qui ont des sous-pages déroulent un panneau pleine largeur dès que le curseur ou le focus
 * clavier s'y pose (Organigramme, Charte, Projet, Cadres, Diaspora sous « Le Parti »…). Le rangement
 * vient de l'administration (Paramètres › Navigation, case « Sous-page »). Sur mobile et tablette,
 * le bouton de menu (hamburger) ouvre le panneau avec les mêmes entrées, sous-pages en retrait.
 */
export default function Header({ site, locale }: { site: Site; locale: Locale }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState<string | null>(null); // menu déroulant ouvert (ordinateur)
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const p = site.params;
  const donUrl = p.don && /^https?:\/\//i.test(p.don) ? p.don : localePath(locale, "/don");
  const donExternal = /^https?:/i.test(donUrl);
  // Adhésion et don ont leurs boutons : pas d'entrée en double dans le menu
  const nav = headerNav(site, [site.cta.url, "/don", "/adherer"]);

  // Page courante (sans la langue) pour marquer l'entrée active
  const parts = pathname.split("/").filter(Boolean);
  if (isLocale(parts[0])) parts.shift();
  const path = "/" + parts.join("/");
  const matches = (url: string) => (url === "/" ? path === "/" : path === url || path.startsWith(url + "/"));
  const isActive = (n: NavGroup) => matches(n.url) || n.children.some((c) => matches(c.url));
  const isCurrent = (url: string) => path === url;

  // Fermeture : Échap, clic en dehors (chaque lien referme aussi en naviguant)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setDrop((d) => {
        if (d) (navRef.current?.querySelector(`[data-drop="${d}"]`) as HTMLElement | null)?.focus();
        return null;
      });
    };
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (open && menuRef.current && !menuRef.current.contains(el) && !el.closest("[aria-controls=mobileMenu]")) setOpen(false);
      if (navRef.current && !navRef.current.contains(el)) setDrop(null);
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

  // Survol : ouverture immédiate, fermeture différée pour laisser le temps de descendre dans le menu
  const enter = (id: string) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setDrop(id);
  };
  const leave = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setDrop(null), 180);
  };

  const topLink = "site-nav__link relative inline-flex items-center gap-1.5 h-16 xl:h-20 px-2 xl:px-3 text-[12.5px] xl:text-sm font-sans font-bold uppercase tracking-wider text-white/90 hover:text-white transition whitespace-nowrap";

  return (
    <header className="site-header bg-ecideDarkBlue text-white sticky top-0 z-40">
      <nav aria-label={t("Navigation principale")}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center gap-3 xl:gap-6 h-16 xl:h-20">
          <Link href={localePath(locale, "/")} className="flex items-center gap-3 min-w-0 shrink lg:shrink-0" aria-label={`${p.nom || "ECiDé"}, ${t("retour à l'accueil")}`}>
            <img src={site.assets.logo || "/assets/img/logo-160.png"} alt="" width={44} height={44} className="w-11 h-11 shrink-0 rounded-full object-cover" />
            <span className="min-w-0 leading-none">
              <span className="font-display font-black text-2xl block leading-none truncate" translate="no">{p.nom || "ECiDé"}</span>
              <span className="eyebrow text-[9px] tracking-[0.3em] mt-1 hidden sm:block lg:hidden 2xl:block truncate">{p.slogan}</span>
            </span>
          </Link>

          {/* Menu en ligne : ordinateur seulement */}
          <ul ref={navRef} className="hidden lg:flex items-stretch min-w-0 self-stretch">
            {nav.map((n) => {
              const active = isActive(n);
              if (!n.children.length) {
                return (
                  <li key={n.id || n.url} className="flex">
                    <Link href={localePath(locale, n.url)} className={topLink} aria-current={isCurrent(n.url) ? "page" : undefined} data-active={active || undefined}>
                      {n.libelle}
                    </Link>
                  </li>
                );
              }
              const id = n.id || n.url;
              const isOpen = drop === id;
              return (
                <li
                  key={id}
                  className="flex"
                  onMouseEnter={() => enter(id)}
                  onMouseLeave={leave}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDrop((d) => (d === id ? null : d));
                  }}
                >
                  <button
                    type="button"
                    data-drop={id}
                    className={topLink}
                    aria-expanded={isOpen}
                    aria-controls={`drop-${id}`}
                    data-active={active || undefined}
                    onFocus={() => enter(id)}
                    onClick={() => enter(id)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        enter(id);
                        setTimeout(() => (document.querySelector(`#drop-${id} a`) as HTMLElement | null)?.focus(), 0);
                      }
                    }}
                  >
                    {n.libelle}
                    <i className={`fa-solid fa-chevron-down text-[9px] text-ecideYellow transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true"></i>
                  </button>
                  {/* Panneau pleine largeur qui se déroule sous le bandeau (positionné par rapport à l'en-tête) */}
                  <div
                    id={`drop-${id}`}
                    className="site-mega absolute left-0 right-0 top-full bg-white text-gray-900 shadow-2xl border-t-4 border-ecideYellow"
                    data-open={isOpen || undefined}
                    onKeyDown={(e) => {
                      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                      e.preventDefault();
                      const links = [...e.currentTarget.querySelectorAll("a")];
                      const i = links.indexOf(document.activeElement as HTMLAnchorElement);
                      links[(i + (e.key === "ArrowDown" ? 1 : links.length - 1)) % links.length]?.focus();
                    }}
                  >
                    <div className="site-mega__inner max-w-7xl mx-auto px-6 py-14 xl:py-20 grid grid-cols-12 gap-12 xl:gap-16 min-h-[22rem] xl:min-h-[26rem]">
                      <div className="col-span-4 space-y-6 border-r border-gray-200 pr-12 self-stretch">
                        <span className="eyebrow text-ecideBlue">{t("Explorer")}</span>
                        <p className="font-display font-black text-4xl xl:text-5xl text-ecideDarkBlue leading-tight">{n.libelle}</p>
                        <Link href={localePath(locale, n.url)} onClick={() => setDrop(null)} aria-current={isCurrent(n.url) ? "page" : undefined} className="site-drop__link inline-flex items-center gap-2 font-bold text-ecideDarkBlue underline decoration-ecideYellow decoration-2 underline-offset-4 hover:text-ecideBlue">
                          {t("Vue d'ensemble")}
                          <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
                        </Link>
                      </div>
                      <ul className="col-span-8 columns-2 gap-x-14 xl:gap-x-20 self-center">
                        {n.children.map((c, i) => (
                          <li key={c.id || c.url} className="site-mega__item break-inside-avoid" style={{ transitionDelay: isOpen ? `${150 + i * 70}ms` : "0ms" }}>
                            <Link
                              href={localePath(locale, c.url)}
                              onClick={() => setDrop(null)}
                              aria-current={isCurrent(c.url) ? "page" : undefined}
                              className="site-drop__link flex items-center justify-between gap-4 py-5 xl:py-6 border-b border-gray-200 font-display font-bold text-xl xl:text-2xl tracking-wide text-gray-900 hover:text-ecideBlue"
                            >
                              <span>{c.libelle}</span>
                              <i className="fa-solid fa-arrow-right text-sm text-ecideBlue opacity-0 transition" aria-hidden="true"></i>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0 max-w-[calc(100%-3.5rem)] sm:max-w-none">
            <label className="lang-switch hidden sm:flex items-center gap-2 text-white border border-white/50 hover:border-white hover:bg-white/10 px-3 py-2 text-xs font-sans font-bold tracking-widest relative cursor-pointer transition">
              <i className="fa-solid fa-globe text-ecideYellow" aria-hidden="true"></i>
              <span>{locale.toUpperCase()}</span>
              <i className="fa-solid fa-chevron-down text-[9px] text-ecideYellow" aria-hidden="true"></i>
              {langSelect("langSelect", "absolute inset-0 w-full h-full opacity-0 cursor-pointer")}
            </label>
            <Link href={localePath(locale, site.cta.url)} className="btn btn--outline-white btn--sm min-w-0 hidden md:inline-flex" aria-current={matches(site.cta.url) || matches("/espace-membre") ? "page" : undefined}>
              <span className="truncate">{site.cta.label}</span>
            </Link>
            {donLink("btn btn--primary btn--sm min-w-0")}
            <button type="button" onClick={() => setOpen(!open)} className="lg:hidden text-white text-2xl p-1 ml-1 shrink-0" aria-label={t("Ouvrir le menu")} aria-expanded={open} aria-controls="mobileMenu">
              <i className={open ? "fa-solid fa-xmark" : "fa-solid fa-bars"} aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Panneau mobile et tablette */}
      <div id="mobileMenu" ref={menuRef} className={`${open ? "" : "hidden"} lg:hidden bg-white text-gray-900 border-t border-gray-200 px-6 py-4 shadow-card absolute w-full max-h-[calc(100vh-4rem)] overflow-y-auto`}>
        <Link href={localePath(locale, "/")} onClick={() => setOpen(false)} className="mobile-link block py-3 text-gray-700 border-b" aria-current={path === "/" ? "page" : undefined}>
          {t("Accueil")}
        </Link>
        {nav.map((n, i) => (
          <div key={n.id || n.url} className={i === nav.length - 1 ? "" : "border-b"}>
            <Link href={localePath(locale, n.url)} onClick={() => setOpen(false)} className="mobile-link block py-3 text-gray-700" aria-current={isCurrent(n.url) ? "page" : undefined}>
              {n.libelle}
            </Link>
            {n.children.length > 0 && (
              <ul className="pb-3 pl-4 border-l-2 border-ecideYellow ml-1 space-y-0.5">
                {n.children.map((c) => (
                  <li key={c.id || c.url}>
                    <Link href={localePath(locale, c.url)} onClick={() => setOpen(false)} className="mobile-link mobile-link--sub block py-2 text-sm text-gray-600" aria-current={isCurrent(c.url) ? "page" : undefined}>
                      {c.libelle}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        <label className="sm:hidden flex items-center gap-3 py-3 border-t text-sm font-sans font-semibold text-gray-700">
          <i className="fa-solid fa-globe text-ecideBlue" aria-hidden="true"></i>
          <span>{t("Langue")}</span>
          {langSelect("langSelectMobile", "ml-auto min-w-0 bg-white border border-ecideDarkBlue text-ecideDarkBlue px-3 py-2 text-sm font-semibold focus:outline-none")}
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
