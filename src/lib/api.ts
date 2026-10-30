import { cache } from "react";
import type { Locale } from "./locales";
import type {
  ActualitesPage,
  AdhererPage,
  Article,
  CadresData,
  ContactPage,
  DiasporaPage,
  HomePage,
  I18n,
  MentionsPage,
  PartiPage,
  PresidentPage,
  Site,
} from "./types";

/** Adresse de l'API Laravel (voir .env.local). */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

/** Étiquette de cache commune : Laravel la rafraîchit via /api/revalidate à chaque enregistrement. */
export const CACHE_TAG = "ecide";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, locale: Locale, init?: RequestInit): Promise<T> {
  const url = `${API_URL}/api/v1${path}${path.includes("?") ? "&" : "?"}lang=${locale}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "Accept-Language": locale },
    next: { revalidate: 60, tags: [CACHE_TAG] },
    ...init,
  });
  if (!res.ok) {
    throw new ApiError(res.status, `API ${res.status} : ${path}`);
  }
  return (await res.json()) as T;
}

/* Lecture (composants serveur) : chaque appel est dédoublonné par rendu grâce à cache(). */
export const getSite = cache((locale: Locale) => request<Site>("/site", locale));
export const getI18n = cache((locale: Locale) => request<I18n>(`/i18n/${locale}`, locale));
export const getHome = cache((locale: Locale) => request<HomePage>("/pages/home", locale));
export const getParti = cache((locale: Locale) => request<PartiPage>("/pages/parti", locale));
export const getPresident = cache((locale: Locale) => request<PresidentPage>("/pages/president", locale));
export const getActualites = cache((locale: Locale) => request<ActualitesPage>("/pages/actualites", locale));
export const getCadres = cache((locale: Locale) => request<CadresData>("/pages/cadres", locale));
export const getDiaspora = cache((locale: Locale) => request<DiasporaPage>("/pages/diaspora", locale));
export const getContact = cache((locale: Locale) => request<ContactPage>("/pages/contact", locale));
export const getAdherer = cache((locale: Locale) => request<AdhererPage>("/pages/adherer", locale));
export const getMentions = cache((locale: Locale) => request<MentionsPage>("/pages/mentions", locale));

/** Article par slug ; null si inconnu (page 404). */
export const getArticle = cache(async (locale: Locale, slug: string): Promise<Article | null> => {
  try {
    return await request<Article>(`/news/${encodeURIComponent(slug)}`, locale);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
});

/* Écriture (composants client) : formulaires et service de traduction. */
export interface FormResult {
  ok: boolean;
  message: string;
  reference?: string;
  email?: string;
}

export type DonStatut = "en_attente" | "reussi" | "echoue" | "annule";

/** Réponse de l'API pour un don : statut, message au donateur, redirection (carte) ou instructions (Mobile Money, PayPal). */
export interface DonResult {
  ok: boolean;
  message: string;
  reference?: string;
  statut?: DonStatut;
  final?: boolean;
  redirectUrl?: string | null;
  instructions?: string[];
  montant?: number;
  devise?: string;
  moyen?: string;
}

/** Enregistre un don et lance le paiement (POST /forms/don). Le corps de la réponse est renvoyé même en cas de refus (message, statut). */
export async function postDon(locale: string, payload: Record<string, unknown>): Promise<DonResult> {
  const res = await fetch(`${API_URL}/api/v1/forms/don?lang=${locale}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Language": locale },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as DonResult & { errors?: Record<string, string[]> };
  const first = body.errors ? Object.values(body.errors)[0]?.[0] : undefined;
  return { ...body, ok: res.ok && body.ok !== false, message: first || body.message || "" };
}

/** Statut d'un don (GET /forms/don/{reference}) ; null si la référence est inconnue ou le serveur injoignable. */
export async function getDonStatus(reference: string, locale: string): Promise<DonResult | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/forms/don/${encodeURIComponent(reference)}?lang=${locale}`, { headers: { Accept: "application/json", "Accept-Language": locale }, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as DonResult;
  } catch {
    return null;
  }
}

export async function postForm(endpoint: string, locale: string, payload: Record<string, unknown>): Promise<FormResult> {
  const res = await fetch(`${API_URL}/api/v1/forms/${endpoint}?lang=${locale}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Language": locale },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; reference?: string; email?: string; errors?: Record<string, string[]> };
  if (!res.ok) {
    const first = body.errors ? Object.values(body.errors)[0]?.[0] : undefined;
    return { ok: false, message: first || body.message || "" };
  }
  return { ok: true, message: body.message || "", reference: body.reference, email: body.email };
}
