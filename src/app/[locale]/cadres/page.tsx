import type { Metadata } from "next";
import Link from "next/link";
import { getCadres } from "@/lib/api";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import CadresDirectory from "@/components/CadresDirectory";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getCadres(locale)]);
  return pageMetadata(locale, "/cadres", { title: data.page?.titre || t("Cadres du parti"), description: data.page?.texte || t("Organes nationaux, secrétariats provinciaux exécutifs, sections et cellules, province par province. Trouvez la structure la plus proche de chez vous et ses coordonnées.") });
}

export default async function CadresPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getCadres(locale), getT(locale)]);

  const page = data.page || {};

  return (
    <main id="main" className="flex-grow">
      <section className="py-14 lg:py-16 px-6 max-w-7xl mx-auto space-y-8 relative overflow-hidden">
        <i className="fa-solid fa-map-location-dot watermark-icon watermark-icon--xl text-ecideBlue" aria-hidden="true"></i>
        <CadresDirectory data={data} locale={locale}>
          <div className="space-y-2 max-w-xl">
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{page.surtitre || t("Sur le territoire national")}</span>
            <h1 className="text-4xl font-black text-ecideDarkBlue">{page.titre || t("L'ECiDé en République démocratique du Congo")}</h1>
            <p className="text-gray-600">{page.texte || t("Organes nationaux, secrétariats provinciaux exécutifs, sections et cellules, province par province. Trouvez la structure la plus proche de chez vous et ses coordonnées.")}</p>
          </div>
        </CadresDirectory>
        <p className="text-center text-sm text-gray-500 italic">{t("Les noms et profils publics des cadres sont publiés après validation par le Secrétariat Général ; leurs numéros personnels ne sont jamais affichés : pour joindre un cadre, contactez sa structure. « À confirmer » signale un poste dont le titulaire n'est pas encore renseigné.")}</p>
      </section>

      <section className="bg-ecideBlue-50 text-gray-900 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6 reveal">
          <h2 className="text-3xl md:text-4xl font-black">{t("Vous êtes cadre ou responsable de structure ?")}</h2>
          <p className="text-gray-600 text-lg">{t("Transmettez vos coordonnées officielles au Secrétariat Général pour figurer dans l'annuaire du parti.")}</p>
          <Link href={localePath(locale, "/contact")} className="inline-flex items-center gap-2 bg-ecideBlue text-white font-bold px-8 py-4 hover:bg-ecideDarkBlue transition text-lg">{t("Contacter le Secrétariat")} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>
        </div>
      </section>
    </main>
  );
}
