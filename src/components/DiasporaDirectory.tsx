"use client";

import Link from "next/link";
import { useMemo } from "react";
import { TONE, telHref, waLink, safeUrl } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import type { DiasporaData, DiasporaEntry, StructureContact } from "@/lib/types";
import { SocialLinks, fold, useHashParams } from "./directory";

const PENDING = "À confirmer";

/** Niveaux de la diaspora : fédération (pays) → secrétariat provincial exécutif (province du pays) → section (ville) → subdivisions. */
type Level = "federation" | "spe" | "section" | "soussection" | "cellule" | "place";
const LEVELS: Level[] = ["federation", "spe", "section", "soussection", "cellule", "place"];

interface State {
  continent: string;
  pays: string;
  province: string;
  ville: string;
  q: string;
}

/** Représentation (fédération, secrétariat, section, subdivision) : ses responsables, ses coordonnées, ses sous-structures. */
interface Node {
  organe: string;
  label: string;
  niveau: Level;
  pays: string;
  province: string;
  ville: string;
  continent: string;
  contact: StructureContact;
  responsables: DiasporaEntry[];
  children: Node[];
}

/** Pays : sa fédération, ses secrétariats provinciaux exécutifs (avec leurs sections) et les sections sans province. */
interface Country {
  pays: string;
  continent: string;
  federation: Node;
  provinces: Node[];
  sections: Node[];
}

const levelOf = (e: { type?: string; ville?: string }): Level => (e.type && (LEVELS as string[]).includes(e.type) ? (e.type as Level) : e.ville ? "section" : "federation");

/* Nom d'une fédération qui n'a pas encore de fiche (mêmes règles que le serveur) */
const MASC = ["Canada", "Royaume-Uni", "Congo-Brazzaville", "Congo", "Portugal", "Japon", "Brésil", "Sénégal", "Cameroun", "Gabon", "Bénin", "Burundi", "Rwanda", "Kenya", "Nigeria", "Ghana", "Mali", "Maroc", "Luxembourg", "Danemark", "Mozambique", "Zimbabwe", "Malawi", "Togo", "Tchad", "Niger", "Liban", "Qatar", "Koweït", "Mexique", "Chili", "Pérou", "Venezuela", "Vietnam", "Cap-Vert", "Soudan", "Soudan du Sud", "Botswana", "Lesotho", "Burkina Faso"];
const PLUR = ["États-Unis", "Émirats arabes unis", "Pays-Bas", "Comores", "Seychelles", "Philippines"];
const fedName = (pays: string) => "Fédération " + (MASC.includes(pays) ? `du ${pays}` : PLUR.includes(pays) ? `des ${pays}` : /^[aeiouyàâäéèêëîïôöûüœh]/i.test(pays) ? `d'${pays}` : `de ${pays}`);

/** Toutes les sections d'un pays (dans ses provinces et sans province). */
const sectionsOf = (c: Country) => [...c.provinces.flatMap((p) => p.children.filter((n) => n.niveau === "section")), ...c.sections];

/**
 * Annuaire de la diaspora, selon la structure du parti : par continent et par pays, la fédération
 * du pays (ses responsables et ses coordonnées), puis ses secrétariats provinciaux exécutifs, un par
 * province ou région, avec leurs sections (villes) et, le cas échéant, leurs sous-sections, cellules
 * et noyaux. La recherche parcourt toutes les représentations ; l'état vit dans l'adresse
 * (#continent=…&pays=…&province=…).
 */
