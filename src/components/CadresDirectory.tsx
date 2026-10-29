"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { TONE, telHref, waLink, safeUrl } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import type { Cadre, CadresData, StructureContact } from "@/lib/types";
import { SocialLinks, fold, useHashParams } from "./directory";

const PENDING = "À confirmer"; // valeur enregistrée (en français) pour un poste sans titulaire
const CATEGORY_TONE: Record<string, keyof typeof TONE> = { direction: "blue", secretariats: "blue", afe: "yellow", specialisees: "green", etudes: "blue", communication: "yellow", finances: "blue", federations: "green", ligues: "yellow", cellules: "green" };

interface State {
  niveau: "national" | "provincial";
  categorie: string;
  province: string;
  commune: string;
  q: string;
}

/** Le fragment d'adresse est la source de vérité ; les anciens niveaux « cellule » et « section » ouvrent les secrétariats provinciaux. */
function parse(h: URLSearchParams): State {
  const niveau = h.get("niveau");
  return {
    niveau: niveau === "provincial" || niveau === "cellule" || niveau === "section" ? "provincial" : "national",
    categorie: h.get("categorie") || "all",
    province: h.get("province") || "",
    commune: h.get("commune") || "",
    q: h.get("q") || "",
  };
}

function serialize(s: State): URLSearchParams {
  const h = new URLSearchParams();
  h.set("niveau", s.niveau);
  if (s.categorie !== "all") h.set("categorie", s.categorie);
  if (s.province) h.set("province", s.province);
  if (s.commune) h.set("commune", s.commune);
  if (s.q) h.set("q", s.q);
  return h;
}

/** Structure locale (section, cellule ou place de résistance) : coordonnées, responsables, sous-structures. */
interface Unit {
  organe: string;
  label: string;
  niveau: "section" | "cellule" | "place";
  lieu: string;
  contact: StructureContact;
  cadres: Cadre[];
  children: Unit[];
}

/**
 * Annuaire des structures en RDC. Deux entrées : les organes nationaux (Bureau national,
 * secrétariats nationaux, AFE, structures spécialisées, Bureau d'études) et les secrétariats
 * provinciaux exécutifs (provinces, districts de Kinshasa) — chacun présenté avec son siège,
 * ses responsables, puis ses sections (commune, territoire, secteur), leurs cellules (quartier,
 * avenue, rue) et leurs places de résistance. L'état vit dans l'adresse
 * (#niveau=provincial&province=Kinshasa – Funa), ce qui permet les liens « Près de chez vous ».
 */
