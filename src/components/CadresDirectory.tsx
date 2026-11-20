"use client";

import Link from "next/link";
import { useMemo } from "react";
import { TONE, telHref, waLink, safeUrl } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import type { Cadre, CadresData, StructureContact } from "@/lib/types";
import { SocialLinks, fold, useHashParams } from "./directory";

const PENDING = "À confirmer"; // valeur enregistrée (en français) pour un poste sans titulaire
const CATEGORY_TONE: Record<string, keyof typeof TONE> = { congres: "blue", conseil: "blue", direction: "blue", secretariats: "blue", afe: "yellow", ligues: "green", specialisees: "green", etudes: "blue", communication: "yellow", finances: "blue", federations: "green", cellules: "green" };

/** Ordre officiel des organes nationaux : le Congrès, le Conseil national, le Bureau national et ses secrétariats, le Bureau d'études. */
const NATIONAL_ORDER = ["congres", "conseil national", "bureau national", "secretariats nationaux", "bureau d'etudes"];
const AFFILIE_ORDER = ["association des femmes", "ligue des jeunes", "structures specialisees"];

type Niveau = "national" | "provincial" | "affilie";
type LocalLevel = "section" | "soussection" | "cellule" | "place";
const LOCAL_LEVELS: LocalLevel[] = ["section", "soussection", "cellule", "place"];

interface State {
  niveau: Niveau;
  categorie: string;
  organe: string;
  province: string;
  commune: string;
  q: string;
}

/** Le fragment d'adresse est la source de vérité ; les anciens niveaux « cellule » et « section » ouvrent les secrétariats provinciaux. */
function parse(h: URLSearchParams): State {
  const niveau = h.get("niveau");
  return {
    niveau: niveau === "provincial" || niveau === "cellule" || niveau === "section" ? "provincial" : niveau === "affilie" ? "affilie" : "national",
    categorie: h.get("categorie") || "all",
    organe: h.get("organe") || "",
    province: h.get("province") || "",
    commune: h.get("commune") || "",
    q: h.get("q") || "",
  };
}

function serialize(s: State): URLSearchParams {
  const h = new URLSearchParams();
  h.set("niveau", s.niveau);
  if (s.categorie !== "all") h.set("categorie", s.categorie);
  if (s.organe) h.set("organe", s.organe);
  if (s.province) h.set("province", s.province);
  if (s.commune) h.set("commune", s.commune);
  if (s.q) h.set("q", s.q);
  return h;
}

/** Structure locale (section, sous-section, cellule ou noyau) : coordonnées, responsables, sous-structures. */
interface Unit {
  organe: string;
  label: string;
  niveau: LocalLevel;
  lieu: string;
  contact: StructureContact;
  cadres: Cadre[];
  children: Unit[];
}

const orderIndex = (order: string[], organe: string) => {
  const f = fold(organe);
  const i = order.findIndex((o) => f.includes(o));
  return i === -1 ? order.length : i;
};

/**
 * Annuaire des structures en RDC, selon les statuts du parti. Trois entrées : les organes nationaux
 * (Congrès, Conseil national, Bureau national et ses secrétariats nationaux, Bureau d'études), les
 * secrétariats provinciaux exécutifs (provinces, districts de Kinshasa) — chacun présenté avec son
 * siège, ses responsables, puis ses sections (commune, territoire, secteur), leurs sous-sections,
 * leurs cellules (quartier, avenue, rue) et leurs noyaux — et les structures spécialisées (AFEC,
 * Ligue des Jeunes…). L'état vit dans l'adresse
 * (#niveau=provincial&province=Kinshasa – Funa), ce qui permet les liens « Près de chez vous ».
 */
