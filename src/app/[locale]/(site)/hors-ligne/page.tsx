import type { Metadata } from "next";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT } from "@/lib/server";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  return { title: t("Hors ligne"), robots: { index: false, follow: false } };
}

/**
 * Page servie par le service worker (public/sw.js) quand une page demandée n'est pas disponible
 * sans connexion. Simples liens, sans script : elle fonctionne même si rien d'autre n'est gardé.
 */
export default async function OfflinePage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  return (
    <main id="main" className="flex-grow">
      <section className="py-24 px-6 bg-ecideDarkBlue text-white diag flex-grow">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-5xl">{t("Vous êtes hors ligne")}</h1>
          <p className="text-lg text-blue-100">{t("Cette page n'a pas encore été consultée sur cet appareil et ne peut pas s'afficher sans connexion. Les pages déjà ouvertes restent disponibles.")}</p>
          <p className="text-base text-blue-100">{t("Une demande d'adhésion commencée est gardée sur cet appareil : vous la retrouverez au retour de la connexion.")}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {/* Lien vers l'adresse courante : recharge la page demandée */}
            <a href="?" className="btn btn--primary btn--lg">{t("Réessayer")}</a>
            <a href={localePath(locale, "/")} className="btn btn--outline-white btn--lg">{t("Retour à l'accueil")}</a>
          </div>
        </div>
      </section>
    </main>
  );
}
