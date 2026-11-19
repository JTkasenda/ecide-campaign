"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { memberApi } from "@/lib/member";
import { showToast } from "@/lib/toast";
import { INPUT, MemberCardBox, MemberPageHeader, Notice, useDialog } from "./ui";

type View = "bureau" | "cadres" | "tous";
interface Entry {
  id: number;
  nomComplet: string;
  initiales: string;
  fonction: string;
  ville: string | null;
  province: string | null;
  pays: string | null;
  categorie: string;
  blocs: string[];
}
interface Detail extends Entry {
  nom: string;
  prenom: string;
  membreDepuis: string | null;
  statutLibelle: string;
}

/**
 * Annuaire du parti, réservé aux membres : Bureau national, cadres, tous les membres. Recherche
 * par nom, fonction ou ville (une recherche lancée depuis le Bureau national porte sur tous les
 * membres), filtres province et pays. Aucune coordonnée personnelle n'est montrée : le téléphone
 * reste réservé aux responsables.
 */
export default function MemberDirectory() {
  const { t, locale } = useI18n();
  const [view, setView] = useState<View>("bureau");
  const [q, setQ] = useState("");
  const [province, setProvince] = useState("");
  const [pays, setPays] = useState("");
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<{ total: number; pages: number; membres: Entry[]; filtres: { provinces: string[]; pays: string[] } } | null>(null);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<number | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ vue: view, page: String(page) });
    if (q.trim()) params.set("q", q.trim());
    if (province) params.set("province", province);
    if (pays) params.set("pays", pays);
    setLoading(true);
    const r = await memberApi<{ total: number; pages: number; membres: Entry[]; filtres: { provinces: string[]; pays: string[] } }>(`annuaire?${params}`, locale);
    setLoading(false);
    if (r.ok) {
      setRes(r.data);
      setError("");
    } else setError(r.message || t("L'annuaire est momentanément indisponible."));
  }, [view, q, province, pays, page, locale, t]);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  async function open(id: number) {
    if (opening) return;
    setOpening(id);
    const r = await memberApi<{ membre: Detail }>(`annuaire/${id}`, locale);
    setOpening(null);
    if (r.ok) setDetail(r.data.membre);
    else showToast(r.message || t("Cette fiche n'a pas pu être ouverte."), "error");
  }

  /** Recherche : depuis le Bureau national (liste courte), elle porte sur tous les membres. */
  const search = (v: string) => {
    setQ(v);
    setPage(1);
    if (v.trim() && !q.trim() && view === "bureau") setView("tous");
  };

  const tabs: [View, string][] = [["bureau", t("Bureau National")], ["cadres", t("Cadres du parti")], ["tous", t("Tous les membres")]];
  const place = (e: Entry) => [e.ville, e.pays === "RD Congo" ? e.province : e.pays].filter(Boolean).join(", ");

  return (
    <div className="space-y-5">
      <MemberPageHeader title={t("Annuaire")} subtitle={t("Les responsables et les membres du parti. Les coordonnées restent réservées aux responsables.")} />
      <div className="member-box m-segmented grid grid-cols-3 gap-1 bg-white border border-gray-200 p-1" role="tablist">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => (setView(k), setPage(1))} className={`py-2 px-2 text-sm font-semibold rounded-lg transition ${view === k ? "m-segmented__on" : "text-gray-600 hover:text-ecideDarkBlue"}`}>{label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-[1fr_auto_auto] gap-3">
        <label className="relative col-span-2 sm:col-span-1">
          <span className="sr-only">{t("Rechercher")}</span>
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true"></i>
          <input type="search" enterKeyHint="search" value={q} onChange={(e) => search(e.target.value)} placeholder={t("Nom, ville, fonction…")} className={`${INPUT} pl-10`} />
        </label>
        <select aria-label={t("Province")} value={province} onChange={(e) => (setProvince(e.target.value), setPage(1))} className={`${INPUT} min-w-0`}>
          <option value="">{t("Toutes les provinces")}</option>
          {(res?.filtres.provinces || []).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select aria-label={t("Pays")} value={pays} onChange={(e) => (setPays(e.target.value), setPage(1))} className={`${INPUT} min-w-0`}>
          <option value="">{t("Tous les pays")}</option>
          {(res?.filtres.pays || []).map((p) => <option key={p} value={p}>{t(p)}</option>)}
        </select>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!res && !error && (
        <p className="text-sm text-gray-500 py-6 text-center" aria-live="polite"><i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>{t("Chargement…")}</p>
      )}
      {res && (
        <>
          <p className="text-sm text-gray-500" aria-live="polite">
            {res.total === 1 ? t("1 personne") : t(":n personnes", { n: res.total })}
            {loading && <i className="fa-solid fa-spinner fa-spin ml-2" aria-hidden="true"></i>}
          </p>
          <MemberCardBox className={`!p-0 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {res.membres.length ? (
              <ul className="divide-y divide-gray-100">
                {res.membres.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => open(e.id)} aria-busy={opening === e.id} className="w-full flex items-center gap-4 px-4 sm:px-5 py-3.5 text-left hover:bg-ecideBlue-50 transition">
                      <span className="w-10 h-10 shrink-0 rounded-full bg-ecideDarkBlue text-white text-xs font-bold flex items-center justify-center">{e.initiales}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-gray-900 truncate">{e.nomComplet}</span>
                        <span className="block text-xs text-gray-500 truncate">{[e.fonction, place(e)].filter(Boolean).join(" · ")}</span>
                      </span>
                      <i className={`fa-solid ${opening === e.id ? "fa-spinner fa-spin text-ecideBlue" : "fa-chevron-right text-gray-300"} text-sm`} aria-hidden="true"></i>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-12 text-center text-gray-500 text-sm space-y-3">
                <p>{view === "tous" ? t("Aucun membre ne correspond à votre recherche.") : q.trim() ? t("Personne dans cette liste ne correspond à votre recherche.") : t("Aucune personne dans cette liste pour le moment.")}</p>
                {view !== "tous" && q.trim() && (
                  <button type="button" onClick={() => (setView("tous"), setPage(1))} className="btn btn--outline btn--sm min-h-10">{t("Chercher dans tous les membres")}</button>
                )}
                {view === "tous" && (q.trim() || province || pays) && (
                  <button type="button" onClick={() => (setQ(""), setProvince(""), setPays(""), setPage(1))} className="btn btn--outline btn--sm min-h-10">{t("Effacer la recherche")}</button>
                )}
              </div>
            )}
          </MemberCardBox>
          {res.pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn btn--outline btn--sm disabled:opacity-40">{t("Précédent")}</button>
              <span className="text-sm text-gray-600">{t("Page :page sur :pages", { page, pages: res.pages })}</span>
              <button type="button" disabled={page >= res.pages} onClick={() => setPage(page + 1)} className="btn btn--outline btn--sm disabled:opacity-40">{t("Suivant")}</button>
            </div>
          )}
        </>
      )}

      {detail && <DetailDialog detail={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

/** Fiche d'une personne de l'annuaire (fenêtre accessible au clavier). */
function DetailDialog({ detail, onClose }: { detail: Detail; onClose: () => void }) {
  const { t, locale } = useI18n();
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dir_title" className="member-box bg-white w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <p id="dir_title" className="font-bold text-ecideDarkBlue text-lg min-w-0 break-words">{detail.nomComplet}</p>
          <button type="button" onClick={onClose} className="w-11 h-11 -mr-2 shrink-0 inline-flex items-center justify-center text-gray-500 hover:text-ecideDarkBlue" aria-label={t("Fermer")}><i className="fa-solid fa-xmark text-xl" aria-hidden="true"></i></button>
        </div>
        <div className="p-5 space-y-4">
          <span className="inline-block px-2.5 py-1 text-xs font-semibold bg-ecideBlue-50 text-ecideBlue">{detail.statutLibelle}</span>
          <dl className="text-sm space-y-2">
            {[
              [t("Nom"), detail.nom],
              [t("Prénom"), detail.prenom],
              [t("Ville"), detail.ville],
              [detail.pays === "RD Congo" ? t("Province") : t("Province, région ou État"), detail.province],
              [t("Pays"), detail.pays ? t(detail.pays) : ""],
              [t("Fonction"), detail.fonction],
              [t("Profil"), detail.categorie],
              [t("Membre depuis"), detail.membreDepuis ? new Date(detail.membreDepuis).toLocaleDateString(locale) : ""],
              [t("Téléphone"), t("Réservé aux responsables")],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                <dt className="text-gray-500 shrink-0">{k}</dt>
                <dd className="font-semibold text-right text-gray-900 min-w-0 break-words">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
