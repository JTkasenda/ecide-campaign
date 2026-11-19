"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import { memberApi } from "@/lib/member";
import { showToast } from "@/lib/toast";
import { useMember } from "./MemberContext";
import { MemberCardBox, Notice } from "./ui";

interface Meeting {
  id: number;
  titre: string;
  debut: string;
  lieu: string | null;
  statut: string;
  maReponse: "present" | "absent" | null;
}
interface Internal {
  id: number;
  titre: string;
  sousTitre: string | null;
  date: string;
  reference: string | null;
}
interface PublicNews {
  id?: string;
  slug: string;
  titre: string;
  resume?: string;
  date?: string;
  categorie?: string;
  categorieLibelle?: string;
}

/**
 * Accueil du membre validé : salutation, raccourcis (le QR code d'entrée en premier), prochaine
 * réunion avec réponse en un geste, état des cotisations avec paiement direct, annonces et
 * communiqués (internes et publics).
 */
export default function MemberHome() {
  const { t, locale } = useI18n();
  const { data } = useMember();
  const m = data.membre;
  const L = (p: string) => localePath(locale as Locale, p);
  const [meeting, setMeeting] = useState<Meeting | null | undefined>(undefined);
  const [dues, setDues] = useState<{ aJour: boolean; arrieres: number } | null>(null);
  const [news, setNews] = useState<{ internes: Internal[]; actualites: PublicNews[] } | null>(null);
  // « loading » tant que l'accueil n'est pas arrivé, « error » s'il n'a pas pu l'être (avec un bouton pour réessayer)
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const active = m.statut === "actif";

  useEffect(() => {
    if (!active) return;
    // Une seule requête pour la réunion, les cotisations et les annonces (au lieu de trois en file).
    // Une réponse arrivée après coup (chargement relancé) n'écrase pas une réponse déjà donnée.
    let live = true;
    memberApi<{ reunion: Meeting | null; cotisations: { aJour: boolean; arrieres: number } | null; internes: Internal[]; actualites: PublicNews[] }>("accueil", locale).then((r) => {
      if (!live) return;
      if (!r.ok) return setLoad("error");
      setMeeting(r.data.reunion ?? null);
      setDues(r.data.cotisations ?? null);
      setNews({ internes: r.data.internes || [], actualites: r.data.actualites || [] });
      setLoad("ready");
    });
    return () => {
      live = false;
    };
  }, [active, locale, attempt]);
  const retry = () => {
    setLoad("loading");
    setAttempt((n) => n + 1);
  };

  const tiles: [string, string, string][] = [
    ["fa-qrcode", t("QR code"), "/espace-membre/carte?qr=1"],
    ["fa-id-card", t("Ma carte"), "/espace-membre/carte"],
    ["fa-calendar-days", t("Agenda"), "/espace-membre/agenda"],
    ["fa-clipboard-list", t("Mes rapports"), "/espace-membre/rapports"],
    ["fa-wallet", t("Cotisations"), "/espace-membre/cotisations"],
    ["fa-address-book", t("Annuaire"), "/espace-membre/annuaire"],
    ["fa-book-open", t("Documents"), "/espace-membre/documents"],
    ["fa-newspaper", t("Actualités"), "/espace-membre/actualites"],
    ["fa-hand-holding-heart", t("Faire un don"), "/don"],
  ];
  const [answering, setAnswering] = useState(false);

  /** Réponse à la convocation depuis l'accueil (annulée si le serveur refuse). */
  async function answer(reponse: "present" | "absent") {
    if (!meeting || answering || meeting.maReponse === reponse) return;
    const before = meeting.maReponse;
    setMeeting({ ...meeting, maReponse: reponse });
    setAnswering(true);
    const r = await memberApi(`agenda/${meeting.id}`, locale, { json: { reponse } });
    setAnswering(false);
    if (r.ok) showToast(reponse === "present" ? t("Présence confirmée.") : t("Absence enregistrée."));
    else {
      setMeeting({ ...meeting, maReponse: before });
      showToast(r.message || t("Votre réponse n'a pas pu être enregistrée."), "error");
    }
  }
  const when = (iso: string) => {
    const s = new Date(iso).toLocaleString(locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const items = [
    ...(news?.internes || []).map((n) => ({ key: `i${n.id}`, href: L("/espace-membre/actualites") + `#communique-${n.id}`, kicker: t("Communication interne"), date: n.date, titre: n.titre, texte: n.sousTitre || "" })),
    ...(news?.actualites || []).map((n) => ({ key: `p${n.slug}`, href: L(`/actualites/${n.slug}`), kicker: n.categorieLibelle || t("Actualité"), date: n.date || "", titre: n.titre, texte: n.resume || "" })),
  ].slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="member-hero relative overflow-hidden bg-ecideDarkBlue text-white p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <img src="/assets/img/logo-160.png" alt="" width={72} height={72} className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full shrink-0 ring-2 ring-white/30" />
          <div className="min-w-0">
            <p className="text-blue-100 text-sm">{t("Bonjour")}</p>
            <h1 className="text-4xl sm:text-5xl leading-tight no-bar break-words">{m.prenom || m.nomComplet}</h1>
            <p className="text-ecideYellow text-sm font-semibold">{m.categorieLibelle || t("Membre")}</p>
          </div>
        </div>
        <nav className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 mt-8" aria-label={t("Raccourcis de l'espace membre")}>
          {tiles.map(([icon, label, href]) => (
            <Link key={href} href={L(href)} className="flex flex-col items-center gap-2 py-4 px-1 bg-white/10 hover:bg-white/20 border border-white/10 text-center text-[11px] sm:text-xs font-semibold leading-tight transition min-w-0 break-words">
              <i className={`fa-solid ${icon} text-lg text-ecideYellow`} aria-hidden="true"></i>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {m.statut === "suspendu" && (
        <Notice tone="error"><strong>{t("Votre adhésion est suspendue.")}</strong> {m.motif ? `${t("Motif")} : ${m.motif}` : ""}</Notice>
      )}

      {active && meeting && (
        <MemberCardBox className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="w-12 h-12 shrink-0 bg-ecideYellow/20 text-ecideYellow-700 flex items-center justify-center"><i className="fa-solid fa-calendar-day text-xl" aria-hidden="true"></i></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">{t("Prochaine réunion")}</p>
              <p className="font-bold text-gray-900 text-lg leading-tight break-words">{meeting.titre}</p>
              <p className="text-sm text-gray-500">{when(meeting.debut)}{meeting.lieu ? ` · ${meeting.lieu}` : ""}</p>
            </div>
            <Link href={L("/espace-membre/agenda")} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue whitespace-nowrap py-2.5">
              {t("Détails")} <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>
            </Link>
          </div>
          {meeting.statut !== "annulee" && (
            <div className="grid grid-cols-2 gap-3" role="group" aria-label={t("Votre réponse")}>
              <button type="button" onClick={() => answer("present")} aria-pressed={meeting.maReponse === "present"} disabled={answering} className={`py-2.5 px-3 font-bold border-2 transition ${meeting.maReponse === "present" ? "bg-ecideDarkBlue border-ecideDarkBlue text-white" : "bg-white border-gray-200 text-gray-700 hover:border-ecideDarkBlue"}`}>
                <i className="fa-solid fa-check mr-2" aria-hidden="true"></i>{meeting.maReponse === "present" ? t("Présence confirmée") : t("Présent")}
              </button>
              <button type="button" onClick={() => answer("absent")} aria-pressed={meeting.maReponse === "absent"} disabled={answering} className={`py-2.5 px-3 font-bold border-2 transition ${meeting.maReponse === "absent" ? "bg-red-50 border-red-600 text-red-700" : "bg-white border-gray-200 text-gray-700 hover:border-red-600"}`}>
                <i className="fa-solid fa-xmark mr-2" aria-hidden="true"></i>{t("Absent")}
              </button>
            </div>
          )}
        </MemberCardBox>
      )}

      {active && dues && (
        <MemberCardBox className="flex flex-wrap items-center gap-4">
          <span className={`w-12 h-12 shrink-0 flex items-center justify-center ${dues.aJour ? "bg-ecideGreen-50 text-ecideGreen" : "bg-ecideYellow/20 text-ecideYellow-700"}`}><i className="fa-solid fa-wallet text-xl" aria-hidden="true"></i></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">{t("Cotisations")}</p>
            <p className="font-bold text-gray-900">{dues.aJour ? t("Vous êtes à jour de vos cotisations.") : t(":n mois à régler", { n: dues.arrieres })}</p>
          </div>
          {dues.aJour ? (
            <Link href={L("/espace-membre/cotisations")} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue whitespace-nowrap py-2.5">
              {t("Voir")} <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>
            </Link>
          ) : (
            // Ouvre directement le paiement du mois à régler
            <Link href={L("/espace-membre/cotisations?payer=1")} className="btn btn--yellow btn--sm min-h-10 whitespace-nowrap">
              {t("Payer ma cotisation")}
            </Link>
          )}
        </MemberCardBox>
      )}

      {active && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-2xl text-ecideDarkBlue no-bar member-title">{t("Annonces et communiqués")}</h2>
            <Link href={L("/espace-membre/actualites")} className="text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue py-2.5">{t("Tout voir")}</Link>
          </div>
          {load === "error" ? (
            <p className="text-sm text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1" role="alert">
              <span><i className="fa-solid fa-triangle-exclamation text-ecideYellow-700 mr-2" aria-hidden="true"></i>{t("L'accueil n'a pas pu être chargé.")}</span>
              <button type="button" onClick={retry} className="font-bold text-ecideBlue hover:text-ecideDarkBlue py-2.5">{t("Réessayer")}</button>
            </p>
          ) : news === null ? (
            <p className="text-sm text-gray-500"><i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>{t("Chargement…")}</p>
          ) : items.length ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {items.map((n) => (
                <Link key={n.key} href={n.href} className="member-box flex gap-3 bg-white border border-gray-200 p-4 hover:border-ecideBlue transition">
                  <span className="w-9 h-9 shrink-0 bg-ecideBlue-50 text-ecideBlue flex items-center justify-center"><i className="fa-solid fa-bullhorn text-sm" aria-hidden="true"></i></span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold text-ecideBlue">{n.kicker}{n.date ? ` · ${new Date(n.date).toLocaleDateString(locale)}` : ""}</span>
                    <span className="block font-bold text-gray-900 leading-snug">{n.titre}</span>
                    {n.texte && <span className="block text-xs text-gray-500 line-clamp-2 mt-0.5">{n.texte}</span>}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t("Aucune annonce pour le moment.")}</p>
          )}
        </section>
      )}
    </div>
  );
}