export default function DiasporaDirectory({ data, locale }: { data: DiasporaData; locale: Locale }) {
  const { t } = useI18n();
  const [hash, setHash] = useHashParams();
  const continentOf = (id: string) => data.continents.find((c) => c.id === id);
  const c0 = hash.get("continent");
  const state: State = { continent: c0 && continentOf(c0) ? c0 : "all", pays: hash.get("pays") || "", province: hash.get("province") || "", ville: hash.get("ville") || "", q: hash.get("q") || "" };
  const setState = (s: State) => {
    const h = new URLSearchParams();
    if (s.continent !== "all") h.set("continent", s.continent);
    if (s.pays) h.set("pays", s.pays);
    if (s.province) h.set("province", s.province);
    if (s.ville) h.set("ville", s.ville);
    if (s.q) h.set("q", s.q);
    setHash(h);
  };
  // Libellé traduit fourni par l'API ; à défaut, le nom construit ici se traduit par le dictionnaire
  const organeLabel = (organe: string) => {
    if (data.organes?.[organe]) return data.organes[organe];
    const spe = organe.match(/^Secrétariat Provincial Exécutif (?:de |d')(.+)$/);
    return spe ? t("Secrétariat Provincial Exécutif de :lieu", { lieu: spe[1] }) : organe;
  };
  const contactUrl = localePath(locale, data.contactUrl);

  /* ---------- Arbre : continent → pays → fédération → secrétariats provinciaux → sections → subdivisions ---------- */

  const countries = useMemo(() => {
    const nodes = new Map<string, Node>();
    const node = (organe: string, niveau: Level, e: { pays: string; province?: string; ville?: string; continent: string }) => {
      if (!nodes.has(organe)) nodes.set(organe, { organe, label: organeLabel(organe), niveau, pays: e.pays, province: e.province || "", ville: e.ville || "", continent: e.continent, contact: data.contacts?.[organe] || { organe }, responsables: [], children: [] });
      return nodes.get(organe)!;
    };
    data.entries.forEach((e) => node(e.organe, levelOf(e), e).responsables.push(e));
    // Coordonnées publiées sans responsable : la représentation existe quand même
    Object.values(data.contacts || {}).forEach((c) => {
      const niveau = (c.type || "").replace(/^diaspora-/, "");
      if (c.pays && (LEVELS as string[]).includes(niveau)) {
        const e = data.entries.find((x) => x.pays === c.pays);
        node(c.organe, niveau as Level, { pays: c.pays, province: c.province || "", ville: c.ville || "", continent: c.continent || e?.continent || "europe" });
      }
    });
    // Un pays sans fédération déclarée a quand même une entrée, « à confirmer »
    [...nodes.values()].forEach((n) => {
      if (![...nodes.values()].some((f) => f.niveau === "federation" && f.pays === n.pays)) node(fedName(n.pays), "federation", { pays: n.pays, continent: n.continent });
    });
    const all = [...nodes.values()];
    const byPays = new Map<string, Country>();
    all.filter((n) => n.niveau === "federation").forEach((n) => byPays.set(n.pays, { pays: n.pays, continent: n.continent, federation: n, provinces: [], sections: [] }));
    const find = (organe: string) => (organe ? all.find((p) => fold(p.organe) === fold(organe)) : undefined);
    const viaOf = (n: Node) => find(n.responsables[0]?.via || n.contact.via || "");
    all.filter((n) => n.niveau === "spe").forEach((n) => byPays.get(n.pays)?.provinces.push(n));
    // Sections : sous le secrétariat de leur province ; sinon, « sans province » dans le pays
    all.filter((n) => n.niveau === "section").forEach((n) => {
      const via = viaOf(n);
      const parent = via && via.niveau === "spe" ? via : n.province ? all.find((p) => p.niveau === "spe" && p.pays === n.pays && fold(p.province) === fold(n.province)) : undefined;
      if (parent) parent.children.push(n);
      else byPays.get(n.pays)?.sections.push(n);
    });
    // Subdivisions : sous la structure déclarée, sinon la section de la même ville
    all.filter((n) => !["federation", "spe", "section"].includes(n.niveau)).forEach((n) => {
      const via = viaOf(n);
      const parent = (via && !["federation", "spe"].includes(via.niveau) ? via : undefined) || all.find((p) => p.niveau === "section" && p.pays === n.pays && fold(p.ville) === fold(n.ville));
      if (parent && parent !== n) parent.children.push(n);
      else byPays.get(n.pays)?.sections.push(n);
    });
    const byName = (a: Node, b: Node) => (a.province || a.ville || a.label).localeCompare(b.province || b.ville || b.label, "fr");
    all.forEach((n) => n.children.sort(byName));
    byPays.forEach((c) => {
      c.provinces.sort(byName);
      c.sections.sort(byName);
    });
    return [...byPays.values()].sort((a, b) => a.pays.localeCompare(b.pays, "fr"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  /* ---------- Recherche ---------- */

  const searching = state.q.trim().length > 0;
  const list = useMemo(() => {
    const q = fold(state.q.trim());
    if (!q) return [];
    return data.entries.filter((e) => {
      if (state.continent !== "all" && e.continent !== state.continent) return false;
      if (state.pays && e.pays !== state.pays) return false;
      const hay = fold([e.nom, e.fonction, e.organe, organeLabel(e.organe), e.pays, e.province || "", e.ville, e.via || "", continentOf(e.continent)?.label || ""].join(" "));
      return q.split(/\s+/).every((w) => hay.includes(w));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, state.continent, state.pays, state.q]);

  const visible = countries.filter((c) => state.continent === "all" || c.continent === state.continent);
  const paysList = visible.map((c) => c.pays);
  const country = state.pays ? countries.find((c) => c.pays === state.pays) : undefined;
  const provinceNames = country ? country.provinces.map((p) => p.province).filter(Boolean) : [];
  const villes = country ? sectionsOf(country).filter((s) => !state.province || fold(s.province) === fold(state.province)).map((s) => s.ville).filter(Boolean) : [];
  const cur = continentOf(state.continent);
  const crumbs = [state.continent === "all" ? t("Diaspora") : cur?.label || "", ...(state.pays ? [state.pays] : []), ...(state.province ? [state.province] : []), ...(state.ville ? [state.ville] : []), ...(state.q.trim() ? [`« ${state.q.trim()} »`] : [])];
  const selectCls = "w-full p-3 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-ecideBlue";
  const countLabel = searching
    ? list.length === 0 ? t("Aucun résultat") : list.length === 1 ? t("1 représentation") : t(":n représentations", { n: list.length })
    : country
      ? country.provinces.length === 1 ? t("1 province") : t(":n provinces", { n: country.provinces.length })
      : visible.length === 1 ? t("1 pays") : t(":n pays", { n: visible.length });

  return (
    <>
      <div className="space-y-3 relative">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Continent")}</span>
          <div role="tablist" aria-label={t("Continent")} className="flex flex-wrap gap-2 sm:gap-3 min-w-0">
            <button type="button" role="tab" aria-selected={state.continent === "all"} onClick={() => setState({ ...state, continent: "all", pays: "", province: "", ville: "" })} className={`chip px-5 py-3 flex items-center gap-2 ${state.continent === "all" ? "is-active" : ""}`}>
              <i className="fa-solid fa-globe" aria-hidden="true"></i>
              {t("Tous")}
            </button>
            {data.continents.map((c) => (
              <button type="button" key={c.id} role="tab" aria-selected={state.continent === c.id} onClick={() => setState({ ...state, continent: c.id, pays: "", province: "", ville: "" })} className={`chip px-5 py-3 flex items-center gap-2 ${state.continent === c.id ? "is-active" : ""}`}>
                <i className={`fa-solid ${c.icon}`} aria-hidden="true"></i>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-500">{cur ? cur.hint : t("Une fédération par pays, ses secrétariats provinciaux exécutifs et leurs sections locales : toutes les représentations de l'ECiDé à l'étranger.")}</p>
      </div>

      <div className="bg-ecideBlue-50 p-5 lg:p-6 space-y-5 relative">
        <label className="block">
          <span className="sr-only">{t("Rechercher une représentation")}</span>
          <span className="relative block">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true"></i>
            <input type="search" autoComplete="off" value={state.q} onChange={(e) => setState({ ...state, q: e.target.value })} placeholder={state.pays ? t("Rechercher une province, une ville, une section, un responsable…") : t("Rechercher un pays, une fédération, une province, un responsable…")} className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 text-lg focus:ring-2 focus:ring-ecideBlue" />
          </span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">{t("Pays")}</span>
            <select value={state.pays} onChange={(e) => setState({ ...state, pays: e.target.value, province: "", ville: "" })} className={selectCls}>
              <option value="">{t("Tous les pays")}</option>
              {paysList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          {state.pays && provinceNames.length > 0 && (
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">{t("Province")}</span>
              <select value={state.province} onChange={(e) => setState({ ...state, province: e.target.value, ville: "" })} className={selectCls}>
                <option value="">{t("Toutes les provinces")}</option>
                {provinceNames.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
          )}
          {state.pays && villes.length > 0 && (
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">{t("Ville / section locale")}</span>
              <select value={state.ville} onChange={(e) => setState({ ...state, ville: e.target.value })} className={selectCls}>
                <option value="">{t("Toutes les villes")}</option>
                {villes.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-gray-500 relative">
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
          <button type="button" onClick={() => setState({ continent: "all", pays: "", province: "", ville: "", q: "" })} className="text-ecideBlue font-bold hover:text-ecideDarkBlue"><i className="fa-solid fa-rotate-left mr-1" aria-hidden="true"></i>{t("Réinitialiser")}</button>
        </p>
      </div>

      {/* Recherche : toutes les représentations qui correspondent */}
      {searching && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative" aria-live="polite">
            {list.map((e) => (
              <EntryCard key={e.id} e={e} continentLabel={continentOf(e.continent)?.label || ""} color={continentOf(e.continent)?.color || "blue"} contacts={data.contacts} organes={data.organes || {}} contactUrl={contactUrl} onVia={(via) => setState({ ...state, q: via })} />
            ))}
          </div>
          {list.length === 0 && (
            <div className="text-center py-20 space-y-3 relative">
              <i className="fa-solid fa-magnifying-glass text-4xl text-gray-300" aria-hidden="true"></i>
              <p className="text-lg font-bold text-gray-900">{t("Aucune représentation ne correspond à votre recherche.")}</p>
              <p className="text-gray-500">{t("Votre pays n'apparaît pas ? Proposez la création d'une fédération ci-dessous.")}</p>
            </div>
          )}
        </>
      )}

      {/* Pays : une fédération par pays */}
      {!searching && !country && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative" aria-live="polite">
          {visible.map((c) => {
            const tone = TONE[continentOf(c.continent)?.color || "blue"];
            const k = c.federation.contact;
            const nSections = sectionsOf(c).length;
            return (
              <button type="button" key={c.pays} onClick={() => setState({ ...state, pays: c.pays, province: "", ville: "" })} className="text-left panel p-6 space-y-3 hover:bg-white transition">
                <span className={`block text-[11px] font-bold uppercase tracking-widest ${tone.tag}`}>{c.pays} · {continentOf(c.continent)?.label}</span>
                <span className="block font-display text-2xl text-ecideDarkBlue leading-tight">{c.federation.label}</span>
                <span className="block text-sm text-gray-600">
                  {k.telephone || k.whatsapp ? (
                    <><i className="fa-solid fa-phone text-ecideBlue mr-1" aria-hidden="true"></i>{k.telephone || k.whatsapp}</>
                  ) : k.email ? (
                    <><i className="fa-solid fa-envelope text-ecideBlue mr-1" aria-hidden="true"></i>{k.email}</>
                  ) : (
                    <span className="italic text-gray-400">{t("Contact à confirmer")}</span>
                  )}
                </span>
                <span className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600">{c.provinces.length === 1 ? t("1 province") : t(":n provinces", { n: c.provinces.length })}</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600">{nSections === 1 ? t("1 section") : t(":n sections", { n: nSections })}</span>
                </span>
                <span className="inline-flex items-center gap-2 text-sm font-bold text-ecideBlue">{t("Voir la fédération")} <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i></span>
              </button>
            );
          })}
          {visible.length === 0 && (
            <div className="col-span-full text-center py-20 space-y-3">
              <i className="fa-solid fa-earth-africa text-4xl text-gray-300" aria-hidden="true"></i>
              <p className="text-lg font-bold text-gray-900">{t("Aucune représentation sur ce continent pour le moment.")}</p>
              <p className="text-gray-500">{t("Votre pays n'apparaît pas ? Proposez la création d'une fédération ci-dessous.")}</p>
            </div>
          )}
        </div>
      )}

      {!searching && country && (
        <CountryView country={country} continentLabel={continentOf(country.continent)?.label || ""} provinceFilter={state.province} villeFilter={state.ville} organes={data.organes || {}} contactUrl={contactUrl} onAll={() => setState({ ...state, province: "", ville: "" })} onBack={() => setState({ ...state, pays: "", province: "", ville: "" })} onVia={(via) => setState({ ...state, q: via })} />
      )}
    </>
  );
}

/* ---------- Un pays : sa fédération, puis ses secrétariats provinciaux exécutifs et leurs sections ---------- */

function CountryView({ country, continentLabel, provinceFilter, villeFilter, organes, contactUrl, onAll, onBack, onVia }: { country: Country; continentLabel: string; provinceFilter: string; villeFilter: string; organes: Record<string, string>; contactUrl: string; onAll: () => void; onBack: () => void; onVia: (via: string) => void }) {
  const { t } = useI18n();
  const fed = country.federation;
  const c = fed.contact;
  const chip = "inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 font-semibold text-gray-800 hover:border-ecideBlue hover:text-ecideBlue transition";
  const provinces = country.provinces.filter((p) => !provinceFilter || fold(p.province) === fold(provinceFilter));
  const villeSections = villeFilter ? sectionsOf(country).filter((s) => fold(s.ville) === fold(villeFilter)) : [];
  const orphans = provinceFilter ? [] : country.sections;
  return (
    <section className="space-y-10 relative" aria-live="polite">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue"><i className="fa-solid fa-arrow-left text-xs" aria-hidden="true"></i>{t("Tous les pays")}</button>

      <div className="bg-ecideDarkBlue text-white diag p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-widest text-ecideGreen">{t("Fédération")}</span>
            <h2 className="text-3xl lg:text-4xl text-white no-bar">{fed.label}</h2>
            <p className="text-sm text-blue-200 mt-1"><i className="fa-solid fa-earth-africa text-gray-400 mr-1" aria-hidden="true"></i>{country.pays} · {continentLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm md:justify-end">
            {c.telephone && <a href={telHref(c.telephone)} className={chip}><i className="fa-solid fa-phone text-ecideBlue" aria-hidden="true"></i>{c.telephone}</a>}
            {c.whatsapp && <a href={waLink(c.whatsapp)} target="_blank" rel="noopener" className={chip}><i className="fa-brands fa-whatsapp text-ecideGreen" aria-hidden="true"></i>{t("WhatsApp")}</a>}
            {c.email && <a href={`mailto:${c.email}`} className={chip}><i className="fa-solid fa-envelope text-ecideBlue" aria-hidden="true"></i>{c.email}</a>}
            {c.canal && <a href={safeUrl(c.canal)} target="_blank" rel="noopener" className={chip}><i className="fa-solid fa-bullhorn text-ecideYellow-700" aria-hidden="true"></i>{t("Chaîne officielle")}</a>}
            <Link href={`${contactUrl}?structure=${encodeURIComponent(fed.organe)}`} className="btn btn--primary btn--sm"><i className="fa-solid fa-paper-plane" aria-hidden="true"></i>{t("Écrire")}</Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-blue-100">
          {c.adresse && <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-location-dot text-gray-400" aria-hidden="true"></i>{c.adresse}</span>}
          {c.permanence && <span className="inline-flex items-center gap-1.5"><i className="fa-regular fa-clock text-gray-400" aria-hidden="true"></i>{c.permanence}</span>}
          {!c.telephone && !c.whatsapp && (
            <span className="inline-flex items-center gap-1.5 italic">
              <i className="fa-solid fa-phone text-gray-300" aria-hidden="true"></i>
              {t("Contact à confirmer")}
              {c.via ? <> · {t("joignable via")} <button type="button" onClick={() => onVia(c.via!)} className="font-semibold text-ecideYellow hover:text-white underline not-italic">{organes[c.via] || c.via}</button></> : null}
            </span>
          )}
        </div>
        <div className="space-y-3">
          <h3 className="text-xl text-white">{t("Responsables de la fédération")}</h3>
          {fed.responsables.length === 0 ? (
            <p className="text-sm text-blue-200 italic">{t("Responsables à confirmer.")}</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3">
              {fed.responsables.map((r) => (
                <PersonRow key={r.id} e={r} light />
              ))}
            </ul>
          )}
        </div>
      </div>

      {villeFilter ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <h3 className="text-3xl text-ecideDarkBlue">{t("Section de :commune", { commune: villeFilter })}</h3>
            <button type="button" onClick={onAll} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue">{t("Toutes les provinces")}</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {villeSections.map((s) => (
              <NodeCard key={s.organe} node={s} contactUrl={contactUrl} />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Provinces et sections")}</span>
                <h3 className="text-3xl text-ecideDarkBlue">{provinceFilter ? provinceFilter : t("Les secrétariats provinciaux exécutifs")}</h3>
              </div>
              {provinceFilter && <button type="button" onClick={onAll} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue">{t("Toutes les provinces")}</button>}
            </div>
            {provinces.length === 0 ? (
              <p className="text-gray-500 italic">{t("Aucun secrétariat provincial exécutif renseigné pour ce pays pour le moment.")}</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {provinces.map((p) => (
                  <NodeCard key={p.organe} node={p} contactUrl={contactUrl} />
                ))}
              </div>
            )}
          </div>
          {orphans.length > 0 && (
            <div className="space-y-4">
              <div>
                <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Sections")}</span>
                <h3 className="text-3xl text-ecideDarkBlue">{t("Sections rattachées directement à la fédération")}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {orphans.map((s) => (
                  <NodeCard key={s.organe} node={s} contactUrl={contactUrl} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Carte d'une section (avec ses subdivisions imbriquées), d'une sous-section, d'une cellule ou d'un noyau. */
function NodeCard({ node, contactUrl, nested = false }: { node: Node; contactUrl: string; nested?: boolean }) {
  const { t } = useI18n();
  // Rattachement : celui des coordonnées publiées, sinon celui déclaré sur la fiche du responsable
  const c: StructureContact = { ...node.contact, via: node.contact.via || node.responsables[0]?.via || "" };
  const row = "flex items-center gap-2 text-gray-800 hover:text-ecideBlue";
  const KIND: Record<Level, string> = { federation: t("Fédération"), spe: t("Secrétariat provincial exécutif"), section: t("Section locale"), soussection: t("Sous-section"), cellule: t("Cellule"), place: t("Noyau") };
  const KIND_TONE: Record<Level, string> = { federation: "text-ecideBlue", spe: "text-ecideBlue", section: "text-ecideGreen", soussection: "text-ecideGreen", cellule: "text-ecideBlue", place: "text-ecideYellow-700" };
  const CHILDREN: Record<Level, string> = { federation: t("Secrétariats provinciaux exécutifs"), spe: t("Sections"), section: t("Sous-sections, cellules et noyaux"), soussection: t("Cellules et noyaux"), cellule: t("Noyaux"), place: "" };
  const Heading = nested ? "h5" : "h4";
  return (
    <article className={nested ? "panel panel--white p-4 space-y-3" : "panel p-6 space-y-4"}>
      <header>
        <span className={`block text-[11px] font-bold uppercase tracking-widest ${KIND_TONE[node.niveau]}`}>{KIND[node.niveau]}</span>
        <Heading className={`font-display text-ecideDarkBlue leading-tight ${nested ? "text-xl" : "text-2xl"}`}>{node.label}</Heading>
        {(node.ville || node.province) && <p className="text-sm text-gray-500 mt-1"><i className="fa-solid fa-location-dot text-gray-400 mr-1" aria-hidden="true"></i>{[node.ville, node.niveau === "spe" ? node.province : "", node.pays].filter(Boolean).join(", ")}</p>}
      </header>
      <div className="space-y-1.5 text-sm">
        {c.email && <a href={`mailto:${c.email}`} className={`${row} break-all`}><i className="fa-solid fa-envelope w-4 text-ecideBlue" aria-hidden="true"></i>{c.email}</a>}
        {c.telephone && <a href={telHref(c.telephone)} className={row}><i className="fa-solid fa-phone w-4 text-ecideBlue" aria-hidden="true"></i>{c.telephone}</a>}
        {c.whatsapp && <a href={waLink(c.whatsapp)} target="_blank" rel="noopener" className={row}><i className="fa-brands fa-whatsapp w-4 text-ecideGreen" aria-hidden="true"></i>{t("WhatsApp")}{/^https?:/.test(c.whatsapp) ? "" : ` · ${c.whatsapp}`}</a>}
        {c.canal && <a href={safeUrl(c.canal)} target="_blank" rel="noopener" className={row}><i className="fa-solid fa-bullhorn w-4 text-ecideYellow-700" aria-hidden="true"></i>{t("Chaîne officielle")}</a>}
        {c.adresse && <span className="flex items-center gap-2 text-gray-600"><i className="fa-solid fa-location-dot w-4 text-gray-400" aria-hidden="true"></i>{c.adresse}</span>}
        {c.permanence && <span className="flex items-center gap-2 text-gray-600"><i className="fa-regular fa-clock w-4 text-gray-400" aria-hidden="true"></i>{c.permanence}</span>}
        {!c.telephone && !c.whatsapp && (
          <span className="flex items-center gap-2 text-gray-500 italic"><i className="fa-solid fa-phone w-4 text-gray-300" aria-hidden="true"></i>{t("Contact à confirmer")}{c.via ? ` · ${t("joignable via")} ${c.via}` : ""}</span>
        )}
        <Link href={`${contactUrl}?structure=${encodeURIComponent(node.organe)}`} className="flex items-center gap-2 font-bold text-ecideBlue hover:text-ecideDarkBlue"><i className="fa-solid fa-paper-plane w-4" aria-hidden="true"></i>{t("Écrire via le formulaire")}</Link>
      </div>
      <div className="border-t border-gray-100 pt-3 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{t("Responsables")}</p>
        {node.responsables.length === 0 ? (
          <p className="text-sm text-gray-400 italic">{t(PENDING)}</p>
        ) : (
          <ul className="space-y-2">
            {node.responsables.map((r) => (
              <PersonRow key={r.id} e={r} />
            ))}
          </ul>
        )}
      </div>
      {node.children.length > 0 && (
        <div className="border-t border-gray-100 pt-3 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{CHILDREN[node.niveau]}</p>
          {node.children.map((child) => (
            <NodeCard key={child.organe} node={child} contactUrl={contactUrl} nested />
          ))}
        </div>
      )}
    </article>
  );
}

/** Responsable en ligne compacte : initiales, fonction, nom, réseaux sociaux. */
function PersonRow({ e, light = false }: { e: DiasporaEntry; light?: boolean }) {
  const { t } = useI18n();
  const pending = e.nom === PENDING;
  const ini = !pending && e.nom ? e.nom.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "";
  return (
    <li className="flex items-center gap-3 min-w-0">
      <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-ecideBlue-50 text-ecideBlue">{ini ? <span className="font-display font-bold">{ini}</span> : <i className="fa-solid fa-user text-sm" aria-hidden="true"></i>}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[10px] font-bold uppercase tracking-widest leading-tight ${light ? "text-blue-200" : "text-gray-500"}`}>{e.fonction}</span>
        <span className={`block text-sm leading-tight ${pending ? `italic ${light ? "text-blue-300" : "text-gray-400"}` : `font-semibold ${light ? "text-white" : "text-gray-900"}`}`}>{pending ? t(PENDING) : e.nom}</span>
      </span>
      <SocialLinks r={e.reseaux} nom={e.nom} size="w-8 h-8" />
    </li>
  );
}

/* ---------- Résultat de recherche : une représentation et ses coordonnées ---------- */

function EntryCard({ e, continentLabel, color, contacts, organes, contactUrl, onVia }: { e: DiasporaEntry; continentLabel: string; color: keyof typeof TONE; contacts: Record<string, StructureContact>; organes: Record<string, string>; contactUrl: string; onVia: (v: string) => void }) {
  const { t } = useI18n();
  const tone = TONE[color];
  const pending = e.nom === PENDING;
  const niveau = levelOf(e);
  const KIND: Record<Level, string> = { federation: t("Fédération"), spe: t("Secrétariat provincial exécutif"), section: t("Section locale"), soussection: t("Sous-section"), cellule: t("Cellule"), place: t("Noyau") };
  const ICON: Record<Level, string> = { federation: "fa-flag", spe: "fa-map-location-dot", section: "fa-city", soussection: "fa-building", cellule: "fa-house-user", place: "fa-circle-nodes" };
  const lieu = [[e.ville, e.province, e.pays].filter(Boolean).join(", "), continentLabel].join(" · ");
  const c = contacts[e.organe] || ({} as StructureContact);
  const row = "flex items-center gap-2 text-gray-800 hover:text-ecideBlue";
  return (
    <article className="panel p-6 space-y-3 reveal is-visible">
      <div className="flex items-start justify-between gap-3">
        <div className={`icon-tile ${tone.avatar}`}><i className={`fa-solid ${ICON[niveau]}`} aria-hidden="true"></i></div>
        <span className={`text-[11px] font-bold uppercase tracking-widest ${tone.tag}`}>{KIND[niveau]}</span>
      </div>
      <div>
        <h3 className="text-2xl text-gray-900 leading-tight">{e.organeLabel || e.organe}</h3>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-1">{e.fonction}</p>
      </div>
      <p className={pending ? "text-gray-400 italic" : "text-gray-800 font-semibold"}>{pending ? t(PENDING) : e.nom}</p>
      <SocialLinks r={e.reseaux} nom={e.nom} />
      <p className="text-sm text-gray-500"><i className="fa-solid fa-location-dot mr-1 text-gray-400" aria-hidden="true"></i>{lieu}</p>
      {e.via && <p className="text-sm text-gray-500"><i className="fa-solid fa-diagram-project mr-1 text-gray-400" aria-hidden="true"></i>{t("Rattachée à")} <button type="button" onClick={() => onVia(e.via!)} className="font-semibold text-ecideBlue hover:text-ecideDarkBlue">{organes[e.via] || e.via}</button></p>}
      <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
        {c.email && <a href={`mailto:${c.email}`} className={`${row} break-all`}><i className="fa-solid fa-envelope w-4 text-ecideBlue" aria-hidden="true"></i>{c.email}</a>}
        {c.telephone && <a href={telHref(c.telephone)} className={row}><i className="fa-solid fa-phone w-4 text-ecideBlue" aria-hidden="true"></i>{c.telephone}</a>}
        {c.whatsapp && <a href={waLink(c.whatsapp)} target="_blank" rel="noopener" className={row}><i className="fa-brands fa-whatsapp w-4 text-ecideGreen" aria-hidden="true"></i>{t("WhatsApp")}{/^https?:/.test(c.whatsapp) ? "" : ` · ${c.whatsapp}`}</a>}
        {c.canal && <a href={safeUrl(c.canal)} target="_blank" rel="noopener" className={row}><i className="fa-solid fa-bullhorn w-4 text-ecideYellow-700" aria-hidden="true"></i>{t("Chaîne officielle")}</a>}
        {c.adresse && <span className="flex items-center gap-2 text-gray-600"><i className="fa-solid fa-location-dot w-4 text-gray-400" aria-hidden="true"></i>{c.adresse}</span>}
        {c.permanence && <span className="flex items-center gap-2 text-gray-600"><i className="fa-regular fa-clock w-4 text-gray-400" aria-hidden="true"></i>{c.permanence}</span>}
        {!c.telephone && !c.whatsapp && (
          c.via ? (
            <span className="flex items-start gap-2 text-gray-500">
              <i className="fa-solid fa-diagram-project w-4 mt-1 text-gray-400" aria-hidden="true"></i>
              <span>
                {t("Contact à confirmer")} · {t("joignable via")} <button type="button" onClick={() => onVia(c.via!)} className="font-semibold text-ecideBlue hover:text-ecideDarkBlue">{organes[c.via] || c.via}</button>
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-gray-500 italic"><i className="fa-solid fa-phone w-4 text-gray-300" aria-hidden="true"></i>{t("Contact à confirmer")}</span>
          )
        )}
        <Link href={`${contactUrl}?structure=${encodeURIComponent(e.organe)}`} className="flex items-center gap-2 font-bold text-ecideBlue hover:text-ecideDarkBlue"><i className="fa-solid fa-paper-plane w-4" aria-hidden="true"></i>{t("Écrire via le formulaire")}</Link>
      </div>
    </article>
  );
}
