"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { memberApi, type EventReport, type EventReportOptions } from "@/lib/member";
import { showToast } from "@/lib/toast";
import { useOnline } from "../OfflineSupport";
import { useMember } from "./MemberContext";
import MemberReportForm from "./MemberReportForm";
import { readReportDraft } from "./offlineDraft";
import { MemberPageHeader, Notice } from "./ui";

type View = { mode: "list" } | { mode: "form"; id: number | null };

/** Vue demandée par l'adresse : ?nouveau=1 ou ?rapport=12. */
function viewFromUrl(): View {
  const q = new URLSearchParams(window.location.search);
  const id = Number(q.get("rapport"));
  if (id > 0) return { mode: "form", id };
  return q.has("nouveau") ? { mode: "form", id: null } : { mode: "list" };
}

/**
 * Mes rapports d'activités : liste des rapports du membre et formulaire (nouveau, modification,
 * lecture seule une fois examiné) sur la même page. Le passage de la liste au formulaire se fait
 * dans le navigateur, sans recharger la page : un nouveau rapport s'ouvre même hors ligne une
 * fois la page chargée (l'espace membre n'est jamais gardé par le service worker).
 */
export default function MemberReports() {
  const { t, locale } = useI18n();
  const { data } = useMember();
  const online = useOnline();
  const [reports, setReports] = useState<EventReport[] | null>(null);
  const [options, setOptions] = useState<EventReportOptions | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>({ mode: "list" });
  const [pendingNew, setPendingNew] = useState(false);

  const load = useCallback(async () => {
    const r = await memberApi<{ rapports: EventReport[]; options: EventReportOptions }>("rapports", locale);
    if (r.ok) {
      setReports(r.data.rapports || []);
      setOptions(r.data.options);
      setError("");
    } else setError(r.status === 0 ? "offline" : r.message || "-");
  }, [locale]);

  useEffect(() => {
    // Liste lue une fois dans le navigateur, avec la vue demandée par l'adresse
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    setView(viewFromUrl());
    setPendingNew(!!readReportDraft(data.membre.id, "nouveau"));
    const back = () => setView(viewFromUrl());
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [load, data.membre.id]);

  const go = (v: View) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("rapport");
    url.searchParams.delete("nouveau");
    if (v.mode === "form") url.searchParams.set(v.id ? "rapport" : "nouveau", v.id ? String(v.id) : "1");
    window.history.pushState(null, "", url);
    setView(v);
    window.scrollTo({ top: 0 });
  };

  const current = view.mode === "form" && view.id ? reports?.find((r) => r.id === view.id) || null : null;

  const saved = (r: EventReport, message: string, stay: boolean) => {
    setReports((list) => [r, ...(list || []).filter((x) => x.id !== r.id)].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id)));
    setPendingNew(!!readReportDraft(data.membre.id, "nouveau"));
    showToast(message, stay ? "error" : "info");
    go(stay ? { mode: "form", id: r.id } : { mode: "list" });
  };

  const day = (iso: string) => {
    const s = new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const n = (v: number) => new Intl.NumberFormat(locale).format(v);

  const header = (
    <MemberPageHeader
      title={t("Mes rapports d'activités")}
      subtitle={t("Rendez compte des événements que vous avez organisés : lieu, participants, incidents.")}
      action={view.mode === "list" ? (
        <button type="button" onClick={() => go({ mode: "form", id: null })} disabled={!options} className="btn btn--yellow btn--sm min-h-11 whitespace-nowrap w-full sm:w-auto justify-center">
          <i className="fa-solid fa-plus" aria-hidden="true"></i>{t("Nouveau rapport")}
        </button>
      ) : undefined}
    />
  );

  if (view.mode === "form") {
    const missing = view.id !== null && reports !== null && !current;
    return (
      <div className="space-y-6">
        {header}
        <button type="button" onClick={() => go({ mode: "list" })} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue py-2 -my-2">
          <i className="fa-solid fa-arrow-left mr-2" aria-hidden="true"></i>{t("Retour à mes rapports")}
        </button>
        <h2 className="text-2xl font-bold text-ecideDarkBlue no-bar member-title">{view.id === null ? t("Nouveau rapport") : current?.modifiable === false ? current.titre : t("Modifier le rapport")}</h2>
        {!options && !error && <p className="text-sm text-gray-500"><i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>{t("Chargement…")}</p>}
        {!options && error && <Notice tone={error === "offline" ? "warn" : "error"}>{error === "offline" ? t("Hors ligne : le formulaire s'affichera au retour de la connexion.") : error === "-" ? t("Vos rapports n'ont pas pu être chargés.") : error}</Notice>}
        {missing && <Notice tone="error">{t("Rapport introuvable.")}</Notice>}
        {options && !missing && (view.id === null || current) && (
          <MemberReportForm key={view.id ?? "nouveau"} data={data} report={current} options={options} onSaved={saved} onCancel={() => go({ mode: "list" })} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      {!online && <Notice tone="warn" icon="fa-wifi">{t("Hors ligne : vous pouvez préparer un nouveau rapport, il sera gardé sur cet appareil et envoyé au retour de la connexion.")}</Notice>}
      {pendingNew && (
        <Notice tone="warn" icon="fa-clock-rotate-left">
          {t("Un rapport commencé sur cet appareil n'a pas encore été envoyé.")}{" "}
          <button type="button" onClick={() => go({ mode: "form", id: null })} className="font-bold text-ecideBlue underline">{t("Reprendre")}</button>
        </Notice>
      )}
      {error && error !== "offline" && <Notice tone="error">{error === "-" ? t("Vos rapports n'ont pas pu être chargés.") : error}</Notice>}
      {!reports && !error && <p className="text-sm text-gray-500"><i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>{t("Chargement…")}</p>}
      {reports && !reports.length && (
        <div className="member-box bg-white border border-gray-200 p-10 text-center text-gray-500">
          <i className="fa-regular fa-clipboard text-3xl text-gray-300 mb-3 block" aria-hidden="true"></i>
          {t("Vous n'avez encore envoyé aucun rapport. Après chaque événement que vous organisez, rendez-en compte ici.")}
        </div>
      )}
      {reports && reports.length > 0 && (
        <ul className="space-y-4">
          {reports.map((r) => (
            <li key={r.id}>
              <article className={`member-box bg-white border border-gray-200 p-5 sm:p-6 space-y-3 ${r.incidents ? "border-l-4 !border-l-red-600" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ecideBlue">{day(r.date)} · {r.heure_debut}{r.heure_fin ? ` – ${r.heure_fin}` : ""}</p>
                  <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 ${r.statut === "examine" ? "bg-ecideGreen-50 text-ecideGreen" : "bg-ecideYellow/20 text-gray-800"}`}>{r.statutLibelle}</span>
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-gray-900 leading-tight no-bar member-title break-words">{r.titre}</h2>
                  <p className="text-sm text-gray-600 flex gap-2"><i className="fa-solid fa-location-dot mt-0.5 text-gray-400" aria-hidden="true"></i><span>{r.typeLibelle} · {r.lieu_nom}, {r.lieu}</span></p>
                  <p className="text-sm text-gray-600 flex flex-wrap gap-x-5 gap-y-1">
                    {r.participants !== null && <span><i className="fa-solid fa-users mr-1.5 text-gray-400" aria-hidden="true"></i>{t(":n participants", { n: n(r.participants) })}</span>}
                    {r.fichiers.length > 0 && <span><i className="fa-solid fa-paperclip mr-1.5 text-gray-400" aria-hidden="true"></i>{t("Listes de présence : :n", { n: r.fichiers.length })}</span>}
                  </p>
                  {r.incidents && (
                    <p className="text-sm font-semibold text-red-700 flex gap-2">
                      <i className="fa-solid fa-triangle-exclamation mt-0.5" aria-hidden="true"></i>
                      <span>{[t("Incidents signalés"), r.blesses ? t("Blessés : :n", { n: r.blesses }) : "", r.deces ? t("Décès : :n", { n: r.deces }) : "", r.arrestations ? t("Personnes arrêtées : :n", { n: r.arrestations }) : ""].filter(Boolean).join(" · ")}</span>
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => go({ mode: "form", id: r.id })} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue py-2.5 -my-1">
                  <i className={`fa-regular ${r.modifiable ? "fa-pen-to-square" : "fa-eye"} mr-2`} aria-hidden="true"></i>{r.modifiable ? t("Modifier ou compléter") : t("Voir le rapport")}
                </button>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
