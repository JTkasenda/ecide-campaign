import type { Metadata } from "next";
import { getSite } from "@/lib/api";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import CardCheck from "@/components/CardCheck";
import PageBanner from "@/components/PageBanner";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  return pageMetadata(locale, "/verifier", {
    title: t("Vérifier une carte de membre"),
    description: t("Ambassades, services consulaires, d'immigration et d'asile : vérifiez qu'une personne est bien membre de l'ECiDé, par son numéro de carte et son nom."),
  });
}

/**
 * Espace public de vérification des cartes de membre, pour les services étrangers, ambassades et
 * services d'asile. La réponse dit seulement si le numéro et l'identité correspondent à un membre en
 * règle : la liste des membres n'est jamais consultable.
 */
export default async function VerifierIndexPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [t, site] = await Promise.all([getT(locale), getSite(locale)]);
  const email = site.params.email;

  return (
    <main id="main" className="flex-grow">
      <PageBanner
        eyebrow={t("Ambassades, services consulaires, d'immigration et d'asile")}
        title={t("Vérifier une carte de membre")}
        text={t("Une personne se présente comme membre de l'ECiDé ? Saisissez le numéro de sa carte et son nom, ou scannez le QR code imprimé au verso.")}
      />
      <section className="py-20 lg:py-28 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-7">
            <CardCheck locale={locale} />
          </div>
          <aside className="lg:col-span-5 space-y-8 text-gray-700 leading-relaxed">
            <div className="space-y-3">
              <h2 className="text-2xl text-ecideDarkBlue">{t("Ce que dit la réponse")}</h2>
              <p>
                <strong className="text-ecideGreen">{t("Confirmé")}</strong> : {t("le numéro et le nom correspondent à un membre en règle, dont la carte est valide aujourd'hui.")}
              </p>
              <p>
                <strong className="text-red-700">{t("Non confirmé")}</strong> : {t("le numéro et le nom ne correspondent pas à un membre en règle, ou la carte n'est plus valide.")}
              </p>
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl text-ecideDarkBlue">{t("Protection des membres")}</h2>
              <p>{t("Aucune information personnelle n'est communiquée : le site confirme ou non l'identité saisie, rien de plus. La liste des membres n'est pas consultable et le nombre de vérifications est limité.")}</p>
              <p>{t("Comparez aussi le nom et la photo de la carte avec la pièce d'identité de la personne.")}</p>
            </div>
            {email && (
              <div className="space-y-3">
                <h2 className="text-2xl text-ecideDarkBlue">{t("Attestation écrite")}</h2>
                <p>{t("Pour une attestation officielle d'appartenance, écrivez au Secrétariat général en indiquant le numéro de carte et votre service :")}</p>
                <a href={`mailto:${email}`} className="font-semibold text-ecideBlue hover:text-ecideDarkBlue break-all">{email}</a>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
