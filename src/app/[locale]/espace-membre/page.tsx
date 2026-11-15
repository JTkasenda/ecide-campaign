import type { Metadata } from "next";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import MemberHome from "@/components/member/MemberHome";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  const meta = await pageMetadata(locale, "/espace-membre", { title: t("Espace membre"), description: t("Adhérez en ligne et retrouvez votre carte de membre de l'ECiDé.") });
  // Espace personnel : jamais indexé
  return { ...meta, robots: { index: false, follow: false } };
}

/**
 * Espace membre : connexion par code (téléphone ou e-mail), demande d'adhésion en ligne, suivi,
 * puis accueil du membre (le cadre commun est dans layout.tsx / MemberShell).
 */
export default async function EspaceMembrePage({ params }: PageParams) {
  await pageLocale(params);
  return <MemberHome />;
}
