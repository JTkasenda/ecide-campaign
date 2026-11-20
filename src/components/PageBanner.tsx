import type { ReactNode } from "react";

/**
 * Bandeau de tête des pages intérieures (style warnockforgeorgia.com / obama.org) : bande bleu
 * nuit, étiquette jaune en condensé, grand titre, texte d'introduction en serif, et à droite
 * un contenu libre (chiffres clés, boutons).
 * Téléphone et tablette : l'étiquette et le titre seulement ; l'introduction est masquée, ou coupée à
 * 3 lignes quand la page en a besoin (mobileText="clamp").
 */
export default function PageBanner({ eyebrow, title, text, children, as: Tag = "h1", narrow = false, mobileText = "hide" }: { eyebrow?: string; title: string; text?: string; children?: ReactNode; as?: "h1" | "h2"; narrow?: boolean; mobileText?: "hide" | "clamp" }) {
  return (
    <section className="bg-ecideDarkBlue text-white diag">
      <div className={`${narrow ? "max-w-4xl" : "max-w-7xl"} mx-auto px-6 py-16 lg:py-20 flex flex-col lg:flex-row lg:items-end justify-between gap-10 lg:gap-16`}>
        <div className="space-y-4 max-w-2xl">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <Tag className="text-4xl sm:text-5xl lg:text-6xl leading-none no-bar">{title}</Tag>
          {text && <p className={`text-lg text-blue-100 leading-relaxed ${mobileText === "clamp" ? "mob-clamp" : "mob-hide"}`}>{text}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Chiffres clés affichés dans le bandeau (nombre en condensé, libellé en capitales) ; ordinateur seulement. */
export function BannerStats({ items }: { items: [number | string, string][] }) {
  return (
    <dl className="mob-hide flex flex-wrap gap-x-12 gap-y-4 shrink-0">
      {items.map(([n, l]) => (
        <div key={String(l)}>
          <dd className="font-display text-5xl text-white block leading-none">{n}</dd>
          <dt className="eyebrow text-[11px] mt-1">{l}</dt>
        </div>
      ))}
    </dl>
  );
}