export default function CadresDirectory({ data, locale }: { data: CadresData; locale: Locale }) {
  const { t } = useI18n();
  const [hash, setHash] = useHashParams();
  const state = parse(hash);
  const setState = (s: State) => setHash(serialize(s));
  const contacts = useMemo(() => data.contacts || {}, [data]);
  // Libellé traduit fourni par l'API ; à défaut, le nom de secrétariat construit ici se traduit par le dictionnaire
  const organeLabel = (organe: string) => {
    if (data.organes?.[organe]) return data.organes[organe];
    const spe = organe.match(/^Secrétariat Provincial Exécutif de (.+)$/);
    return spe ? t("Secrétariat Provincial Exécutif de :lieu", { lieu: spe[1] }) : organe;
  };
  const contactUrl = localePath(locale, data.contactUrl);

  const NIVEAUX: { id: Niveau; label: string; icon: string; hint: string }[] = [
    { id: "national", label: t("Organes nationaux"), icon: "fa-landmark", hint: t("Le Congrès, le Conseil national, le Bureau national et ses secrétariats nationaux, le Bureau d'études.") },
    { id: "provincial", label: t("Secrétariats provinciaux"), icon: "fa-map-location-dot", hint: t("Choisissez une province ou un district de Kinshasa : le siège du secrétariat provincial exécutif, ses responsables, puis les sections, sous-sections, cellules et noyaux avec leurs coordonnées.") },
    { id: "affilie", label: t("Structures spécialisées"), icon: "fa-people-group", hint: t("L'Association des Femmes de l'ECiDé (AFEC), la Ligue des Jeunes et les autres structures spécialisées du parti.") },
  ];
  const CATEGORIES: Record<string, string> = { congres: t("Congrès"), conseil: t("Conseil national"), direction: t("Bureau national"), secretariats: t("Secrétariats nationaux"), etudes: t("Bureau d'études"), communication: t("Communication"), finances: t("Finances"), afe: t("AFEC"), ligues: t("Ligue des Jeunes"), specialisees: t("Structures spécialisées"), federations: t("Secrétariats provinciaux"), cellules: t("Sections, cellules et noyaux") };
  const NIVEAU_LABEL: Record<string, string> = { national: t("National"), affilie: t("Structure spécialisée"), provincial: t("Secrétariat provincial exécutif"), section: t("Section"), soussection: t("Sous-section"), cellule: t("Cellule"), place: t("Noyau") };
  const isLocal = (n: string): n is LocalLevel => (LOCAL_LEVELS as string[]).includes(n);
  const niveauOfCadre = (c: Cadre): Niveau => (c.niveau === "national" ? "national" : c.niveau === "affilie" ? "affilie" : "provincial");

  /* ---------- Secrétariats provinciaux exécutifs : provinces, siège, sections ---------- */

  const provinces = useMemo(() => {
    const set = new Set<string>([...(data.provinces || []), ...Object.keys(data.communes || {})]);
    Object.values(contacts).forEach((c) => (c.type === "spe" || c.type === "section") && c.province && set.add(c.province));
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [data, contacts]);

  const speOrgane = (province: string) =>
    data.cadres.find((c) => c.niveau === "provincial" && c.province === province)?.organe ||
    Object.values(contacts).find((c) => c.type === "spe" && c.province === province)?.organe ||
    `Secrétariat Provincial Exécutif de ${province}`;

  /** Sections d'un secrétariat provincial, avec leurs sous-sections, cellules et noyaux imbriqués. */
  const sectionsOf = (province: string): Unit[] => {
    const units = new Map<string, Unit>();
    const add = (organe: string, niveau: LocalLevel, lieu: string) => {
      if (!units.has(organe)) units.set(organe, { organe, label: organeLabel(organe), niveau, lieu, contact: contacts[organe] || { organe }, cadres: [], children: [] });
      return units.get(organe)!;
    };
    const lieuOf = (niveau: LocalLevel, commune: string, quartier: string) => (niveau === "section" ? commune : quartier || commune);
    data.cadres.forEach((c) => {
      if (isLocal(c.niveau) && c.province === province) add(c.organe, c.niveau, lieuOf(c.niveau, c.commune, c.quartier)).cadres.push(c);
    });
    Object.values(contacts).forEach((c) => {
      const n = c.type || "";
      if (isLocal(n) && c.province === province) add(c.organe, n, lieuOf(n, c.ville || "", c.quartier || ""));
    });
    const all = [...units.values()];
    const byLevel = (n: LocalLevel) => all.filter((u) => u.niveau === n);
    const byVia = (u: Unit) => (u.contact.via ? all.find((p) => fold(p.organe) === fold(u.contact.via || "")) : undefined);
    const communeOf = (u: Unit) => u.cadres[0]?.commune || (u.contact.ville ?? "");
    const sectionOf = (u: Unit) => byLevel("section").find((s) => fold(s.lieu) === fold(communeOf(u)));
    const sameLieu = (n: LocalLevel, u: Unit) => byLevel(n).find((p) => p !== u && fold(p.lieu) === fold(u.lieu) && fold(communeOf(p)) === fold(communeOf(u)));
    // Rattachement : sous-section → section de sa commune ; cellule → sous-section de son quartier, sinon section ;
    // noyau → cellule de son quartier, sinon sous-section, sinon section. La structure de rattachement déclarée prime.
    const parentOf = (u: Unit): Unit | undefined => {
      const declared = byVia(u);
      if (declared && declared !== u) return declared;
      if (u.niveau === "soussection") return sectionOf(u);
      if (u.niveau === "cellule") return sameLieu("soussection", u) || sectionOf(u);
      if (u.niveau === "place") return sameLieu("cellule", u) || sameLieu("soussection", u) || sectionOf(u);
      return undefined;
    };
    const attached = new Set<Unit>();
    (["soussection", "cellule", "place"] as LocalLevel[]).forEach((n) =>
      byLevel(n).forEach((u) => {
        const p = parentOf(u);
        if (p) {
          p.children.push(u);
          attached.add(u);
        }
      })
    );
    const byName = (a: Unit, b: Unit) => (a.lieu || a.label).localeCompare(b.lieu || b.label, "fr");
    all.forEach((u) => u.children.sort(byName));
    return all.filter((u) => u.niveau === "section" || !attached.has(u)).sort(byName);
  };

  /* ---------- Recherche, organes nationaux et structures spécialisées ---------- */

  const searching = state.q.trim().length > 0;
  const list = useMemo(() => {
    const q = fold(state.q.trim());
    return data.cadres.filter((c) => {
      if (!searching && niveauOfCadre(c) !== state.niveau) return false;
      if (state.niveau !== "provincial" && state.categorie !== "all" && c.categorie !== state.categorie) return false;
      if (state.organe && fold(c.organe) !== fold(state.organe)) return false;
      if (state.province && c.province !== state.province) return false;
      if (state.commune && c.commune !== state.commune) return false;
      if (searching) {
        const hay = fold([c.nom, c.fonction, c.organe, organeLabel(c.organe), c.province, c.ville, c.commune, c.quartier, CATEGORIES[c.categorie], NIVEAU_LABEL[c.niveau]].join(" "));
        return q.split(/\s+/).every((w) => hay.includes(w));
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, state.niveau, state.categorie, state.organe, state.province, state.commune, state.q, searching]);

  const showGroups = searching || state.niveau !== "provincial";
  const typeOfNiveau: Record<Niveau, string> = { national: "national", affilie: "affilie", provincial: "spe" };
  const present = new Set(data.cadres.filter((c) => niveauOfCadre(c) === state.niveau).map((c) => c.categorie));
  const cats = Object.keys(CATEGORIES).filter((k) => present.has(k));
  const isProvincial = state.niveau === "provincial";
  const communes = isProvincial && state.province ? data.communes?.[state.province] || [] : [];
  const sections = isProvincial && state.province && !searching ? sectionsOf(state.province).filter((s) => !state.commune || fold(s.lieu) === fold(state.commune)) : [];
  const niveauLabel = (id: string) => NIVEAUX.find((n) => n.id === id)?.label || id;
  const crumbs = [
    niveauLabel(state.niveau),
    ...(!isProvincial && state.categorie !== "all" && CATEGORIES[state.categorie] ? [CATEGORIES[state.categorie]] : []),
    ...(state.organe ? [organeLabel(state.organe)] : []),
    ...(state.province ? [organeLabel(speOrgane(state.province))] : []),
    ...(state.commune ? [state.commune] : []),
    ...(state.q.trim() ? [`« ${state.q.trim()} »`] : []),
  ];
  const placeholder = isProvincial ? t("Rechercher une province, une section, une cellule, un responsable…") : t("Rechercher un cadre ou un organe…");

  // Résultats en grille (recherche, organes nationaux, structures spécialisées), groupés par structure avec
  // ses coordonnées ; une structure publiée sans responsable (le Congrès, par exemple) apparaît aussi
  const groups: { organe: string; items: Cadre[] }[] = [];
  list.slice(0, 200).forEach((c) => {
    let g = groups.find((x) => x.organe === c.organe);
    if (!g) groups.push((g = { organe: c.organe, items: [] }));
    g.items.push(c);
  });
  if (!searching && showGroups && state.categorie === "all") {
    Object.values(contacts)
      .filter((c) => c.type === typeOfNiveau[state.niveau] && (!state.organe || fold(c.organe) === fold(state.organe)) && !groups.some((g) => g.organe === c.organe))
      .forEach((c) => groups.push({ organe: c.organe, items: [] }));
  }
  const order = state.niveau === "affilie" ? AFFILIE_ORDER : NATIONAL_ORDER;
  if (!searching) groups.sort((a, b) => orderIndex(order, a.organe) - orderIndex(order, b.organe) || organeLabel(a.organe).localeCompare(organeLabel(b.organe), "fr"));
  const countLabel = showGroups
    ? list.length === 0 && groups.length === 0
      ? t("Aucun résultat")
      : list.length === 1
        ? t("1 cadre")
        : t(":n cadres", { n: list.length })
    : state.province
      ? sections.length === 1
        ? t("1 section")
        : t(":n sections", { n: sections.length })
      : t(":n secrétariats provinciaux", { n: provinces.length });

  const setNiveau = (id: Niveau) => setState({ ...state, niveau: id, categorie: "all", organe: "", commune: "", province: id === "provincial" ? state.province : "" });
  const selectCls = "w-full p-3 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-ecideBlue";

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Niveau")}</span>
          <div role="tablist" aria-label={t("Niveau de l'organisation")} className="flex flex-wrap gap-2 sm:gap-3 flex-1 min-w-0">
            {NIVEAUX.map((n) => (
              <button type="button" key={n.id} role="tab" aria-selected={state.niveau === n.id} onClick={() => setNiveau(n.id)} className={`chip flex-auto sm:flex-none px-4 sm:px-5 py-3 flex items-center justify-center gap-2 ${state.niveau === n.id ? "is-active" : ""}`}>
                <i className={`fa-solid ${n.icon}`} aria-hidden="true"></i>
                {n.label}
              </button>
            ))}
          </div>
        </div>
        {/* Aide du niveau choisi : ordinateur seulement */}
        <p className="mob-hide text-sm text-gray-500">{NIVEAUX.find((n) => n.id === state.niveau)?.hint}</p>
      </div>

      <div className="bg-ecideBlue-50 p-5 lg:p-6 space-y-5">
        <label className="block">
          <span className="sr-only">{t("Rechercher un cadre")}</span>
          <span className="relative block">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true"></i>
            <input type="search" autoComplete="off" value={state.q} onChange={(e) => setState({ ...state, q: e.target.value })} placeholder={placeholder} className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 text-lg focus:ring-2 focus:ring-ecideBlue" />
          </span>
        </label>
        {isProvincial && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">{t("Province / district de Kinshasa")}</span>
              <select value={state.province} onChange={(e) => setState({ ...state, province: e.target.value, commune: "" })} className={selectCls}>
                <option value="">{t("Choisir une province")}</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            {state.province && communes.length > 0 && (
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">{t("Section (commune, territoire, secteur)")}</span>
                <select value={state.commune} onChange={(e) => setState({ ...state, commune: e.target.value })} className={selectCls}>
                  <option value="">{t("Toutes les sections")}</option>
                  {communes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
        {!isProvincial && cats.length >= 2 && (
          <div className="flex flex-wrap gap-2" aria-label={t("Catégorie")}>
            <button type="button" onClick={() => setState({ ...state, categorie: "all", organe: "" })} className={`chip px-4 py-2 text-sm ${state.categorie === "all" && !state.organe ? "is-active" : ""}`} aria-pressed={state.categorie === "all" && !state.organe}>{t("Toutes")}</button>
            {cats.map((k) => (
              <button type="button" key={k} onClick={() => setState({ ...state, categorie: k, organe: "" })} className={`chip px-4 py-2 text-sm ${state.categorie === k ? "is-active" : ""}`} aria-pressed={state.categorie === k}>{CATEGORIES[k]}</button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-gray-500">
        <p aria-live="polite">
          {crumbs.map((p, i) => (
            <span key={i}>
              {i > 0 && <i className="fa-solid fa-chevron-right text-[10px] text-gray-400 mx-2" aria-hidden="true"></i>}
              <span className={i === crumbs.length - 1 ? "text-gray-900 font-bold" : ""}>{p}</span>
            </span>
          ))}
        </p>
        <p className="flex items-center gap-4">
          <span className="font-bold text-gray-900">{countLabel}</span>
          <button type="button" onClick={() => setState({ niveau: "national", categorie: "all", organe: "", province: "", commune: "", q: "" })} className="text-ecideBlue font-bold hover:text-ecideDarkBlue"><i className="fa-solid fa-rotate-left mr-1" aria-hidden="true"></i>{t("Réinitialiser")}</button>
        </p>
      </div>

      {showGroups && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" aria-live="polite">
            {groups.map((g) => (
              <ContactStrip key={g.organe} organe={g.organe} label={organeLabel(g.organe)} organes={data.organes || {}} contacts={contacts} contactUrl={contactUrl} onVia={(via) => setState({ ...state, q: via })}>
                {g.items.length === 0 && <p className="col-span-full text-sm text-gray-500 italic -mt-2">{t("Membres à confirmer : la composition sera publiée après validation par le Secrétariat Général.")}</p>}
                {g.items.map((c) => (
                  <CadreCard key={c.id} c={c} niveauLabel={NIVEAU_LABEL[c.niveau] || c.niveau} catLabel={CATEGORIES[c.categorie] || c.categorie} />
                ))}
              </ContactStrip>
            ))}
            {list.length > 200 && <p className="col-span-full text-center text-sm text-gray-500">{t("Affinez votre recherche pour voir les :n autres résultats.", { n: list.length - 200 })}</p>}
          </div>
          {list.length === 0 && groups.length === 0 && (
            <div className="text-center py-20 space-y-3">
              <i className="fa-solid fa-magnifying-glass text-4xl text-gray-300" aria-hidden="true"></i>
              <p className="text-lg font-bold text-gray-900">{t("Aucun cadre ne correspond à votre recherche.")}</p>
              <p className="text-gray-500">{t("Essayez un autre mot, une autre province ou réinitialisez les filtres.")}</p>
            </div>
          )}
        </>
      )}

      {!showGroups && !state.province && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" aria-live="polite">
          {provinces.map((province) => {
            const organe = speOrgane(province);
            const c = contacts[organe] || ({} as StructureContact);
            const nSections = sectionsOf(province).length;
            const nLeaders = data.cadres.filter((x) => x.niveau === "provincial" && x.province === province).length;
            return (
              <button type="button" key={province} onClick={() => setState({ ...state, province, commune: "" })} className="text-left panel p-6 space-y-3 hover:bg-white transition">
                <span className="block text-[11px] font-bold uppercase tracking-widest text-ecideYellow-700">{province}</span>
                <span className="block font-display text-2xl text-ecideDarkBlue leading-tight">{organeLabel(organe)}</span>
                <span className="block text-sm text-gray-600">
                  {c.telephone || c.whatsapp ? (
                    <><i className="fa-solid fa-phone text-ecideBlue mr-1" aria-hidden="true"></i>{c.telephone || c.whatsapp}</>
                  ) : c.email ? (
                    <><i className="fa-solid fa-envelope text-ecideBlue mr-1" aria-hidden="true"></i>{c.email}</>
                  ) : (
                    <span className="italic text-gray-400">{t("Téléphone à confirmer")}</span>
                  )}
                </span>
                {c.adresse && <span className="block text-sm text-gray-500"><i className="fa-solid fa-location-dot text-gray-400 mr-1" aria-hidden="true"></i>{c.adresse}</span>}
                <span className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600">{nSections === 1 ? t("1 section") : t(":n sections", { n: nSections })}</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600">{nLeaders === 1 ? t("1 responsable") : t(":n responsables", { n: nLeaders })}</span>
                </span>
                <span className="inline-flex items-center gap-2 text-sm font-bold text-ecideBlue">{t("Voir le secrétariat provincial")} <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i></span>
              </button>
            );
          })}
        </div>
      )}

      {!showGroups && state.province && (
        <ProvinceView
          province={state.province}
          organe={speOrgane(state.province)}
          label={organeLabel(speOrgane(state.province))}
          contact={contacts[speOrgane(state.province)] || { organe: speOrgane(state.province) }}
          leaders={data.cadres.filter((c) => c.niveau === "provincial" && c.province === state.province)}
          sections={sections}
          communeFilter={state.commune}
          onAllSections={() => setState({ ...state, commune: "" })}
          onBack={() => setState({ ...state, province: "", commune: "" })}
          contactUrl={contactUrl}
          categories={CATEGORIES}
        />
      )}
    </>
  );
}

/* ---------- Secrétariat provincial exécutif : siège, responsables, sections ---------- */

function ProvinceView({ province, organe, label, contact: c, leaders, sections, communeFilter, onAllSections, onBack, contactUrl, categories }: { province: string; organe: string; label: string; contact: StructureContact; leaders: Cadre[]; sections: Unit[]; communeFilter: string; onAllSections: () => void; onBack: () => void; contactUrl: string; categories: Record<string, string> }) {
  const { t } = useI18n();
  const chip = "inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 font-semibold text-gray-800 hover:border-ecideBlue hover:text-ecideBlue transition";
  return (
    <section className="space-y-10" aria-live="polite">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue"><i className="fa-solid fa-arrow-left text-xs" aria-hidden="true"></i>{t("Tous les secrétariats provinciaux")}</button>

      {/* Siège du secrétariat provincial exécutif */}
      <div className="bg-ecideDarkBlue text-white diag p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-widest text-ecideGreen">{t("Siège du secrétariat provincial exécutif")}</span>
            <h2 className="text-3xl lg:text-4xl text-white no-bar">{label}</h2>
            <p className="text-sm text-blue-200 mt-1"><i className="fa-solid fa-map text-gray-400 mr-1" aria-hidden="true"></i>{province}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm md:justify-end">
            {c.telephone && <a href={telHref(c.telephone)} className={chip}><i className="fa-solid fa-phone text-ecideBlue" aria-hidden="true"></i>{c.telephone}</a>}
            {c.whatsapp && <a href={waLink(c.whatsapp)} target="_blank" rel="noopener" className={chip}><i className="fa-brands fa-whatsapp text-ecideGreen" aria-hidden="true"></i>{t("WhatsApp")}</a>}
            {c.email && <a href={`mailto:${c.email}`} className={chip}><i className="fa-solid fa-envelope text-ecideBlue" aria-hidden="true"></i>{c.email}</a>}
            {c.canal && <a href={safeUrl(c.canal)} target="_blank" rel="noopener" className={chip}><i className="fa-solid fa-bullhorn text-ecideYellow-700" aria-hidden="true"></i>{t("Chaîne officielle")}</a>}
            <Link href={`${contactUrl}?structure=${encodeURIComponent(organe)}`} className="btn btn--primary btn--sm"><i className="fa-solid fa-paper-plane" aria-hidden="true"></i>{t("Écrire")}</Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-blue-100">
          {c.adresse && <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-location-dot text-gray-400" aria-hidden="true"></i>{c.adresse}</span>}
          {c.permanence && <span className="inline-flex items-center gap-1.5"><i className="fa-regular fa-clock text-gray-400" aria-hidden="true"></i>{c.permanence}</span>}
          {!c.telephone && !c.whatsapp && <span className="inline-flex items-center gap-1.5 italic"><i className="fa-solid fa-phone text-gray-300" aria-hidden="true"></i>{t("Téléphone à confirmer")}{c.via ? ` · ${t("joignable via")} ${c.via}` : ""}</span>}
        </div>
        <div className="space-y-3">
          <h3 className="text-xl text-white">{t("Responsables du secrétariat provincial")}</h3>
          {leaders.length === 0 ? (
            <p className="text-sm text-blue-200 italic">{t("Responsables à confirmer.")}</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3">
              {leaders.map((l) => (
                <LeaderRow key={l.id} c={l} tone="blue" tag={categories[l.categorie]} light />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Sections, sous-sections, cellules et noyaux */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Sections, sous-sections, cellules et noyaux")}</span>
            <h3 className="text-3xl text-ecideDarkBlue">{communeFilter ? t("Section de :commune", { commune: communeFilter }) : t("Les sections du secrétariat provincial")}</h3>
          </div>
          {communeFilter && <button type="button" onClick={onAllSections} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue">{t("Toutes les sections")}</button>}
        </div>
        {sections.length === 0 ? (
          <p className="text-gray-500 italic">{t("Aucune section renseignée pour ce secrétariat provincial pour le moment.")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sections.map((s) => (
              <UnitCard key={s.organe} unit={s} contactUrl={contactUrl} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** Carte d'une section (avec ses sous-sections, cellules et noyaux imbriqués), d'une sous-section, d'une cellule ou d'un noyau. */
function UnitCard({ unit, contactUrl, nested = false }: { unit: Unit; contactUrl: string; nested?: boolean }) {
  const { t } = useI18n();
  const c = unit.contact;
  const row = "flex items-center gap-2 text-gray-800 hover:text-ecideBlue";
  const KIND: Record<LocalLevel, string> = { section: t("Section"), soussection: t("Sous-section"), cellule: t("Cellule"), place: t("Noyau") };
  const KIND_TONE: Record<LocalLevel, string> = { section: "text-ecideGreen", soussection: "text-ecideGreen", cellule: "text-ecideBlue", place: "text-ecideYellow-700" };
  const CHILDREN: Record<LocalLevel, string> = { section: t("Sous-sections, cellules et noyaux"), soussection: t("Cellules et noyaux"), cellule: t("Noyaux"), place: "" };
  const lieuLabel = unit.niveau === "section" ? t("Commune, territoire ou secteur : :lieu", { lieu: unit.lieu }) : unit.niveau === "soussection" ? t("Groupement, quartier ou localité : :lieu", { lieu: unit.lieu }) : t("Quartier, avenue ou rue : :lieu", { lieu: unit.lieu });
  const Heading = nested ? "h5" : "h4";
  return (
    <article className={nested ? "panel panel--white p-4 space-y-3" : "panel p-6 space-y-4"}>
      <header>
        <span className={`block text-[11px] font-bold uppercase tracking-widest ${KIND_TONE[unit.niveau]}`}>{KIND[unit.niveau]}</span>
        <Heading className={`font-display text-ecideDarkBlue leading-tight ${nested ? "text-xl" : "text-2xl"}`}>{unit.label}</Heading>
        {unit.lieu && <p className="text-sm text-gray-500 mt-1"><i className="fa-solid fa-location-dot text-gray-400 mr-1" aria-hidden="true"></i>{lieuLabel}</p>}
      </header>
      <div className="space-y-1.5 text-sm">
        {c.email && <a href={`mailto:${c.email}`} className={`${row} break-all`}><i className="fa-solid fa-envelope w-4 text-ecideBlue" aria-hidden="true"></i>{c.email}</a>}
        {c.telephone && <a href={telHref(c.telephone)} className={row}><i className="fa-solid fa-phone w-4 text-ecideBlue" aria-hidden="true"></i>{c.telephone}</a>}
        {c.whatsapp && <a href={waLink(c.whatsapp)} target="_blank" rel="noopener" className={row}><i className="fa-brands fa-whatsapp w-4 text-ecideGreen" aria-hidden="true"></i>{t("WhatsApp")}{/^https?:/.test(c.whatsapp) ? "" : ` · ${c.whatsapp}`}</a>}
        {c.canal && <a href={safeUrl(c.canal)} target="_blank" rel="noopener" className={row}><i className="fa-solid fa-bullhorn w-4 text-ecideYellow-700" aria-hidden="true"></i>{t("Chaîne officielle")}</a>}
        {c.adresse && <span className="flex items-center gap-2 text-gray-600"><i className="fa-solid fa-location-dot w-4 text-gray-400" aria-hidden="true"></i>{c.adresse}</span>}
        {c.permanence && <span className="flex items-center gap-2 text-gray-600"><i className="fa-regular fa-clock w-4 text-gray-400" aria-hidden="true"></i>{c.permanence}</span>}
        {!c.telephone && !c.whatsapp && (
          <span className="flex items-center gap-2 text-gray-500 italic"><i className="fa-solid fa-phone w-4 text-gray-300" aria-hidden="true"></i>{t("Téléphone à confirmer")}{c.via ? ` · ${t("joignable via")} ${c.via}` : ""}</span>
        )}
        <Link href={`${contactUrl}?structure=${encodeURIComponent(unit.organe)}`} className="flex items-center gap-2 font-bold text-ecideBlue hover:text-ecideDarkBlue"><i className="fa-solid fa-paper-plane w-4" aria-hidden="true"></i>{t("Écrire via le formulaire")}</Link>
      </div>
      <div className="border-t border-gray-100 pt-3 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{t("Responsables")}</p>
        {unit.cadres.length === 0 ? (
          <p className="text-sm text-gray-400 italic">{t(PENDING)}</p>
        ) : (
          <ul className="space-y-2">
            {unit.cadres.map((cd) => (
              <LeaderRow key={cd.id} c={cd} tone={unit.niveau === "section" ? "green" : "blue"} />
            ))}
          </ul>
        )}
      </div>
      {unit.children.length > 0 && (
        <div className="border-t border-gray-100 pt-3 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{CHILDREN[unit.niveau]}</p>
          {unit.children.map((child) => (
            <UnitCard key={child.organe} unit={child} contactUrl={contactUrl} nested />
          ))}
        </div>
      )}
    </article>
  );
}

/** Responsable en ligne compacte : photo ou initiales, fonction, nom, réseaux sociaux. */
function LeaderRow({ c, tone, tag, light = false }: { c: Cadre; tone: "blue" | "green"; tag?: string; light?: boolean }) {
  const { t } = useI18n();
  const pending = c.nom === PENDING;
  const ini = !pending && c.nom ? c.nom.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "";
  const avatar = tone === "blue" ? "bg-ecideBlue-50 text-ecideBlue" : "bg-ecideGreen-50 text-ecideGreen";
  return (
    <li className="flex items-center gap-3 min-w-0">
      {c.photo ? (
        <img src={c.photo} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover object-[50%_18%] shrink-0" />
      ) : (
        <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${avatar}`}>{ini ? <span className="font-display font-bold">{ini}</span> : <i className="fa-solid fa-user text-sm" aria-hidden="true"></i>}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block text-[10px] font-bold uppercase tracking-widest leading-tight ${light ? "text-blue-200" : "text-gray-500"}`}>{c.fonction}{tag && c.categorie !== "federations" ? ` · ${tag}` : ""}</span>
        <span className={`block text-sm leading-tight ${pending ? `italic ${light ? "text-blue-300" : "text-gray-400"}` : `font-semibold ${light ? "text-white" : "text-gray-900"}`}`}>{pending ? t(PENDING) : c.nom}</span>
      </span>
      <SocialLinks r={c.reseaux} nom={c.nom} size="w-8 h-8" />
    </li>
  );
}

/* ---------- Cartes et bandeau de coordonnées (organes nationaux, structures spécialisées, résultats de recherche) ---------- */

function CadreCard({ c, niveauLabel, catLabel }: { c: Cadre; niveauLabel: string; catLabel: string }) {
  const { t } = useI18n();
  const tone = TONE[CATEGORY_TONE[c.categorie] || "blue"];
  const pending = c.nom === PENDING;
  const ini = !pending && c.nom ? c.nom.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "";
  const lieu = [c.province, c.commune ? t("Section de :commune", { commune: c.commune }) : c.ville && c.niveau === "provincial" ? c.ville : "", c.quartier].filter(Boolean);
  return (
    <article className="panel p-6 text-center space-y-3 reveal is-visible">
      {c.photo ? (
        <img src={c.photo} alt="" width={80} height={80} className="w-20 h-20 mx-auto rounded-full object-cover object-[50%_18%] border-2 border-ecideBlue-100" />
      ) : (
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${tone.avatar}`}>{ini ? <span className="font-display text-2xl font-bold">{ini}</span> : <i className="fa-solid fa-user text-2xl" aria-hidden="true"></i>}</div>
      )}
      <div>
        <h3 className="text-xl text-gray-900 leading-tight">{c.organeLabel || c.organe}</h3>
        <p className={`text-xs font-bold uppercase tracking-widest ${tone.tag} mt-1`}>{c.fonction}</p>
      </div>
      <p className={pending ? "text-gray-400 italic" : "text-gray-800 font-semibold"}>{pending ? t(PENDING) : c.nom}</p>
      <div className="flex flex-wrap justify-center gap-2 text-[11px] font-bold uppercase tracking-wider">
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600">{niveauLabel}</span>
        {(c.niveau === "national" || c.niveau === "affilie") && <span className="px-2 py-0.5 bg-gray-100 text-gray-600">{catLabel}</span>}
      </div>
      {lieu.length > 0 && (
        <p className="text-sm text-gray-500">
          <i className="fa-solid fa-location-dot mr-1 text-gray-400" aria-hidden="true"></i>
          {lieu.join(" · ")}
        </p>
      )}
      <SocialLinks r={c.reseaux} nom={c.nom} size="w-9 h-9" center />
    </article>
  );
}

/** Coordonnées de la structure (en tête de chaque groupe) : jamais le numéro d'une personne. */
function ContactStrip({ organe, label, organes, contacts, contactUrl, onVia, children }: { organe: string; label: string; organes: Record<string, string>; contacts: Record<string, StructureContact>; contactUrl: string; onVia: (via: string) => void; children: React.ReactNode }) {
  const { t } = useI18n();
  const c = contacts[organe] || ({} as StructureContact);
  const chip = "inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 font-semibold text-gray-800 hover:border-ecideBlue hover:text-ecideBlue transition";
  return (
    <>
      <div className="col-span-full bg-ecideDarkBlue text-white diag p-5 lg:p-6 mt-6 first:mt-0 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-widest text-ecideGreen">{t("Contacter la structure")}</span>
            <h3 className="text-3xl text-white">{label}</h3>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {c.telephone && <a href={telHref(c.telephone)} className={chip}><i className="fa-solid fa-phone text-ecideBlue" aria-hidden="true"></i>{c.telephone}</a>}
            {c.whatsapp && <a href={waLink(c.whatsapp)} target="_blank" rel="noopener" className={chip}><i className="fa-brands fa-whatsapp text-ecideGreen" aria-hidden="true"></i>{t("WhatsApp")}</a>}
            {c.email && <a href={`mailto:${c.email}`} className={chip}><i className="fa-solid fa-envelope text-ecideBlue" aria-hidden="true"></i>{c.email}</a>}
            {c.canal && <a href={safeUrl(c.canal)} target="_blank" rel="noopener" className={chip}><i className="fa-solid fa-bullhorn text-ecideYellow-700" aria-hidden="true"></i>{t("Chaîne officielle")}</a>}
            <Link href={`${contactUrl}?structure=${encodeURIComponent(organe)}`} className="btn btn--primary btn--sm"><i className="fa-solid fa-paper-plane" aria-hidden="true"></i>{t("Écrire")}</Link>
          </div>
        </div>
        {(c.adresse || c.permanence || (!c.telephone && !c.whatsapp)) && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-blue-100">
            {c.adresse && <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-location-dot text-gray-400" aria-hidden="true"></i>{c.adresse}</span>}
            {c.permanence && <span className="inline-flex items-center gap-1.5"><i className="fa-regular fa-clock text-gray-400" aria-hidden="true"></i>{c.permanence}</span>}
            {!c.telephone && !c.whatsapp && (
              c.via && contacts[c.via] ? (
                <span className="inline-flex items-center gap-1.5">
                  <i className="fa-solid fa-diagram-project text-gray-400" aria-hidden="true"></i>
                  {t("Téléphone à confirmer")} · {t("joignable via")}{" "}
                  <button type="button" onClick={() => onVia(c.via!)} className="font-semibold text-ecideYellow hover:text-white underline">{organes[c.via] || c.via}</button>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 italic"><i className="fa-solid fa-phone text-blue-300" aria-hidden="true"></i>{t("Téléphone à confirmer")}</span>
              )
            )}
          </div>
        )}
      </div>
      {children}
    </>
  );
}
