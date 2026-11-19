import type { ReactNode } from "react";
import "@/components/member/member-app.css";
import { getSite } from "@/lib/api";
import { isLocale } from "@/lib/locales";
import MemberShell from "@/components/member/MemberShell";

/**
 * Espace membre : une application, hors du cadre du site public (pas d'en-tête, de pied de page
 * ni d'assistant, aucune police à télécharger). Toutes les pages partagent la session (connexion
 * par code), la navigation du membre (barre latérale sur ordinateur, onglets en bas sur téléphone),
 * la cloche des notifications et le thème sombre (MemberShell).
 */
export default async function EspaceMembreLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "fr";
  const site = await getSite(locale);
  return (
    <MemberShell languages={site.languages.map((l) => ({ code: l.code, nom: l.nom }))} logo={site.assets.logo || "/assets/img/logo-160.png"} siteName={site.params.nom || "ECiDé"}>
      {children}
    </MemberShell>
  );
}
