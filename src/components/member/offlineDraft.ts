/**
 * Brouillon de la demande d'adhésion gardé sur l'appareil (localStorage) tant qu'il n'est pas
 * enregistré par le parti : une coupure de connexion ou une page rechargée ne fait rien perdre.
 * Une clé par membre (appareil partagé) ; effacé dès que le serveur a tout reçu.
 */
const key = (id: number) => `ecide-adhesion-brouillon:${id}`;

type Kept = { champs: Record<string, string>; enAttente: string[] };

export function readDraft(id: number): Kept | null {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(key(id));
    const v = raw ? (JSON.parse(raw) as Partial<Kept>) : null;
    return v && typeof v.champs === "object" && v.champs ? { champs: v.champs, enAttente: Array.isArray(v.enAttente) ? v.enAttente : [] } : null;
  } catch {
    return null;
  }
}

export function writeDraft(id: number, champs: Record<string, string | undefined>, enAttente: string[]): void {
  try {
    const clean: Record<string, string> = {};
    Object.entries(champs).forEach(([k, v]) => v !== undefined && (clean[k] = v));
    window.localStorage.setItem(key(id), JSON.stringify({ champs: clean, enAttente }));
  } catch {
    // Stockage indisponible (navigation privée, mémoire pleine) : la saisie reste à l'écran
  }
}

export function clearDraft(id: number): void {
  try {
    window.localStorage.removeItem(key(id));
  } catch {
    // rien à effacer
  }
}

/**
 * Brouillon d'un rapport d'activité (nouveau ou en cours de modification) : même principe, une clé
 * par membre et par rapport. Les fichiers joints ne peuvent pas y être gardés (stockage limité au
 * texte) : seuls les champs du formulaire le sont, avec l'envoi resté en attente faute de réseau.
 */
const reportKey = (member: number, report: number | "nouveau") => `ecide-rapport-brouillon:${member}:${report}`;

export type ReportDraft = { champs: Record<string, unknown>; enAttente: boolean; le: number };

export function readReportDraft(member: number, report: number | "nouveau"): ReportDraft | null {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(reportKey(member, report));
    const v = raw ? (JSON.parse(raw) as Partial<ReportDraft>) : null;
    return v && typeof v.champs === "object" && v.champs ? { champs: v.champs, enAttente: !!v.enAttente, le: Number(v.le) || 0 } : null;
  } catch {
    return null;
  }
}

export function writeReportDraft(member: number, report: number | "nouveau", champs: Record<string, unknown>, enAttente: boolean): void {
  try {
    window.localStorage.setItem(reportKey(member, report), JSON.stringify({ champs, enAttente, le: Date.now() }));
  } catch {
    // Stockage indisponible : la saisie reste à l'écran
  }
}

export function clearReportDraft(member: number, report: number | "nouveau"): void {
  try {
    window.localStorage.removeItem(reportKey(member, report));
  } catch {
    // rien à effacer
  }
}
