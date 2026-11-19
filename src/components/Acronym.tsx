import { Fragment, type ReactNode } from "react";

/** Mots du nom du parti et nombre de lettres qui forment le sigle : E · Ci · Dé. */
const LETTERS: Record<string, number> = { engagement: 1, "citoyenneté": 2, "développement": 2 };
const WORDS = /(Engagement|Citoyenneté|Développement)/giu;

/** Vrai quand le texte contient les trois mots du sigle (le nom complet du parti). */
export function spellsAcronym(text: string): boolean {
  return (text.normalize("NFC").match(WORDS) || []).length >= 3;
}

/**
 * Met en valeur, dans « Engagement pour la Citoyenneté et le Développement », les lettres qui
 * épellent ECiDé. Chaque mot du sigle ouvre sa propre ligne, si bien que E, Ci et Dé s'alignent
 * les uns sous les autres et se lisent de haut en bas :
 *   Engagement pour la
 *   Citoyenneté et le
 *   Développement
 * Un nom ne se traduit pas : translate="no" demande aussi aux traducteurs des navigateurs de le laisser tel quel.
 * Le texte vient de l'administration : sans ces mots (autre langue, autre titre), il est rendu tel quel.
 */
export function Acronym({ text, className = "acronym" }: { text: string; className?: string }): ReactNode {
  const parts = text.normalize("NFC").split(WORDS);
  if (parts.length === 1) return text;

  // Une ligne par mot du sigle ; un éventuel texte placé avant le premier mot garde sa propre ligne.
  const lines: ReactNode[][] = [];
  if (parts[0].trim()) lines.push([parts[0].trim()]);
  for (let i = 1; i < parts.length; i += 2) {
    const word = parts[i];
    const n = LETTERS[word.toLowerCase()] ?? 0;
    lines.push([
      <span key="l" className={className}>{word.slice(0, n)}</span>,
      word.slice(n) + (parts[i + 1] || "").trimEnd(),
    ]);
  }
  return lines.map((line, i) => (
    <Fragment key={i}>
      <span className="acronym-line" translate="no">{line}</span>
    </Fragment>
  ));
}
