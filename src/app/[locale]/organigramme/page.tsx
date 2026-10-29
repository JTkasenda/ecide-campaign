import type { Metadata } from "next";
import Link from "next/link";
import { getParti } from "@/lib/api";
import { pad2, tint } from "@/lib/format";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import PageBanner from "@/components/PageBanner";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, data] = await Promise.all([getT(locale), getParti(locale)]);
  return pageMetadata(locale, "/organigramme", { title: t("Organigramme"), description: data.page.orgaTexte || data.parti.intro });
}

/** Organigramme du parti : les organes (du national au local), puis les catégories de membres. */
export default async function OrganigrammePage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getParti(locale), getT(locale)]);
  const { page: pp, organes, membres = [] } = data;
  const n = organes.length;

  const orgCard = (o: { titre: string; texte: string; icone: string }, tone: string) => {
    const low = o.titre.toLowerCase();
    let extra = null;
    if (low.includes("diaspora")) extra = <Link href={localePath(locale, "/diaspora")} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue">{t("Voir la diaspora")} →</Link>;
    if (low.includes("provinci")) extra = <Link href={`${localePath(locale, "/cadres")}#niveau=provincial`} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue">{t("Voir les secrétariats provinciaux")} →</Link>;
    if (low.includes("section") || low.includes("cellule")) extra = <Link href={`${localePath(locale, "/cadres")}#niveau=provincial`} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue">{t("Trouver ma section")} →</Link>;
    return (
      <div className={`org-card org-card--${tone}`}>
        <i className={`fa-solid ${o.icone}`} aria-hidden="true"></i>
        <div>
          <h3 className="text-lg text-gray-900">{o.titre}</h3>
          <p className="text-sm text-gray-600">{o.texte}</p>
          {extra}
        </div>
      </div>
    );
  };


  return (
    <main id="main" className="flex-grow">
      <PageBanner eyebrow={t("Structure")} title={t("Organigramme")} text={pp.orgaTexte || ""}>
        <div className="flex flex-wrap gap-3 shrink-0">
          <Link href={localePath(locale, "/cadres")} className="btn btn--primary">{t("Annuaire des cadres")}</Link>
          <Link href={localePath(locale, "/parti")} className="btn btn--outline-white">{t("Le Parti")}</Link>
        </div>
      </PageBanner>

      {/* ORGANES */}
      <section id="organisation" className="bg-ecideBlue-50 py-20 lg:py-24 px-6 scroll-mt-32">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4 space-y-5 reveal lg:sticky lg:top-32">
            <h2 className="text-4xl lg:text-5xl text-ecideDarkBlue">{t("Les organes du parti")}</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-3"><span className="w-3 h-3 bg-ecideBlue" aria-hidden="true"></span>{t("Organes nationaux")}</li>
              <li className="flex items-center gap-3"><span className="w-3 h-3 bg-ecideYellow" aria-hidden="true"></span>{t("Relais territoriaux")}</li>
              <li className="flex items-center gap-3"><span className="w-3 h-3 bg-ecideGreen" aria-hidden="true"></span>{t("Structures spécialisées")}</li>
            </ul>
            <Link href={localePath(locale, "/cadres")} className="arrow-link">{t("Consulter l'annuaire des cadres")}</Link>
          </div>
          <div className="lg:col-span-8 orgchart reveal">
            {organes.map((o, i) => {
              if (n >= 6 && i === n - 2) {
                return (
                  <div key={i} className="org-level org-level--split">
                    {orgCard(o, "yellow")}
                    {orgCard(organes[i + 1], "green")}
                  </div>
                );
              }
              if (n >= 6 && i === n - 1) return null;
              return (
                <div key={i} className="org-level">
                  {orgCard(o, i < 4 ? "blue" : "yellow")}
                </div>
              );
            })}
            <div className="org-level">
              <div className="org-card org-card--yellow">
                <i className="fa-solid fa-house-user" aria-hidden="true"></i>
                <div>
                  <h3 className="text-lg text-gray-900">{t("Cellules et places de résistance")}</h3>
                  <p className="text-sm text-gray-600">{t("Présence de proximité : une cellule par quartier, avenue ou rue, et des places de résistance.")}</p>
                  <Link href={`${localePath(locale, "/cadres")}#niveau=provincial`} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue">{t("Trouver ma section")} →</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        {membres.length > 0 && (
          <div className="max-w-6xl mx-auto mt-16 pt-16 border-t border-ecideDarkBlue/20">
        <span id="membres" className="block scroll-mt-32" aria-hidden="true"></span>
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-2xl space-y-3 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Membres")}</span>
              <h3 className="text-3xl text-ecideDarkBlue">{t("Les membres du parti")}</h3>
              <p className="text-lg text-gray-600">{t("Qui peut être membre de l'ECiDé, et à quel titre.")}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {membres.map((m, i) => {
                const tt = tint(m.couleur);
                return (
                  <article key={i} className="panel panel--white p-8 space-y-4 reveal relative overflow-hidden">
                    <span className="card-index" aria-hidden="true">{pad2(i + 1)}</span>
                    <div className={`w-12 h-12 ${tt.bg} ${tt.text} flex items-center justify-center text-xl`}><i className={`fa-solid ${m.icone}`} aria-hidden="true"></i></div>
                    <h3 className="text-xl font-bold text-gray-900">{m.titre}</h3>
                    <p className="text-gray-600">{m.texte}</p>
                  </article>
                );
              })}
            </div>
          </div>
          </div>
        )}
      </section>
    </main>
  );
}
