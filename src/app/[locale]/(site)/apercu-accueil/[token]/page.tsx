import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError, getHomePreview } from "@/lib/api";
import { isLocale } from "@/lib/locales";
import { HomeView } from "../../page";

/**
 * Aperçu de la page d'accueil pour l'administration : la vraie page, avec les modifications pas
 * encore enregistrées (brouillons gardés 30 minutes sous un jeton aléatoire par Laravel).
 * Jamais mise en cache ni indexée ; un jeton inconnu ou expiré donne une page introuvable.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Aperçu", robots: { index: false, follow: false } };

export default async function HomePreviewPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  if (!isLocale(locale) || !/^[a-z0-9]{40}$/.test(token)) notFound();
  const home = await getHomePreview(locale, token).catch((e) => {
    if (e instanceof ApiError) return null;
    throw e;
  });
  if (!home || !home.apercu) notFound();
  return <HomeView locale={locale} home={home} />;
}
