import type { Metadata } from "next";
import Link from "next/link";
import { getAdherer } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import { MethodIcons } from "@/components/Donation";
import PageBanner from "@/components/PageBanner";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getAdherer(locale)]);
  return pageMetadata(locale, "/adherer", { title: t("Adhésion & Don"), description: t("Rejoignez le parti via la plateforme officielle des membres et soutenez-le dès :min FC par Mobile Money, ou en dollars par PayPal et virement.", { min: formatNumber(data.paiement.cdf.min, locale) }) });
}

const TILE: Record<string, string> = { bleu: "icon-tile--dark", jaune: "icon-tile--yellow", vert: "icon-tile--green" };
const STEP_COLORS = ["bg-ecideBlue text-white", "bg-ecideYellow text-ecideDarkBlue", "bg-ecideGreen text-white"];

export default async function AdhererPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getAdherer(locale), getT(locale)]);
  const { page: ad, atouts, faq, paiement } = data;
  const s = (k: string) => (typeof ad[k] === "string" ? (ad[k] as string) : "");

  return (
    <main id="main" className="flex-grow">
      <PageBanner
        eyebrow={s("banniereSurtitre") || t("Agir")}
        title={s("banniereTitre") || t("Adhésion & Contribution Financière")}
        text={s("banniereTexte") ? s("banniereTexte").replace(/:min\b/g, formatNumber(data.paiement.cdf.min, locale)) : t("Rejoignez le parti via la plateforme officielle des membres et soutenez-le dès :min FC par Mobile Money, ou en dollars par PayPal et virement.", { min: formatNumber(data.paiement.cdf.min, locale) })}
      >
        {/* Les deux actions dès l'arrivée sur la page, sans faire défiler jusqu'aux blocs */}
        <div className="flex flex-wrap gap-3 shrink-0">
          <Link href={localePath(locale, "/espace-membre")} className="btn btn--primary">
            <i className="fa-solid fa-id-card" aria-hidden="true"></i>
            {s("plateformeBouton") || t("Adhérer en ligne")}
          </Link>
          <Link href={localePath(locale, "/espace-membre")} className="btn btn--outline-white">
            <i className="fa-regular fa-circle-user" aria-hidden="true"></i>
            {t("Espace membre")}
          </Link>
        </div>
      </PageBanner>

      {/* ESPACE MEMBRE : l'entrée unique des membres (le bandeau du site n'a plus de bouton à part) */}
      <section id="espace-membre" className="border-b border-gray-200 bg-white px-6 py-8 scroll-mt-32">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
          <div className="flex gap-4 min-w-0 lg:flex-1">
            <div className="icon-tile icon-tile--dark shrink-0"><i className="fa-regular fa-circle-user" aria-hidden="true"></i></div>
            <div className="min-w-0 space-y-2">
              <h2 className="text-2xl lg:text-3xl text-ecideDarkBlue no-bar">{t("Espace membre")}</h2>
              <p className="text-gray-600 text-sm">{t("Connectez-vous avec votre téléphone ou votre e-mail, sans mot de passe : un code vous est envoyé. Vous y suivez votre demande d'adhésion et, une fois membre, vous retrouvez :")}</p>
              <ul className="flex flex-wrap gap-2 pt-1" aria-label={t("Dans votre espace membre")}>
                {[
                  ["fa-id-card", t("Carte de membre")],
                  ["fa-calendar-days", t("Agenda")],
                  ["fa-wallet", t("Cotisations")],
                  ["fa-folder-open", t("Documents")],
                  ["fa-address-book", t("Annuaire")],
                  ["fa-newspaper", t("Actualités")],
                ].map(([icon, label]) => (
                  <li key={icon} className="inline-flex items-center gap-2 bg-ecideBlue-50 text-ecideDarkBlue text-xs font-semibold px-3 py-1.5">
                    <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:w-80">
            <Link href={localePath(locale, "/espace-membre")} className="btn btn--dark">
              <i className="fa-solid fa-right-to-bracket" aria-hidden="true"></i>
              {s("espaceLibelle") || t("Accéder à mon espace membre")}
            </Link>
            <Link href={localePath(locale, "/espace-membre")} className="btn btn--outline">
              <i className="fa-solid fa-id-card" aria-hidden="true"></i>
              {s("plateformeBouton") || t("Adhérer en ligne")}
            </Link>
          </div>
        </div>
      </section>

      {atouts.length > 0 && (
        <section className="bg-ecideBlue-50 py-16 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 cols-rule">
            {atouts.map((a, i) => {
              return (
                <div key={i} className="flex gap-4 reveal">
                  <div className={`icon-tile shrink-0 ${TILE[a.couleur] || "icon-tile--dark"}`}><i className={`fa-solid ${a.icone}`} aria-hidden="true"></i></div>
                  <div>
                    <h2 className="text-2xl text-gray-900">{a.titre}</h2>
                    <p className="text-gray-600 text-sm">{a.texte}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="py-20 lg:py-28 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start">
          {/* ADHÉSION : PLATEFORME OFFICIELLE DES MEMBRES */}
          <div id="carte" className="panel p-8 lg:p-10 space-y-10 reveal">
            <div>
              <h2 className="text-4xl text-ecideDarkBlue no-bar">{s("plateformeTitre") || t("Devenir membre")}</h2>
              <p className="text-gray-600 mt-2">{s("plateformeTexte")}</p>
            </div>
            {ad.etapes.length > 0 && (
              <ol className="space-y-5">
                {ad.etapes.map((e, i) => (
                  <li key={i} className="flex gap-4">
                    <span className={`w-10 h-10 shrink-0 ${STEP_COLORS[i % 3]} font-display text-xl flex items-center justify-center`} aria-hidden="true">{i + 1}</span>
                    <div>
                      <p className="font-bold text-gray-900">{e.titre}</p>
                      {e.texte && <p className="text-sm text-gray-600">{e.texte}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <Link href={localePath(locale, "/espace-membre")} className="btn btn--dark btn--lg w-full">
              <i className="fa-solid fa-id-card" aria-hidden="true"></i>
              {s("plateformeBouton") || t("Adhérer en ligne")}
            </Link>
            <p className="text-sm text-gray-600 text-center">
              {t("Déjà membre ?")} <Link href={localePath(locale, "/espace-membre")} className="font-semibold text-ecideDarkBlue underline decoration-ecideYellow decoration-2 underline-offset-4 hover:text-ecideBlue">{s("espaceLibelle") || t("Accéder à mon espace membre")}</Link>
            </p>
            {s("avertissement") && (
              <div className="bg-white border-l-4 border-ecideYellow p-5 text-sm text-gray-700 flex gap-3">
                <i className="fa-solid fa-shield-halved text-ecideYellow-700 mt-0.5" aria-hidden="true"></i>
                <p>{s("avertissement")}</p>
              </div>
            )}
          </div>

          {/* DON : le formulaire est sur sa page ; ici l'appel, les moyens acceptés et le bouton */}
          <div id="don" className="panel panel--dark p-8 lg:p-10 space-y-6 reveal scroll-mt-32">
            <div className="space-y-3">
              <span className="eyebrow">{t("Soutenir le Combat (Don)")}</span>
              <h2 className="text-3xl no-bar">{s("donTitre") || t("Faire un don")}</h2>
              {s("donTexte") && <p className="text-blue-100 leading-relaxed">{s("donTexte")}</p>}
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-3" aria-label={t("Moyens de paiement acceptés")}>
              {paiement.moyens.map((m) => (
                <li key={m.key} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100"><MethodIcons m={m} size="text-xl" light />{m.court}</li>
              ))}
            </ul>
            <Link href={localePath(locale, "/don")} className="btn btn--primary btn--lg">
              <i className="fa-solid fa-hand-holding-heart text-sm" aria-hidden="true"></i>
              {t("Faire un don")}
            </Link>
          </div>
        </div>
      </section>

      {faq.length > 0 && (
        <section className="bg-ecideDarkBlue text-white py-28 lg:py-32 px-6 diag">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="space-y-4 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{s("faqSurtitre") || t("Questions fréquentes")}</span>
              <h2 className="text-4xl lg:text-5xl">{s("faqTitre") || t("Tout savoir sur l'adhésion")}</h2>
            </div>
            <div className="space-y-4 reveal">
              {faq.map((f, i) => (
                <details key={i} className="bg-white text-gray-900 p-6 group">
                  <summary className="flex justify-between items-center gap-4 font-display font-semibold text-xl text-ecideDarkBlue">
                    <span className="min-w-0">{f.question}</span>
                    <i className="fa-solid fa-plus faq-icon text-ecideDarkBlue shrink-0" aria-hidden="true"></i>
                  </summary>
                  <p className="mt-4 text-gray-700">{f.reponse}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
