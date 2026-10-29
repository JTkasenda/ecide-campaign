"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Sommaire de page collant : le lien de la section visible est mis en avant. */
export default function PageSubnav({ links, label, children }: { links: { href: string; label: string }[]; label: string; children?: ReactNode }) {
  const [active, setActive] = useState<string>("");
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
  return (
    <nav className="page-subnav bg-white border-b border-gray-200 sticky top-[var(--header-h)] z-30" aria-label={label}>
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-0.5 scroll-x">
        {links.map((l) => (
          <a key={l.href} href={l.href} className={`subnav-link${active === l.href ? " is-active" : ""}`}>
            {l.label}
          </a>
        ))}
        {children}
      </div>
    </nav>
  );
}
