import type { Metadata } from "next";
import Link from "next/link";
import { getCadres } from "@/lib/api";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import CadresDirectory from "@/components/CadresDirectory";
import PageBanner, { BannerStats } from "@/components/PageBanner";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getCadres(locale)]);
  return pageMetadata(locale, "/cadres", { title: data.page?.titre || t("Cadres du parti"), description: data.page?.texte || t("Congrès, Conseil national et Bureau national ; secrétariats provinciaux exécutifs, sections, sous-sections, cellules et noyaux, province par province ; organisations affiliées. Trouvez la structure la plus proche de chez vous et ses coordonnées.") });
}

export default async function CadresPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getCadres(locale), getT(locale)]);

  const page = data.page || {};
  const stats = data.stats || { nationaux: 0, spe: 0, sections: 0, cellules: 0, places: 0 };
  const locales = stats.sections + (stats.soussections || 0) + stats.cellules + (stats.places || 0);

  return (
    <main id="main" className="flex-grow">
      <PageBanner eyebrow={page.surtitre || t("Sur le territoire national")} title={page.titre || t("L'ECiDé en République démocratique du Congo")} text={page.texte || t("Congrès, Conseil national et Bureau national ; secrétariats provinciaux exécutifs, sections, sous-sections, cellules et noyaux, province par province ; organisations affiliées. Trouvez la structure la plus proche de chez vous et ses coordonnées.")}>
        <BannerStats items={[[stats.spe, t("secrétariats provinciaux")], [stats.sections, t("sections")], [locales, t("structures locales")]]} />
      </PageBanner>
      <section className="py-12 lg:py-16 px-6 max-w-7xl mx-auto space-y-8">
        <CadresDirectory data={data} locale={locale} />
        <p className="text-center text-sm text-gray-500 italic">{t("Les noms et profils publics des cadres sont publiés après validation par le Secrétariat Général ; leurs numéros personnels ne sont jamais affichés : pour joindre un cadre, contactez sa structure. « À confirmer » signale un poste dont le titulaire n'est pas encore renseigné.")}</p>
      </section>

      <section className="bg-ecideDarkBlue text-white py-20 px-6 diag">
        <div className="max-w-4xl mx-auto space-y-6 reveal">
          <h2 className="text-4xl lg:text-5xl">{t("Vous êtes cadre ou responsable de structure ?")}</h2>
          <p className="text-blue-100 text-lg">{t("Transmettez vos coordonnées officielles au Secrétariat Général pour figurer dans l'annuaire du parti.")}</p>
          <Link href={localePath(locale, "/contact")} className="btn btn--primary btn--lg">{t("Contacter le Secrétariat")}</Link>
        </div>
      </section>
    </main>
  );
}
