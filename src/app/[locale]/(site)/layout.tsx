import type { ReactNode } from "react";
import { preconnect } from "react-dom";
import { getSite } from "@/lib/api";
import { isLocale } from "@/lib/locales";
import { getT } from "@/lib/server";
import Header from "@/components/Header";
import Breadcrumbs from "@/components/Breadcrumbs";
import MobileActionBar from "@/components/MobileActionBar";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import Assistant from "@/components/Assistant";
import RevealObserver from "@/components/RevealObserver";

/** Polices d'origine, si l'API ne transmet pas encore le choix de Paramètres › Typographie. */
const DEFAULT_FONTS = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=Source+Sans+3:wght@400;600;700&display=swap";

/**
 * Cadre du site public (groupe de routes sans effet sur les adresses) : polices du site,
 * lien d'évitement, en-tête, fil d'Ariane, pied de page, retour en haut, barre d'action mobile
 * et assistant. L'espace membre, hors de ce groupe, n'en charge rien.
 */
export default async function SiteLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "fr";
  const [site, t] = await Promise.all([getSite(locale), getT(locale)]);
  preconnect("https://fonts.googleapis.com");
  preconnect("https://fonts.gstatic.com", { crossOrigin: "anonymous" });

  return (
    <>
      {/* Remontée dans <head> par React (precedence) ; data-site-fonts : aperçu de la typographie */}
      <link href={site.params.polices?.url || DEFAULT_FONTS} rel="stylesheet" precedence="fonts" data-site-fonts="" />
      <a href="#main" className="skip-link">{t("Aller au contenu principal")}</a>
      <Header site={site} locale={locale} />
      <Breadcrumbs site={site} locale={locale} />
      {children}
      <Footer site={site} locale={locale} />
      <BackToTop label={t("Retour en haut de la page")} />
      <MobileActionBar site={site} locale={locale} />
      <Assistant locale={locale} />
      <RevealObserver />
    </>
  );
}