export default function CadresDirectory({ data, locale, children }: { data: CadresData; locale: Locale; children?: ReactNode }) {
  const { t } = useI18n();
  const [hash, setHash] = useHashParams();
  const state = parse(hash);
  const setState = (s: State) => setHash(serialize(s));
  const contacts = useMemo(() => data.contacts || {}, [data]);
  const organeLabel = (organe: string) => data.organes?.[organe] || organe;
  const contactUrl = localePath(locale, data.contactUrl);

  const NIVEAUX = [
    { id: "national" as const, label: t("Organes nationaux"), icon: "fa-landmark", hint: t("Le Bureau national, les secrétariats nationaux, l'AFE, les structures spécialisées et le Bureau d'études.") },
    { id: "provincial" as const, label: t("Secrétariats provinciaux"), icon: "fa-map-location-dot", hint: t("Choisissez une province ou un district de Kinshasa : le siège du secrétariat provincial exécutif, ses responsables, puis les sections, cellules et places de résistance avec leurs coordonnées.") },
  ];
  const CATEGORIES: Record<string, string> = { direction: t("Bureau national"), secretariats: t("Secrétariats nationaux"), afe: t("AFE"), specialisees: t("Structures spécialisées"), etudes: t("Bureau d'études"), communication: t("Communication"), finances: t("Finances"), federations: t("Secrétariats provinciaux"), ligues: t("Ligues"), cellules: t("Sections & cellules") };
  const NIVEAU_LABEL: Record<string, string> = { national: t("National"), provincial: t("Secrétariat provincial exécutif"), section: t("Section"), cellule: t("Cellule"), place: t("Place de résistance") };

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

  /** Sections d'un secrétariat provincial, avec leurs cellules et places de résistance. */
  const sectionsOf = (province: string): Unit[] => {
    const units = new Map<string, Unit>();
    const add = (organe: string, niveau: Unit["niveau"], lieu: string) => {
      if (!units.has(organe)) units.set(organe, { organe, label: organeLabel(organe), niveau, lieu, contact: contacts[organe] || { organe }, cadres: [], children: [] });
      return units.get(organe)!;
    };
    const niveauOf = (c: { niveau?: string; type?: string }): Unit["niveau"] | null => {
      const n = c.niveau || c.type || "";
      return n === "section" || n === "cellule" || n === "place" ? n : null;
    };
    data.cadres.forEach((c) => {
      const n = niveauOf(c);
      if (n && c.province === province) add(c.organe, n, n === "section" ? c.commune : c.quartier || c.commune).cadres.push(c);
    });
    Object.values(contacts).forEach((c) => {
      const n = niveauOf(c);
      if (n && c.province === province) add(c.organe, n, n === "section" ? c.ville || "" : c.quartier || c.ville || "");
    });
    // Rattachement : cellule → section de sa commune, place → cellule de son quartier (sinon section)
    const bySection = new Map<string, Unit>();
    const byQuartier = new Map<string, Unit>();
    const all = [...units.values()];
    all.filter((u) => u.niveau === "section").forEach((u) => bySection.set(fold(u.lieu), u));
    all.filter((u) => u.niveau === "cellule").forEach((u) => byQuartier.set(fold(u.lieu), u));
    const parentSection = (u: Unit) => {
      const commune = u.cadres[0]?.commune || (u.contact.ville ?? "");
      return bySection.get(fold(commune)) || bySection.get(fold(u.contact.via || "")) || [...bySection.values()].find((s) => fold(u.contact.via || "") === fold(s.organe));
    };
    all.filter((u) => u.niveau === "cellule").forEach((u) => parentSection(u)?.children.push(u));
    all.filter((u) => u.niveau === "place").forEach((u) => {
      const cell = byQuartier.get(fold(u.lieu)) || [...byQuartier.values()].find((c) => fold(u.contact.via || "") === fold(c.organe));
      (cell || parentSection(u))?.children.push(u);
    });
    const byName = (a: Unit, b: Unit) => (a.lieu || a.label).localeCompare(b.lieu || b.label, "fr");
    const attached = new Set<Unit>();
    all.forEach((u) => u.children.forEach((c) => attached.add(c)));
    all.forEach((u) => u.children.sort(byName));
    return all.filter((u) => u.niveau === "section" || !attached.has(u)).sort(byName);
  };

  /* ---------- Recherche et organes nationaux ---------- */

  const searching = state.q.trim().length > 0;
  const list = useMemo(() => {
    const q = fold(state.q.trim());
    return data.cadres.filter((c) => {
      if (!searching && state.niveau === "national" && c.niveau !== "national") return false;
      if (!searching && state.niveau === "provincial" && c.niveau === "national") return false;
      if (state.niveau === "national" && state.categorie !== "all" && c.categorie !== state.categorie) return false;
      if (state.province && c.province !== state.province) return false;
      if (state.commune && c.commune !== state.commune) return false;
      if (searching) {
        const hay = fold([c.nom, c.fonction, c.organe, organeLabel(c.organe), c.province, c.ville, c.commune, c.quartier, CATEGORIES[c.categorie], NIVEAU_LABEL[c.niveau]].join(" "));
        return q.split(/\s+/).every((w) => hay.includes(w));
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, state.niveau, state.categorie, state.province, state.commune, state.q, searching]);

  const present = new Set(data.cadres.filter((c) => c.niveau === "national").map((c) => c.categorie));
  const cats = Object.keys(CATEGORIES).filter((k) => present.has(k));
  const isProvincial = state.niveau === "provincial";
  const communes = isProvincial && state.province ? data.communes?.[state.province] || [] : [];
  const sections = isProvincial && state.province && !searching ? sectionsOf(state.province).filter((s) => !state.commune || fold(s.lieu) === fold(state.commune)) : [];
  const niveauLabel = (id: string) => NIVEAUX.find((n) => n.id === id)?.label || id;
  const crumbs = [
    niveauLabel(state.niveau),
    ...(state.niveau === "national" && state.categorie !== "all" && CATEGORIES[state.categorie] ? [CATEGORIES[state.categorie]] : []),
    ...(state.province ? [organeLabel(speOrgane(state.province))] : []),
    ...(state.commune ? [state.commune] : []),
    ...(state.q.trim() ? [`« ${state.q.trim()} »`] : []),
  ];
  const placeholder = isProvincial ? t("Rechercher une province, une section, une cellule, un responsable…") : t("Rechercher un cadre ou un organe…");

  // Résultats en grille (recherche et organes nationaux), groupés par structure avec ses coordonnées
  const groups: { organe: string; items: Cadre[] }[] = [];
  list.slice(0, 200).forEach((c) => {
    let g = groups.find((x) => x.organe === c.organe);
    if (!g) groups.push((g = { organe: c.organe, items: [] }));
    g.items.push(c);
  });
  const showGroups = searching || state.niveau === "national";
  const countLabel = showGroups
    ? list.length === 0
      ? t("Aucun résultat")
      : list.length === 1
        ? t("1 cadre")
        : t(":n cadres", { n: list.length })
    : state.province
      ? sections.length === 1
        ? t("1 section")
        : t(":n sections", { n: sections.length })
      : t(":n secrétariats provinciaux", { n: provinces.length });

  const setNiveau = (id: State["niveau"]) => setState({ ...state, niveau: id, categorie: "all", commune: "", province: id === "national" ? "" : state.province });
  const selectCls = "w-full p-3 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-ecideBlue";
  const stats = data.stats || { nationaux: 0, spe: 0, sections: 0, cellules: 0 };

  return (
    <>
      {/* Présentation et chiffres, comme sur la page Diaspora */}
      <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        {children}
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          {[
            [stats.spe, t("secrétariats provinciaux")],
            [stats.sections, t("sections")],
            [stats.cellules, t("cellules")],
          ].map(([n, l]) => (
            <div key={String(l)}>
              <span className="font-display text-4xl font-bold text-ecideDarkBlue block leading-none">{n}</span>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{l}</span>
            </div>
          ))}
        </div>
      </div>

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
        <p className="text-sm text-gray-500">{NIVEAUX.find((n) => n.id === state.niveau)?.hint}</p>
      </div>

      <div className="bg-white border border-gray-200 p-5 lg:p-6 space-y-5">
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
            <button type="button" onClick={() => setState({ ...state, categorie: "all" })} className={`chip px-4 py-2 text-sm ${state.categorie === "all" ? "is-active" : ""}`} aria-pressed={state.categorie === "all"}>{t("Toutes")}</button>
            {cats.map((k) => (
              <button type="button" key={k} onClick={() => setState({ ...state, categorie: k })} className={`chip px-4 py-2 text-sm ${state.categorie === k ? "is-active" : ""}`} aria-pressed={state.categorie === k}>{CATEGORIES[k]}</button>
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
          <button type="button" onClick={() => setState({ niveau: "national", categorie: "all", province: "", commune: "", q: "" })} className="text-ecideBlue font-bold hover:text-ecideDarkBlue"><i className="fa-solid fa-rotate-left mr-1" aria-hidden="true"></i>{t("Réinitialiser")}</button>
        </p>
      </div>

      {showGroups && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" aria-live="polite">
            {groups.map((g) => (
              <ContactStrip key={g.organe} organe={g.organe} label={organeLabel(g.organe)} organes={data.organes || {}} contacts={contacts} contactUrl={contactUrl} onVia={(via) => setState({ ...state, q: via })}>
                {g.items.map((c) => (
                  <CadreCard key={c.id} c={c} niveauLabel={NIVEAU_LABEL[c.niveau] || c.niveau} catLabel={CATEGORIES[c.categorie] || c.categorie} />
                ))}
              </ContactStrip>
            ))}
            {list.length > 200 && <p className="col-span-full text-center text-sm text-gray-500">{t("Affinez votre recherche pour voir les :n autres résultats.", { n: list.length - 200 })}</p>}
          </div>
          {list.length === 0 && (
            <div className="text-center py-16 space-y-3">
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
              <button type="button" key={province} onClick={() => setState({ ...state, province, commune: "" })} className="text-left bg-white border border-gray-200 border-t-ecideYellow-200 p-6 space-y-3 shadow-soft hover:border-ecideBlue transition">
                <span className="block text-[11px] font-bold uppercase tracking-widest text-ecideYellow-700">{province}</span>
                <span className="block font-display text-xl font-bold uppercase text-ecideDarkBlue leading-tight">{organeLabel(organe)}</span>
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
    <section className="space-y-8" aria-live="polite">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue"><i className="fa-solid fa-arrow-left text-xs" aria-hidden="true"></i>{t("Tous les secrétariats provinciaux")}</button>

      {/* Siège du secrétariat provincial exécutif */}
      <div className="bg-white border border-gray-200 border-l-4 border-l-ecideBlue p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-widest text-ecideGreen">{t("Siège du secrétariat provincial exécutif")}</span>
            <h2 className="text-3xl text-ecideDarkBlue">{label}</h2>
            <p className="text-sm text-gray-500 mt-1"><i className="fa-solid fa-map text-gray-400 mr-1" aria-hidden="true"></i>{province}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm md:justify-end">
            {c.telephone && <a href={telHref(c.telephone)} className={chip}><i className="fa-solid fa-phone text-ecideBlue" aria-hidden="true"></i>{c.telephone}</a>}
            {c.whatsapp && <a href={waLink(c.whatsapp)} target="_blank" rel="noopener" className={chip}><i className="fa-brands fa-whatsapp text-ecideGreen" aria-hidden="true"></i>{t("WhatsApp")}</a>}
            {c.email && <a href={`mailto:${c.email}`} className={chip}><i className="fa-solid fa-envelope text-ecideBlue" aria-hidden="true"></i>{c.email}</a>}
            {c.canal && <a href={safeUrl(c.canal)} target="_blank" rel="noopener" className={chip}><i className="fa-solid fa-bullhorn text-ecideYellow-700" aria-hidden="true"></i>{t("Chaîne officielle")}</a>}
            <Link href={`${contactUrl}?structure=${encodeURIComponent(organe)}`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-ecideBlue text-white font-bold hover:bg-ecideDarkBlue transition"><i className="fa-solid fa-paper-plane" aria-hidden="true"></i>{t("Écrire")}</Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
          {c.adresse && <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-location-dot text-gray-400" aria-hidden="true"></i>{c.adresse}</span>}
          {c.permanence && <span className="inline-flex items-center gap-1.5"><i className="fa-regular fa-clock text-gray-400" aria-hidden="true"></i>{c.permanence}</span>}
          {!c.telephone && !c.whatsapp && <span className="inline-flex items-center gap-1.5 italic"><i className="fa-solid fa-phone text-gray-300" aria-hidden="true"></i>{t("Téléphone à confirmer")}{c.via ? ` · ${t("joignable via")} ${c.via}` : ""}</span>}
        </div>
        <div className="space-y-3">
          <h3 className="text-lg text-gray-900">{t("Responsables du secrétariat provincial")}</h3>
          {leaders.length === 0 ? (
            <p className="text-sm text-gray-500 italic">{t("Responsables à confirmer.")}</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3">
              {leaders.map((l) => (
                <LeaderRow key={l.id} c={l} tone="blue" tag={categories[l.categorie]} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Sections, cellules et places de résistance */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Sections, cellules et places de résistance")}</span>
            <h3 className="text-2xl text-ecideDarkBlue">{communeFilter ? t("Section de :commune", { commune: communeFilter }) : t("Les sections du secrétariat provincial")}</h3>
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

/** Carte d'une section (avec ses cellules et places de résistance imbriquées), d'une cellule ou d'une place. */
function UnitCard({ unit, contactUrl, nested = false }: { unit: Unit; contactUrl: string; nested?: boolean }) {
  const { t } = useI18n();
  const c = unit.contact;
  const row = "flex items-center gap-2 text-gray-800 hover:text-ecideBlue";
  const kind = unit.niveau === "section" ? t("Section") : unit.niveau === "cellule" ? t("Cellule") : t("Place de résistance");
  const lieuLabel = unit.niveau === "section" ? t("Commune, territoire ou secteur : :lieu", { lieu: unit.lieu }) : t("Quartier, avenue ou rue : :lieu", { lieu: unit.lieu });
  const tone = unit.niveau === "section" ? "border-t-ecideGreen-200" : unit.niveau === "cellule" ? "border-t-ecideBlue-200" : "border-t-ecideYellow-200";
  const Heading = nested ? "h5" : "h4";
  return (
    <article className={`bg-white border border-gray-200 ${tone} ${nested ? "p-4 space-y-3" : "p-6 space-y-4 shadow-soft"}`}>
      <header>
        <span className={`block text-[11px] font-bold uppercase tracking-widest ${unit.niveau === "section" ? "text-ecideGreen" : unit.niveau === "cellule" ? "text-ecideBlue" : "text-ecideYellow-700"}`}>{kind}</span>
        <Heading className={`font-display font-bold uppercase text-ecideDarkBlue leading-tight ${nested ? "text-lg" : "text-xl"}`}>{unit.label}</Heading>
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
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{unit.niveau === "section" ? t("Cellules et places de résistance") : t("Places de résistance")}</p>
          {unit.children.map((child) => (
            <UnitCard key={child.organe} unit={child} contactUrl={contactUrl} nested />
          ))}
        </div>
      )}
    </article>
  );
}

/** Responsable en ligne compacte : photo ou initiales, fonction, nom, réseaux sociaux. */
function LeaderRow({ c, tone, tag }: { c: Cadre; tone: "blue" | "green"; tag?: string }) {
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
        <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-tight">{c.fonction}{tag && c.categorie !== "federations" ? ` · ${tag}` : ""}</span>
        <span className={`block text-sm leading-tight ${pending ? "italic text-gray-400" : "font-semibold text-gray-900"}`}>{pending ? t(PENDING) : c.nom}</span>
      </span>
      <SocialLinks r={c.reseaux} nom={c.nom} size="w-8 h-8" />
    </li>
  );
}

/* ---------- Cartes et bandeau de coordonnées (organes nationaux, résultats de recherche) ---------- */

function CadreCard({ c, niveauLabel, catLabel }: { c: Cadre; niveauLabel: string; catLabel: string }) {
  const { t } = useI18n();
  const tone = TONE[CATEGORY_TONE[c.categorie] || "blue"];
  const pending = c.nom === PENDING;
  const ini = !pending && c.nom ? c.nom.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "";
  const lieu = [c.province, c.commune ? t("Section de :commune", { commune: c.commune }) : c.ville && c.niveau === "provincial" ? c.ville : "", c.quartier].filter(Boolean);
  return (
    <article className={`bg-white p-6 shadow-soft text-center space-y-3 border-b-2 ${tone.border} reveal is-visible`}>
      {c.photo ? (
        <img src={c.photo} alt="" width={80} height={80} className="w-20 h-20 mx-auto rounded-full object-cover object-[50%_18%] border-2 border-ecideBlue-100" />
      ) : (
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${tone.avatar}`}>{ini ? <span className="font-display text-2xl font-bold">{ini}</span> : <i className="fa-solid fa-user text-2xl" aria-hidden="true"></i>}</div>
      )}
      <div>
        <h3 className="text-lg font-bold text-gray-900 leading-tight">{c.organeLabel || c.organe}</h3>
        <p className={`text-xs font-bold uppercase tracking-widest ${tone.tag} mt-1`}>{c.fonction}</p>
      </div>
      <p className={pending ? "text-gray-400 italic" : "text-gray-800 font-semibold"}>{pending ? t(PENDING) : c.nom}</p>
      <div className="flex flex-wrap justify-center gap-2 text-[11px] font-bold uppercase tracking-wider">
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600">{niveauLabel}</span>
        {c.niveau === "national" && <span className="px-2 py-0.5 bg-gray-100 text-gray-600">{catLabel}</span>}
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
      <div className="col-span-full bg-white border border-gray-200 border-l-4 border-l-ecideBlue p-5 mt-6 first:mt-0 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-widest text-ecideGreen">{t("Contacter la structure")}</span>
            <h3 className="text-2xl text-ecideDarkBlue">{label}</h3>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {c.telephone && <a href={telHref(c.telephone)} className={chip}><i className="fa-solid fa-phone text-ecideBlue" aria-hidden="true"></i>{c.telephone}</a>}
            {c.whatsapp && <a href={waLink(c.whatsapp)} target="_blank" rel="noopener" className={chip}><i className="fa-brands fa-whatsapp text-ecideGreen" aria-hidden="true"></i>{t("WhatsApp")}</a>}
            {c.email && <a href={`mailto:${c.email}`} className={chip}><i className="fa-solid fa-envelope text-ecideBlue" aria-hidden="true"></i>{c.email}</a>}
            {c.canal && <a href={safeUrl(c.canal)} target="_blank" rel="noopener" className={chip}><i className="fa-solid fa-bullhorn text-ecideYellow-700" aria-hidden="true"></i>{t("Chaîne officielle")}</a>}
            <Link href={`${contactUrl}?structure=${encodeURIComponent(organe)}`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-ecideBlue text-white font-bold hover:bg-ecideDarkBlue transition"><i className="fa-solid fa-paper-plane" aria-hidden="true"></i>{t("Écrire")}</Link>
          </div>
        </div>
        {(c.adresse || c.permanence || (!c.telephone && !c.whatsapp)) && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
            {c.adresse && <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-location-dot text-gray-400" aria-hidden="true"></i>{c.adresse}</span>}
            {c.permanence && <span className="inline-flex items-center gap-1.5"><i className="fa-regular fa-clock text-gray-400" aria-hidden="true"></i>{c.permanence}</span>}
            {!c.telephone && !c.whatsapp && (
              c.via && contacts[c.via] ? (
                <span className="inline-flex items-center gap-1.5">
                  <i className="fa-solid fa-diagram-project text-gray-400" aria-hidden="true"></i>
                  {t("Téléphone à confirmer")} · {t("joignable via")}{" "}
                  <button type="button" onClick={() => onVia(c.via!)} className="font-semibold text-ecideBlue hover:text-ecideDarkBlue">{organes[c.via] || c.via}</button>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 italic"><i className="fa-solid fa-phone text-gray-300" aria-hidden="true"></i>{t("Téléphone à confirmer")}</span>
              )
            )}
          </div>
        )}
      </div>
      {children}
    </>
  );
}
