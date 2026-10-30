import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdherer, getSite } from "@/lib/api";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import Donation, { MethodIcons } from "@/components/Donation";
import PageBanner from "@/components/PageBanner";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getAdherer(locale)]);
  const s = (k: string) => (typeof data.page[k] === "string" ? (data.page[k] as string) : "");
  return pageMetadata(locale, "/don", { title: s("donTitre") || t("Faire un don"), description: s("donTexte") || t("Chaque contribution finance la mobilisation, la communication et la défense de la vérité des urnes.") });
}

/**
 * Page Faire un don : le formulaire de contribution (montant en francs congolais ou en dollars,
 * carte bancaire Visa / Mastercard, Airtel Money, Orange Money, M-Pesa, Afrimoney, PayPal / banque),
 * les moyens acceptés et les contacts de la Trésorerie. Les textes viennent de l'administration
 * (Autres pages › Adhésion & Don), les moyens et numéros de l'écran Dons & adhésion.
 */
export default async function DonPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, site, t] = await Promise.all([getAdherer(locale), getSite(locale), getT(locale)]);
  const { paiement } = data;
  const s = (k: string) => (typeof data.page[k] === "string" ? (data.page[k] as string) : "");
  const title = s("donTitre") || t("Faire un don");
  return (
    <main id="main" className="flex-grow">
      <PageBanner eyebrow={s("donSurtitre") || t("Soutenir")} title={title} text={s("donTexte") || t("Chaque contribution finance la mobilisation, la communication et la défense de la vérité des urnes.")}>
        <div className="flex flex-wrap gap-3 shrink-0">
          <Link href={localePath(locale, "/adherer")} className="btn btn--outline-white">{t("Adhérer au parti")}</Link>
        </div>
      </PageBanner>

      <section className="bg-ecideBlue-50 py-16 lg:py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-8 reveal">
            <Suspense fallback={null}>
              <Donation config={paiement} title={s("donFormTitre") || t("Choisissez votre contribution")} text="" warning={s("donAvertissement")} />
            </Suspense>
          </div>
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-32">
            <div className="panel panel--white p-7 space-y-4 reveal">
              <h2 className="text-2xl text-ecideDarkBlue no-bar">{s("donMoyensTitre") || t("Moyens de paiement acceptés")}</h2>
              <ul className="divide-y divide-gray-200">
                {paiement.moyens.map((m) => (
                  <li key={m.key} className="py-3 flex items-center gap-4">
                    <span className="w-12 shrink-0 flex justify-center"><MethodIcons m={m} size="text-2xl" /></span>
                    <span className="font-semibold text-gray-900">{m.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="panel panel--dark p-7 space-y-4 reveal">
              <h2 className="text-2xl no-bar">{s("donAideTitre") || t("Questions sur les dons ?")}</h2>
              <p className="text-blue-100">{s("donAideTexte") || t("Écrivez à la Trésorerie du parti : un reçu peut vous être remis sur demande.")}</p>
              <div className="flex flex-wrap gap-3">
                <Link href={localePath(locale, "/contact")} className="btn btn--primary btn--sm">{t("Nous contacter")}</Link>
                <Link href={localePath(locale, site.cta.url || "/adherer")} className="btn btn--outline-white btn--sm">{t("Devenir membre")}</Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
