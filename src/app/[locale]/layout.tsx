import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../globals.css";
import { getI18n, getSite } from "@/lib/api";
import { siteTextVars } from "@/lib/format";
import { I18nProvider } from "@/lib/i18n";
import { DEFAULT_LOCALE, LOCALES, isLocale } from "@/lib/locales";
import { getT, SITE_AUTHOR, SITE_URL } from "@/lib/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import RevealObserver from "@/components/RevealObserver";

export const dynamicParams = true;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const site = await getSite(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${site.params.nom || "ECiDé"} - ${site.params.nomLong || ""}`, template: `%s | ${site.params.nom || "ECiDé"}` },
    description: site.params.description || "",
    authors: [SITE_AUTHOR],
    creator: SITE_AUTHOR.name,
    publisher: site.params.nom || "ECiDé",
    icons: { icon: "/assets/img/favicon-64.png", apple: "/assets/img/logo-160.png" },
  };
}

/**
 * Gabarit racine (une instance par langue) : en-tête, pied de page, dictionnaire
 * d'interface pour les composants client, polices et icônes.
 */
export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [site, t, i18n] = await Promise.all([getSite(locale), getT(locale), locale === DEFAULT_LOCALE ? Promise.resolve({ strings: {} }) : getI18n(locale)]);

  return (
    // suppressHydrationWarning : les extensions de navigateur (gestionnaires de mots de passe,
    // correcteurs, traducteurs) ajoutent des attributs à <html>/<body> avant l'hydratation
    // Tailles des textes réglées dans l'administration (générale et par famille) : variables CSS
    // que globals.css applique à toutes les tailles de texte Tailwind et aux styles maison
    <html lang={locale} suppressHydrationWarning style={siteTextVars(site.params)}>
      <head>
        <meta name="theme-color" content={site.params.bleu || "#003399"} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body className="bg-white text-gray-800 font-sans flex flex-col min-h-screen" suppressHydrationWarning>
        <I18nProvider locale={locale} strings={i18n.strings}>
          <a href="#main" className="skip-link">{t("Aller au contenu principal")}</a>
          <Header site={site} locale={locale} />
          {children}
          <Footer site={site} locale={locale} />
          <BackToTop label={t("Retour en haut de la page")} />
          <RevealObserver />
        </I18nProvider>
      </body>
    </html>
  );
}
