/**
 * Espace membre : appels au relais du site (/api/membre/…), qui garde la session dans un cookie
 * protégé et transmet à l'API Laravel. Types de la fiche, des réglages de la demande et des paiements.
 */

export type MemberStatut = "compte" | "brouillon" | "en_attente" | "complement" | "refuse" | "actif" | "suspendu";
export type Step = "identite" | "adresse" | "categorie" | "documents" | "engagement" | "paiement";

export interface MemberProfile {
  id: number;
  statut: MemberStatut;
  statutLibelle: string;
  nom: string | null;
  postnom: string | null;
  prenom: string | null;
  sexe: "F" | "M" | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  etat_civil: string | null;
  profession: string | null;
  telephone: string | null;
  email: string | null;
  pays: string | null;
  province: string | null;
  district: string | null;
  ville: string | null;
  commune: string | null;
  quartier: string | null;
  localite: string | null;
  adresse: string | null;
  categorie: string | null;
  categorieLibelle: string | null;
  nomComplet: string;
  section: string;
  residence: string;
  photo: boolean;
  piece: boolean;
  pieceType: "pdf" | "image" | null;
  engagement: boolean;
  soumisLe: string | null;
  motif: string | null;
  manque: Partial<Record<Step, string[]>>;
  carte: { numero: string; delivreeLe: string | null; expireLe: string | null; valide: boolean } | null;
  membreDepuis: string | null;
}

export interface Category {
  id: string;
  libelle: string;
  description: string;
  usd: number;
  cdf: number;
  pour: "rdc" | "diaspora" | "tous";
}

export interface MemberOptions {
  demo: boolean;
  categories: Category[];
  moyens: { key: string; libelle: string; mobile: boolean }[];
  geo: { rdc: string; provinces: string[]; kinshasa: Record<string, string[]>; pays: string[]; diasporaProvinces: Record<string, string[]> };
  etatsCivils: Record<string, string>;
  engagement: string;
  intro: string;
  documentMaxMo: number;
}

export interface MemberPayment {
  id: number;
  reference: string;
  libelle: string;
  montant: number;
  devise: "USD" | "CDF";
  montantLibelle: string;
  moyen: string;
  moyenLibelle: string;
  statut: "en_attente" | "reussi" | "echoue" | "annule";
  statutLibelle: string;
  simule: boolean;
  date: string | null;
  payeLe: string | null;
}

export interface MemberData {
  ok: boolean;
  message?: string;
  membre: MemberProfile;
  options: MemberOptions;
  paiements: MemberPayment[];
  adhesionPayee: boolean;
  paiement?: MemberPayment;
  instructions?: string[];
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T & { message?: string; errors?: Record<string, string[]> };
  message: string;
}

/** Appel au relais ; le message d'erreur est celui du serveur (premier champ en défaut sinon). */
export async function memberApi<T = MemberData>(path: string, locale: string, init: { method?: string; json?: unknown; form?: FormData } = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  } else if (init.form) {
    body = init.form;
  }
  try {
    // Le chemin peut porter ses propres paramètres (filtres de l'annuaire…)
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`/api/membre${path ? `/${path}` : ""}${sep}lang=${encodeURIComponent(locale)}`, { method: init.method || (body ? "POST" : "GET"), headers, body, cache: "no-store", credentials: "same-origin" });
    const data = (await res.json().catch(() => ({}))) as T & { message?: string; errors?: Record<string, string[]> };
    const first = data.errors ? Object.values(data.errors)[0]?.[0] : undefined;
    return { ok: res.ok && (data as { ok?: boolean }).ok !== false, status: res.status, data, message: first || data.message || "" };
  } catch {
    return { ok: false, status: 0, data: {} as T & { message?: string }, message: "" };
  }
}

/** Adresse d'une image privée du membre (carte, photo, pièce), servie par le relais. */
export const memberFile = (path: string, version?: string | number) => `/api/membre/${path}${version ? `?v=${version}` : ""}`;

export const STEPS: Step[] = ["identite", "adresse", "categorie", "documents", "engagement", "paiement"];

export const isRdc = (pays: string | null | undefined) => !pays || ["rd congo", "rdc"].includes(pays.trim().toLowerCase());

/** « 2 $ » ou « 5 700 FC ». */
export function amountLabel(n: number, devise: "USD" | "CDF", locale: string): string {
  const v = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : locale, { maximumFractionDigits: 2 }).format(n);
  return devise === "CDF" ? `${v} FC` : `${v} $`;
}
