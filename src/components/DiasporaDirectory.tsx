"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { TONE, telHref, waLink, safeUrl } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import type { DiasporaData, DiasporaEntry, StructureContact } from "@/lib/types";
import { SocialLinks, fold, useHashParams } from "./directory";

const PENDING = "À confirmer";

interface State {
  continent: string;
  pays: string;
  ville: string;
  q: string;
}

/** Annuaire de la diaspora : continent → pays → ville (section locale), avec recherche ; l'état vit dans l'adresse (#continent=…). */
export default function DiasporaDirectory({ data, locale, children }: { data: DiasporaData; locale: Locale; children?: ReactNode }) {
  const { t } = useI18n();
  const [hash, setHash] = useHashParams();
  const continentOf = (id: string) => data.continents.find((c) => c.id === id);
  const c0 = hash.get("continent");
  const state: State = { continent: c0 && continentOf(c0) ? c0 : "all", pays: hash.get("pays") || "", ville: hash.get("ville") || "", q: hash.get("q") || "" };
  const setState = (s: State) => {
    const h = new URLSearchParams();
    if (s.continent !== "all") h.set("continent", s.continent);
    if (s.pays) h.set("pays", s.pays);
    if (s.ville) h.set("ville", s.ville);
    if (s.q) h.set("q", s.q);
    setHash(h);
  };

  const list = useMemo(() => {
    const q = fold(state.q.trim());
    return data.entries.filter((e) => {
      if (state.continent !== "all" && e.continent !== state.continent) return false;
      if (state.pays && e.pays !== state.pays) return false;
      if (state.ville && e.ville !== state.ville) return false;
      if (q) {
        const hay = fold([e.nom, e.fonction, e.organe, e.pays, e.ville, continentOf(e.continent)?.label || ""].join(" "));
        return q.split(/\s+/).every((w) => hay.includes(w));
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, state.continent, state.pays, state.ville, state.q]);

  const paysList = Array.from(new Set(data.entries.filter((e) => state.continent === "all" || e.continent === state.continent).map((e) => e.pays))).sort((a, b) => a.localeCompare(b, "fr"));
  const villes = state.pays ? Array.from(new Set(data.entries.filter((e) => e.pays === state.pays && e.ville).map((e) => e.ville))).sort((a, b) => a.localeCompare(b, "fr")) : [];
  const nbPays = new Set(data.entries.map((e) => e.pays)).size;
  const nbVilles = new Set(data.entries.filter((e) => e.ville).map((e) => e.pays + "/" + e.ville)).size;
  const cur = continentOf(state.continent);
  const crumbs = [state.continent === "all" ? t("Diaspora") : cur?.label || "", ...(state.pays ? [state.pays] : []), ...(state.ville ? [state.ville] : []), ...(state.q.trim() ? [`« ${state.q.trim()} »`] : [])];
  const selectCls = "w-full p-3 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-ecideBlue";

  return (
    <>
      <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        {children}
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          {[
            [data.continents.length, t("continents")],
            [nbPays, t("pays")],
            [nbVilles, t("sections locales")],
          ].map(([n, l]) => (
            <div key={String(l)}>
              <span className="font-display text-4xl font-bold text-ecideDarkBlue block leading-none">{n}</span>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 relative">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Continent")}</span>
          <div role="tablist" aria-label={t("Continent")} className="flex flex-wrap gap-2 sm:gap-3 min-w-0">
            <button type="button" role="tab" aria-selected={state.continent === "all"} onClick={() => setState({ ...state, continent: "all", pays: "", ville: "" })} className={`chip px-5 py-3 flex items-center gap-2 ${state.continent === "all" ? "is-active" : ""}`}>
              <i className="fa-solid fa-globe" aria-hidden="true"></i>
              {t("Tous")}
            </button>
            {data.continents.map((c) => (
              <button type="button" key={c.id} role="tab" aria-selected={state.continent === c.id} onClick={() => setState({ ...state, continent: c.id, pays: "", ville: "" })} className={`chip px-5 py-3 flex items-center gap-2 ${state.continent === c.id ? "is-active" : ""}`}>
                <i className={`fa-solid ${c.icon}`} aria-hidden="true"></i>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-500">{cur ? cur.hint : t("Toutes les représentations de l'ECiDé à l'étranger.")}</p>
      </div>

      <div className="bg-white border border-gray-200 p-5 lg:p-6 space-y-5 relative">
        <label className="block">
          <span className="sr-only">{t("Rechercher une représentation")}</span>
          <span className="relative block">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true"></i>
            <input type="search" autoComplete="off" value={state.q} onChange={(e) => setState({ ...state, q: e.target.value })} placeholder={state.pays ? t("Rechercher une ville, une section, un responsable…") : t("Rechercher un pays, une fédération, un responsable…")} className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 text-lg focus:ring-2 focus:ring-ecideBlue" />
          </span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">{t("Pays")}</span>
            <select value={state.pays} onChange={(e) => setState({ ...state, pays: e.target.value, ville: "" })} className={selectCls}>
              <option value="">{t("Tous les pays")}</option>
              {paysList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
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
          <span className="font-bold text-gray-900">{list.length === 0 ? t("Aucun résultat") : list.length === 1 ? t("1 représentation") : t(":n représentations", { n: list.length })}</span>
          <button type="button" onClick={() => setState({ continent: "all", pays: "", ville: "", q: "" })} className="text-ecideBlue font-bold hover:text-ecideDarkBlue"><i className="fa-solid fa-rotate-left mr-1" aria-hidden="true"></i>{t("Réinitialiser")}</button>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative" aria-live="polite">
        {list.map((e) => (
          <EntryCard key={e.id} e={e} continentLabel={continentOf(e.continent)?.label || ""} color={continentOf(e.continent)?.color || "blue"} contacts={data.contacts} organes={data.organes || {}} contactUrl={localePath(locale, data.contactUrl)} onVia={(via) => setState({ ...state, q: via })} />
        ))}
      </div>
      {list.length === 0 && (
        <div className="text-center py-16 space-y-3 relative">
          <i className="fa-solid fa-magnifying-glass text-4xl text-gray-300" aria-hidden="true"></i>
          <p className="text-lg font-bold text-gray-900">{t("Aucune représentation ne correspond à votre recherche.")}</p>
          <p className="text-gray-500">{t("Votre pays n'apparaît pas ? Proposez la création d'une fédération ci-dessous.")}</p>
        </div>
      )}
    </>
  );
}

function EntryCard({ e, continentLabel, color, contacts, organes, contactUrl, onVia }: { e: DiasporaEntry; continentLabel: string; color: keyof typeof TONE; contacts: Record<string, StructureContact>; organes: Record<string, string>; contactUrl: string; onVia: (v: string) => void }) {
  const { t } = useI18n();
  const tone = TONE[color];
  const pending = e.nom === PENDING;
  const lieu = [e.ville ? `${e.ville}, ${e.pays}` : e.pays, continentLabel].join(" · ");
  const c = contacts[e.organe] || ({} as StructureContact);
  const row = "flex items-center gap-2 text-gray-800 hover:text-ecideBlue";
  return (
    <article className={`bg-white p-6 shadow-soft space-y-3 ${tone.border} reveal is-visible`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${tone.avatar}`}><i className={`fa-solid ${e.ville ? "fa-city" : "fa-flag"}`} aria-hidden="true"></i></div>
        <span className={`text-[11px] font-bold uppercase tracking-widest ${tone.tag}`}>{e.ville ? t("Section locale") : t("Secrétariat provincial exécutif")}</span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900 leading-tight">{e.organeLabel || e.organe}</h3>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-1">{e.fonction}</p>
      </div>
      <p className={pending ? "text-gray-400 italic" : "text-gray-800 font-semibold"}>{pending ? t(PENDING) : e.nom}</p>
      <SocialLinks r={e.reseaux} nom={e.nom} />
      <p className="text-sm text-gray-500"><i className="fa-solid fa-location-dot mr-1 text-gray-400" aria-hidden="true"></i>{lieu}</p>
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
