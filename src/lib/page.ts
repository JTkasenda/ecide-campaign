import "server-only";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./locales";

export type PageParams = { params: Promise<{ locale: string }> };
export type ArticleParams = { params: Promise<{ locale: string; slug: string }> };

/** Langue d'une page du segment [locale] ; 404 si le code est inconnu. */
export async function pageLocale(params: PageParams["params"]): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}
