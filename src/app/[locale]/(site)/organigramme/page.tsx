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
  return pageMetadata(locale, "/organigramme", { title: data.page.orgaTitre || t("Organigramme"), description: data.page.orgaTexte || data.parti.intro });
}

/**
 * Organigramme du parti, par niveau : national (Congrès, Conseil national, Bureau national),
 * provincial et local (secrétariat exécutif provincial, sections, sous-sections, cellules,
 * noyaux), structures spécialisées (AFEC, Ligue des Jeunes) ; puis les catégories de membres.
 * Les organes et leur niveau viennent de l'administration (écran Le Parti, onglet Organisation).
 */
export default async function OrganigrammePage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getParti(locale), getT(locale)]);
  const { page: pp, organes, membres = [] } = data;
  const niveau = (o: { niveau?: string }) => o.niveau || "national";
  const groupes = [
    { key: "national", title: t("Niveau national"), tone: "blue", items: organes.filter((o) => niveau(o) === "national") },
    { key: "provincial", title: t("Niveau provincial et local"), tone: "yellow", items: organes.filter((o) => niveau(o) === "provincial") },
    { key: "affilie", title: t("Structures spécialisées"), tone: "green", items: organes.filter((o) => niveau(o) === "affilie") },
  ].filter((g) => g.items.length > 0);

  const orgCard = (o: { titre: string; texte: string; icone: string; lien?: string; url?: string }, tone: string) => {
    const low = o.titre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cadres = localePath(locale, "/cadres");
    // Téléphone et tablette : icône et nom de l'organe seulement (description et lien sur ordinateur)
    const link = (href: string, label: string) => <Link href={href} className="mob-hide text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue">{label} →</Link>;
    let extra = null;
    // Lien réglé dans l'administration (Le Parti › Organisation), sinon lien automatique selon l'organe
    if (o.url && o.url !== "#") extra = link(/^https?:/i.test(o.url) ? o.url : localePath(locale, o.url), o.lien || t("En savoir plus"));
    else if (low.includes("diaspora")) extra = link(localePath(locale, "/diaspora"), t("Voir la diaspora"));
    else if (low.includes("congres")) extra = link(`${cadres}#niveau=national&organe=${encodeURIComponent("Congrès")}`, t("Voir le Congrès"));
    else if (low.includes("conseil national")) extra = link(`${cadres}#niveau=national&organe=${encodeURIComponent("Conseil national")}`, t("Voir le Conseil national"));
    else if (low.includes("bureau national")) extra = link(`${cadres}#niveau=national`, t("Voir les membres du Bureau national"));
    else if (low.includes("femmes") || low.includes("afec") || low.includes("jeunes") || low.includes("ligue") || low.includes("affili")) extra = link(`${cadres}#niveau=affilie`, t("Voir les structures spécialisées"));
    else if (low.includes("provinci")) extra = link(`${cadres}#niveau=provincial`, t("Voir les secrétariats provinciaux"));
    else if (low.includes("section") || low.includes("cellule") || low.includes("noyau")) extra = link(`${cadres}#niveau=provincial`, t("Trouver ma section"));
    return (
      <div className={`org-card org-card--${tone}`}>
        <i className={`fa-solid ${o.icone}`} aria-hidden="true"></i>
        <div>
          <h3 className="text-lg text-gray-900">{o.titre}</h3>
          <p className="mob-hide text-sm text-gray-600">{o.texte}</p>
          {extra}
        </div>
      </div>
    );
  };


  return (
    <main id="main" className="flex-grow">
      <PageBanner eyebrow={pp.orgaSurtitre || t("Structure")} title={pp.orgaTitre || t("Organigramme")} text={pp.orgaTexte || ""}>
        <div className="flex flex-wrap gap-3 shrink-0">
          <Link href={localePath(locale, "/cadres")} className="btn btn--primary">{t("Annuaire des cadres")}</Link>
          <Link href={localePath(locale, "/parti")} className="btn btn--outline-white mob-hide">{t("Le Parti")}</Link>
        </div>
      </PageBanner>

      {/* ORGANES */}
      <section id="organisation" className="bg-ecideBlue-50 py-28 lg:py-32 px-6 scroll-mt-32">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-4 space-y-5 reveal lg:sticky lg:top-32">
            <h2 className="text-4xl lg:text-5xl text-ecideDarkBlue">{pp.orgaSousTitre || t("Les organes du parti")}</h2>
            {/* Téléphone et tablette : le titre seul ; légende (chaque niveau a déjà son intitulé), texte et lien sur ordinateur */}
            <ul className="mob-hide space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-3"><span className="w-3 h-3 bg-ecideBlue" aria-hidden="true"></span>{t("Niveau national")}</li>
              <li className="flex items-center gap-3"><span className="w-3 h-3 bg-ecideYellow" aria-hidden="true"></span>{t("Niveau provincial et local")}</li>
              <li className="flex items-center gap-3"><span className="w-3 h-3 bg-ecideGreen" aria-hidden="true"></span>{t("Structures spécialisées")}</li>
            </ul>
            <p className="mob-hide text-sm text-gray-600">{pp.orgaLegende || t("Congrès, Conseil national et Bureau national ; secrétariats exécutifs provinciaux, sections, sous-sections, cellules et noyaux ; structures spécialisées.")}</p>
            <Link href={localePath(locale, "/cadres")} className="arrow-link mob-hide">{t("Consulter l'annuaire des cadres")}</Link>
          </div>
          <div className="lg:col-span-8 space-y-16 reveal">
            {groupes.map((g) => (
              <div key={g.key}>
                <h3 className="eyebrow eyebrow--dark text-xs mb-4">{g.title}</h3>
                <div className="orgchart">
                  {g.key === "affilie" ? (
                    <div className="org-level org-level--split">{g.items.map((o, i) => <div key={i} className="contents">{orgCard(o, g.tone)}</div>)}</div>
                  ) : (
                    g.items.map((o, i) => (
                      <div key={i} className="org-level">
                        {orgCard(o, g.tone)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {membres.length > 0 && (
          <div className="max-w-6xl mx-auto mt-20 pt-20 border-t border-ecideDarkBlue/20">
        <span id="membres" className="block scroll-mt-32" aria-hidden="true"></span>
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="max-w-2xl space-y-3 reveal">
              <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{pp.membresSurtitre || t("Membres")}</span>
              <h3 className="text-3xl text-ecideDarkBlue">{pp.membresTitre || t("Les membres du parti")}</h3>
              <p className="mob-hide text-lg text-gray-600">{pp.membresTexte || t("Qui peut être membre de l'ECiDé, et à quel titre.")}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {membres.map((m, i) => {
                const tt = tint(m.couleur);
                return (
                  <article key={i} className="panel panel--white p-8 space-y-4 reveal relative overflow-hidden">
                    <span className="card-index" aria-hidden="true">{pad2(i + 1)}</span>
                    <div className={`w-12 h-12 ${tt.bg} ${tt.text} flex items-center justify-center text-xl`}><i className={`fa-solid ${m.icone}`} aria-hidden="true"></i></div>
                    <h3 className="text-xl font-bold text-gray-900">{m.titre}</h3>
                    {/* Téléphone et tablette : icône et intitulé seulement */}
                    <p className="mob-hide text-gray-600">{m.texte}</p>
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
