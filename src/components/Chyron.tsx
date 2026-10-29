import Link from "next/link";
import { localePath, type Locale } from "@/lib/locales";
import type { Site } from "@/lib/types";

/** Fil d'actualité défilant : la liste est doublée pour un défilement continu. */
export default function Chyron({ site, locale, label }: { site: Site; locale: Locale; label: string }) {
  const items = site.ticker.items;
  if (!items.length) return null;
  const list = (hidden: boolean) => (
    <ul className="chyron-list" aria-hidden={hidden || undefined}>
      {items.map((it, i) => (
        <li key={i}>
          <Link href={localePath(locale, it.url)} className="chyron-item" tabIndex={hidden ? -1 : undefined}>
            <span className={`chyron-tag${it.tone === "green" ? " chyron-tag--green" : it.tone === "yellow" ? " chyron-tag--yellow" : ""}`}>{it.tag}</span>
            {it.texte}
            {it.date && (
              <time className="chyron-date" dateTime={it.date}>
                {it.dateLabel}
              </time>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="chyron bg-gray-50 border-b border-gray-200" role="region" aria-label={label}>
      <div className="max-w-7xl mx-auto px-6 h-11 flex items-center">
        <div className="chyron-viewport">
          <div className="chyron-track">
            {list(false)}
            {list(true)}
          </div>
        </div>
      </div>
    </div>
  );
}
