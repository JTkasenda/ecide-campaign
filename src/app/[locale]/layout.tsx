import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../globals.css";
import { getI18n, getSite } from "@/lib/api";
import { siteTextVars } from "@/lib/format";
import { I18nProvider } from "@/lib/i18n";
import { LOCALES, isLocale } from "@/lib/locales";
import { SITE_AUTHOR, SITE_URL } from "@/lib/server";
import TypographyPreview from "@/components/TypographyPreview";
import OfflineSupport from "@/components/OfflineSupport";

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
    icons: { icon: site.assets.favicon || "/assets/img/favicon-64.png", apple: site.assets.logo || "/assets/img/logo-160.png" },
  };
}

/**
 * Gabarit racine (une instance par langue), commun au site public et à l'espace membre :
 * document, dictionnaire d'interface pour les composants client, icônes, service worker et
 * bandeau « hors ligne ». Le cadre du site public (en-tête, pied de page, assistant, polices)
 * est dans (site)/layout.tsx ; l'espace membre a son propre cadre d'application
 * (espace-membre/layout.tsx), sans polices à télécharger.
 */
export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [site, i18n] = await Promise.all([getSite(locale), getI18n(locale)]);

  return (
    // suppressHydrationWarning : les extensions de navigateur (gestionnaires de mots de passe,
    // correcteurs, traducteurs) ajoutent des attributs à <html>/<body> avant l'hydratation
    // Tailles des textes réglées dans l'administration (générale et par famille) : variables CSS
    // que globals.css applique à toutes les tailles de texte Tailwind et aux styles maison ;
    // polices de Paramètres › Typographie : elles remplacent les --font-* de globals.css
    <html lang={locale} suppressHydrationWarning style={{ ...siteTextVars(site.params), ...(site.params.polices?.vars || {}) }}>
      <head>
        <meta name="theme-color" content={site.params.bleu || "#003399"} />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body className="bg-white text-gray-800 font-sans flex flex-col min-h-screen" suppressHydrationWarning>
        <I18nProvider locale={locale} strings={i18n.strings}>
          {children}
          <TypographyPreview />
          <OfflineSupport />
        </I18nProvider>
      </body>
    </html>
  );
}
