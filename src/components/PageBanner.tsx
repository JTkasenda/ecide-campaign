import type { ReactNode } from "react";

/**
 * Bandeau de tête des pages intérieures (style warnockforgeorgia.com / obama.org) : bande bleu
 * nuit, étiquette jaune en condensé, grand titre, texte d'introduction en serif, et à droite
 * un contenu libre (chiffres clés, boutons).
 */
export default function PageBanner({ eyebrow, title, text, children, as: Tag = "h1", narrow = false }: { eyebrow?: string; title: string; text?: string; children?: ReactNode; as?: "h1" | "h2"; narrow?: boolean }) {
  return (
    <section className="bg-ecideDarkBlue text-white diag">
      <div className={`${narrow ? "max-w-4xl" : "max-w-7xl"} mx-auto px-6 py-16 lg:py-20 flex flex-col lg:flex-row lg:items-end justify-between gap-10 lg:gap-16`}>
        <div className="space-y-4 max-w-2xl">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <Tag className="text-4xl sm:text-5xl lg:text-6xl leading-none no-bar">{title}</Tag>
          {text && <p className="text-lg text-blue-100 leading-relaxed">{text}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Chiffres clés affichés dans le bandeau (nombre en condensé, libellé en capitales). */
export function BannerStats({ items }: { items: [number | string, string][] }) {
  return (
    <dl className="flex flex-wrap gap-x-12 gap-y-4 shrink-0">
      {items.map(([n, l]) => (
        <div key={String(l)}>
          <dd className="font-display text-5xl text-white block leading-none">{n}</dd>
          <dt className="eyebrow text-[11px] mt-1">{l}</dt>
        </div>
      ))}
    </dl>
  );
}
