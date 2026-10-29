import type { Metadata } from "next";
import { getAdherer } from "@/lib/api";
import { formatNumber, tint, safeUrl } from "@/lib/format";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import Donation from "@/components/Donation";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getAdherer(locale)]);
  return pageMetadata(locale, "/adherer", { title: t("Adhésion & Don"), description: t("Rejoignez le parti via la plateforme officielle des membres et soutenez-le dès :min FC par Mobile Money, ou en dollars par PayPal et virement.", { min: formatNumber(data.paiement.cdf.min, locale) }) });
}

const STEP_COLORS = ["bg-ecideBlue text-white", "bg-ecideYellow text-ecideDarkBlue", "bg-ecideGreen text-white"];

export default async function AdhererPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getAdherer(locale), getT(locale)]);
  const { page: ad, atouts, faq, paiement } = data;
  const s = (k: string) => (typeof ad[k] === "string" ? (ad[k] as string) : "");

  return (
    <main id="main" className="flex-grow">
      <h1 className="sr-only">{t("Adhésion & Contribution Financière")}</h1>

      {atouts.length > 0 && (
        <section className="bg-white py-16 px-6 border-b border-gray-200">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {atouts.map((a, i) => {
              const tt = tint(a.couleur);
              return (
                <div key={i} className="flex gap-4 reveal">
                  <div className={`w-12 h-12 shrink-0 rounded-lg ${tt.bg} ${tt.text} flex items-center justify-center text-xl`}><i className={`fa-solid ${a.icone}`} aria-hidden="true"></i></div>
                  <div>
                    <h2 className="font-bold text-lg text-gray-900">{a.titre}</h2>
                    <p className="text-gray-600 text-sm">{a.texte}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* ADHÉSION : PLATEFORME OFFICIELLE DES MEMBRES */}
          <div id="carte" className="bg-white p-8 lg:p-10 shadow-soft space-y-8 reveal">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{s("plateformeTitre") || t("Devenir membre")}</h2>
              <p className="text-gray-600 mt-2">{s("plateformeTexte")}</p>
            </div>
            {ad.etapes.length > 0 && (
              <ol className="space-y-5">
                {ad.etapes.map((e, i) => (
                  <li key={i} className="flex gap-4">
                    <span className={`w-10 h-10 shrink-0 rounded-lg ${STEP_COLORS[i % 3]} font-display text-xl flex items-center justify-center`} aria-hidden="true">{i + 1}</span>
                    <div>
                      <p className="font-bold text-gray-900">{e.titre}</p>
                      {e.texte && <p className="text-sm text-gray-600">{e.texte}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <a href={safeUrl(ad.plateformeUrl)} target="_blank" rel="noopener" className="w-full flex flex-wrap items-center justify-center gap-3 bg-ecideBlue text-white font-bold px-4 py-4 text-xl text-center hover:bg-ecideDarkBlue transition">
              <i className="fa-solid fa-id-card" aria-hidden="true"></i>
              {s("plateformeBouton") || t("Adhérer sur la plateforme")} <i className="fa-solid fa-arrow-up-right-from-square text-sm opacity-80" aria-hidden="true"></i>
            </a>
            {s("espaceLibelle") && (
              <p className="text-sm text-gray-600 text-center">
                {t("Déjà membre ?")} <a href={safeUrl(ad.espaceUrl)} target="_blank" rel="noopener" className="text-ecideBlue font-bold hover:text-ecideDarkBlue">{s("espaceLibelle")}</a>
              </p>
            )}
            {s("avertissement") && (
              <div className="bg-ecideYellow-50 border border-ecideYellow-100 p-5 text-sm text-gray-700 flex gap-3">
                <i className="fa-solid fa-shield-halved text-ecideYellow-700 mt-0.5" aria-hidden="true"></i>
                <p>{s("avertissement")}</p>
              </div>
            )}
          </div>

          {/* DON */}
          <Donation
            config={paiement}
            title={s("donTitre") || t("Soutenir le Combat (Don)")}
            text={s("donTexte")}
            warning={s("donAvertissement")}
          />
        </div>
      </section>

      {faq.length > 0 && (
        <section className="bg-white py-24 px-6 border-t border-gray-200">
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="text-center space-y-4 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{s("faqSurtitre") || t("Questions fréquentes")}</span>
              <h2 className="text-4xl font-black text-ecideDarkBlue">{s("faqTitre") || t("Tout savoir sur l'adhésion")}</h2>
            </div>
            <div className="space-y-4 reveal">
              {faq.map((f, i) => (
                <details key={i} className="bg-gray-50 border border-gray-200 p-6 group">
                  <summary className="flex justify-between items-center gap-4 font-bold text-lg text-gray-900">
                    <span className="min-w-0">{f.question}</span>
                    <i className="fa-solid fa-plus faq-icon text-ecideBlue shrink-0" aria-hidden="true"></i>
                  </summary>
                  <p className="mt-4 text-gray-600">{f.reponse}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
