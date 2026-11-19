"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { memberApi } from "@/lib/member";
import { showToast } from "@/lib/toast";
import { MemberPageHeader, Notice } from "./ui";

type Answer = "present" | "absent";

interface Meeting {
  id: number;
  titre: string;
  /** Heure locale du lieu, sans fuseau (« 2026-11-18T15:00:00 ») */
  debut: string;
  lieu: string | null;
  ordre: string[];
  portee: string;
  statut: "prevue" | "annulee";
  maReponse: Answer | null;
}

interface Agenda {
  avenir: Meeting[];
  passees: Meeting[];
}

/** Échappement d'un texte iCalendar. */
const ics = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Date iCalendar « flottante » (heure locale du lieu) : 20261118T150000. */
const icsDate = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
};

/** Fichier .ics de la réunion (durée de deux heures par défaut), créé dans le navigateur. */
function downloadIcs(m: Meeting, agendaLabel: string) {
  const start = new Date(m.debut);
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  const description = m.ordre.length ? `${agendaLabel} :\n${m.ordre.map((p) => `- ${p}`).join("\n")}` : "";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ECiDé//Espace membre//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:reunion-${m.id}@ecide-rdc.org`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${ics(m.titre)}`,
    ...(m.lieu ? [`LOCATION:${ics(m.lieu)}`] : []),
    ...(description ? [`DESCRIPTION:${ics(description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
  a.download = `reunion-ecide-${m.id}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/**
 * Agenda du membre : réunions auxquelles il est convoqué (tout le parti, sa province ou son pays),
 * confirmation de présence en un geste (mise à jour immédiate, annulée si le serveur refuse),
 * ajout à son agenda (.ics) et réunions passées repliées.
 */
export default function MemberAgenda() {
  const { t, locale } = useI18n();
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    // Une réponse arrivée après coup (chargement relancé) n'écrase pas une réponse déjà donnée
    let current = true;
    memberApi<Agenda>("agenda", locale).then((r) => {
      if (!current) return;
      if (r.ok) setAgenda({ avenir: r.data.avenir || [], passees: r.data.passees || [] });
      else setError(r.message || "-");
    });
    return () => {
      current = false;
    };
  }, [locale]);

  // « Mercredi 11 novembre · 15:26 » (heure locale de la réunion)
  const when = (iso: string, year = false) => {
    const d = new Date(iso);
    const day = d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}) });
    return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
  };

  const setAnswer = (id: number, maReponse: Answer | null) =>
    setAgenda((a) => (a ? { ...a, avenir: a.avenir.map((m) => (m.id === id ? { ...m, maReponse } : m)) } : a));

  async function answer(m: Meeting, reponse: Answer) {
    if (busy || m.maReponse === reponse) return;
    const before = m.maReponse;
    setAnswer(m.id, reponse);
    setBusy(m.id);
    const r = await memberApi<{ reunion: Meeting }>(`agenda/${m.id}`, locale, { json: { reponse } });
    setBusy(null);
    if (r.ok) {
      showToast(reponse === "present" ? t("Présence confirmée.") : t("Absence enregistrée."));
    } else {
      setAnswer(m.id, before);
      showToast(r.message || t("Votre réponse n'a pas pu être enregistrée."), "error");
    }
  }

  const card = (m: Meeting, past = false) => {
    const cancelled = m.statut === "annulee";
    return (
      <article key={m.id} className={`member-box bg-white border border-gray-200 p-5 sm:p-6 space-y-4 ${cancelled || past ? "opacity-70" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-semibold text-ecideBlue">{when(m.debut, past)}</p>
          {cancelled && <span className="m-pill m-pill--bad">{t("Annulée")}</span>}
        </div>
        <div className="space-y-1.5">
          <h2 className={`text-xl sm:text-2xl font-bold text-gray-900 leading-tight no-bar member-title ${cancelled ? "line-through" : ""}`}>{m.titre}</h2>
          {m.lieu && (
            <p className="text-sm text-gray-600 flex gap-2"><i className="fa-solid fa-location-dot mt-0.5 text-gray-400" aria-hidden="true"></i><span>{m.lieu}</span></p>
          )}
          <p className="text-xs text-gray-500 flex gap-2"><i className="fa-solid fa-users mt-0.5 text-gray-400" aria-hidden="true"></i><span>{t("Convoqués")} : {m.portee}</span></p>
        </div>
        {m.ordre.length > 0 && (
          <div>
            <p className="text-sm font-bold text-gray-700">{t("Ordre du jour")}</p>
            <ul className="list-disc pl-5 mt-1 text-sm text-gray-600 space-y-0.5">
              {m.ordre.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}
        {!past && !cancelled && (
          <>
            <div className="grid grid-cols-2 gap-3" role="group" aria-label={t("Votre réponse")}>
              <button
                type="button"
                onClick={() => answer(m, "present")}
                aria-pressed={m.maReponse === "present"}
                disabled={busy === m.id}
                className={`py-3 px-3 font-bold border-2 transition ${m.maReponse === "present" ? "bg-ecideDarkBlue border-ecideDarkBlue text-white" : "bg-white border-gray-200 text-gray-700 hover:border-ecideDarkBlue"}`}
              >
                <i className="fa-solid fa-check mr-2" aria-hidden="true"></i>{t("Présent")}
              </button>
              <button
                type="button"
                onClick={() => answer(m, "absent")}
                aria-pressed={m.maReponse === "absent"}
                disabled={busy === m.id}
                className={`py-3 px-3 font-bold border-2 transition ${m.maReponse === "absent" ? "bg-red-50 border-red-600 text-red-700" : "bg-white border-gray-200 text-gray-700 hover:border-red-600"}`}
              >
                <i className="fa-solid fa-xmark mr-2" aria-hidden="true"></i>{t("Absent")}
              </button>
            </div>
            <button type="button" onClick={() => downloadIcs(m, t("Ordre du jour"))} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue py-2.5 -my-1">
              <i className="fa-regular fa-calendar-plus mr-2" aria-hidden="true"></i>{t("Ajouter à mon agenda")}
            </button>
          </>
        )}
        {past && !cancelled && (
          <p className="text-sm text-gray-500">{m.maReponse === "present" ? t("Vous aviez confirmé votre présence.") : m.maReponse === "absent" ? t("Vous aviez signalé votre absence.") : t("Vous n'aviez pas répondu.")}</p>
        )}
      </article>
    );
  };

  return (
    <div className="space-y-6">
      <MemberPageHeader title={t("Agenda")} subtitle={t("Vos convocations. Confirmez votre présence en un geste.")} />
      {error && <Notice tone="error">{error === "-" ? t("L'agenda n'a pas pu être chargé.") : error}</Notice>}
      {!agenda && !error && (
        <p className="text-sm text-gray-500"><i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>{t("Chargement…")}</p>
      )}
      {agenda && (
        <>
          {agenda.avenir.length ? (
            <div className="space-y-4">{agenda.avenir.map((m) => card(m))}</div>
          ) : (
            <div className="member-box bg-white border border-gray-200 p-10 text-center text-gray-500">
              <i className="fa-regular fa-calendar text-3xl text-gray-300 mb-3 block" aria-hidden="true"></i>
              {t("Aucune convocation pour le moment.")}
            </div>
          )}
          {agenda.passees.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none flex items-center gap-2 text-lg font-bold text-ecideDarkBlue member-title">
                <i className="fa-solid fa-chevron-right text-sm transition group-open:rotate-90" aria-hidden="true"></i>
                {t("Réunions passées")} <span className="text-sm font-normal text-gray-500">({agenda.passees.length})</span>
              </summary>
              <div className="space-y-4 mt-4">{agenda.passees.map((m) => card(m, true))}</div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
