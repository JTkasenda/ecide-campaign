"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { pad2 } from "@/lib/format";

/**
 * Sommaire de page, en trois présentations complémentaires :
 * - un index blanc sous le bandeau, visible dès l'arrivée, qui liste au centre toutes les sections numérotées ;
 * - sur très grand écran (≥ 1360 px), une fois l'index passé, un rail fixe à droite : une pastille par section,
 *   la section visible est en jaune et porte son libellé, les autres se déplient au survol ;
 * - en dessous, une barre fixée sous l'en-tête dès que l'index est passé : la section courante et
 *   une liste dépliable, toujours accessibles sans parcourir la page.
 */
export default function PageSubnav({ links, label, children }: { links: { href: string; label: string }[]; label: string; children?: ReactNode }) {
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const indexRef = useRef<HTMLDivElement>(null);

  // La barre fixée prend le relais quand l'index jaune est passé sous l'en-tête
  useEffect(() => {
    const onScroll = () => {
      const el = indexRef.current;
      if (!el) return;
      const header = document.querySelector("header")?.getBoundingClientRect().bottom || 0;
      setShown(el.getBoundingClientRect().bottom < header);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const sections = links.map((l) => document.querySelector<HTMLElement>(l.href)).filter((s): s is HTMLElement => !!s);
    if (!sections.length || !("IntersectionObserver" in window)) return;
    const spy = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive("#" + visible.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((s) => spy.observe(s));
    return () => spy.disconnect();
  }, [links]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const index = Math.max(0, links.findIndex((l) => l.href === active));
  const current = links[index];
  const item = (l: { href: string; label: string }, i: number, cls = "") => (
    <a href={l.href} className={`subnav-link${active === l.href ? " is-active" : ""} ${cls}`} onClick={() => setOpen(false)}>
      <span className="subnav-num">{pad2(i + 1)}</span>
      <span className="subnav-label">{l.label}</span>
    </a>
  );

  // Téléphone et tablette : pas de sommaire de page (Le Parti, Président Élu)
  return (
    <nav className="page-subnav mob-hide" aria-label={label}>
      {/* Index visible à l'arrivée */}
      <div className="subnav-index" ref={indexRef}>
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <ol className="subnav-index-list">
            {links.map((l, i) => (
              <li key={l.href}>{item(l, i)}</li>
            ))}
          </ol>
          {children && <div className="subnav-extra">{children}</div>}
        </div>
      </div>

      {/* Barre fixée sous l'en-tête (jusqu'à 1359 px), une fois l'index passé */}
      <div className={`subnav-sticky${shown ? " is-shown" : ""}`}>
        <div className="max-w-7xl mx-auto px-6 relative">
          <button type="button" className="subnav-current" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={label}>
            <span className="subnav-num">{pad2(index + 1)}/{pad2(links.length)}</span>
            <span className="truncate">{current?.label || label}</span>
            <i className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"} text-xs`} aria-hidden="true"></i>
          </button>
          {open && (
            <ol className="subnav-sheet">
              {links.map((l, i) => (
                <li key={l.href}>{item(l, i)}</li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Rail latéral (≥ 1360 px) */}
      <ol className={`subnav-rail${shown ? " is-shown" : ""}`}>
        {links.map((l, i) => (
          <li key={l.href}>{item(l, i)}</li>
        ))}
      </ol>
    </nav>
  );
}
