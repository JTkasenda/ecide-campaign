import type { Metadata } from "next";
import { getDiaspora } from "@/lib/api";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import DiasporaDirectory from "@/components/DiasporaDirectory";
import FederationForm from "@/components/FederationForm";
import PageBanner, { BannerStats } from "@/components/PageBanner";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getDiaspora(locale)]);
  return pageMetadata(locale, "/diaspora", { title: t("Diaspora"), description: (data.page.texte as string) || "" });
}

export default async function DiasporaPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getDiaspora(locale), getT(locale)]);
  const dp = data.page;
  const s = (k: string) => (typeof dp[k] === "string" ? (dp[k] as string) : "");
  const entries = data.data.entries;
  const nbPays = new Set(entries.map((e) => e.pays)).size;
  const nbVilles = new Set(entries.filter((e) => (e.type || (e.ville ? "section" : "spe")) === "section").map((e) => e.pays + "/" + e.ville)).size;

  return (
    <main id="main" className="flex-grow">
      <PageBanner eyebrow={s("surtitre") || t("Réseau mondial")} title={s("titre") || t("Diaspora")} text={s("texte")}>
        <BannerStats items={[[data.data.continents.length, t("continents")], [nbPays, t("pays")], [nbVilles, t("sections locales")]]} />
      </PageBanner>
      <section className="py-16 lg:py-20 px-6 max-w-7xl mx-auto space-y-10">
        <DiasporaDirectory data={data.data} locale={locale} />
        {/* Téléphone et tablette : l'annuaire seul ; l'avertissement sur ordinateur */}
        <p className="mob-hide text-center text-sm text-gray-500 italic relative">{s("avertissement") || t("Les noms et profils publics des responsables sont publiés après validation par la Coordination de la Diaspora ; leurs numéros personnels ne sont jamais affichés : utilisez les coordonnées du secrétariat provincial exécutif ou de la section. « À confirmer » signale un poste dont le titulaire n'est pas encore renseigné.")}</p>
      </section>

      <section id="rejoindre" className="scroll-mt-24 py-28 lg:py-32 px-6 bg-ecideDarkBlue text-white diag">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-6 reveal">
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{s("rejoindreSurtitre") || t("Mobilisation")}</span>
            <h2 className="text-4xl lg:text-5xl">{s("rejoindreTitre")}</h2>
            <p className="mob-hide text-lg text-blue-100 leading-relaxed">{s("rejoindreTexte")}</p>
            <ul className="space-y-3 text-blue-50 font-serif">
              {dp.avantages.map((a, i) => (
                <li key={i} className="flex items-start gap-3"><i className="fa-solid fa-circle-check text-ecideYellow mt-1" aria-hidden="true"></i> {a}</li>
              ))}
            </ul>
          </div>
          <FederationForm
            choix={dp.choix}
            confirmation={dp.confirmation}
            labels={{ name: t("Nom & Prénom"), country: t("Pays de résidence"), countryExample: t("Ex : France"), city: t("Ville"), contact: t("WhatsApp ou e-mail"), wish: t("Je souhaite"), submit: t("Envoyer ma demande") }}
          />
        </div>
      </section>
    </main>
  );
}
