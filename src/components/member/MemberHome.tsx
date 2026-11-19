"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import { memberApi } from "@/lib/member";
import { showToast } from "@/lib/toast";
import { useMember } from "./MemberContext";
import { MemberCardBox, Notice, cardStatus } from "./ui";

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
 * Accueil du membre validé, tableau de bord : salutation, actions rapides (nouveau rapport, carte,
 * cotisation), état de la carte, prochaine réunion avec réponse en un geste, état des cotisations
 * avec paiement direct, annonces et communiqués (internes et publics), autres raccourcis.
 * Une seule requête (« accueil ») pour la réunion, les cotisations et les annonces.
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

  const status = cardStatus(m, t);
  const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : "—");
  const loading = (
    <div className="m-state !py-6" aria-live="polite">
      <i className="fa-solid fa-spinner fa-spin !text-base" aria-hidden="true"></i>
      <p>{t("Chargement…")}</p>
    </div>
  );
  const failed = (
    <div className="m-state m-state--error !py-6" role="alert">
      <i className="fa-solid fa-triangle-exclamation !text-base" aria-hidden="true"></i>
      <p>{t("L'accueil n'a pas pu être chargé.")}</p>
      <button type="button" onClick={retry} className="btn btn--outline btn--sm">{t("Réessayer")}</button>
    </div>
  );
  const others: [string, string, string][] = [
    ["fa-qrcode", t("QR code"), "/espace-membre/carte?qr=1"],
    ["fa-calendar-days", t("Agenda"), "/espace-membre/agenda"],
    ["fa-address-book", t("Annuaire"), "/espace-membre/annuaire"],
    ["fa-book-open", t("Documents"), "/espace-membre/documents"],
    ["fa-newspaper", t("Actualités"), "/espace-membre/actualites"],
    ["fa-hand-holding-heart", t("Faire un don"), "/don"],
  ];

  return (
    <div className="space-y-5">
      <div className="m-page-head">
        <div className="m-page-head__text">
          <h1 className="break-words">{t("Bonjour")} {m.prenom || m.nomComplet}</h1>
          <p className="m-page-head__sub">{[m.categorieLibelle || t("Membre"), m.section].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      {m.statut === "suspendu" && (
        <Notice tone="error"><strong>{t("Votre adhésion est suspendue.")}</strong> {m.motif ? `${t("Motif")} : ${m.motif}` : ""}</Notice>
      )}

      <nav aria-label={t("Actions rapides")}>
        <ul className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {active && (
            <li>
              <Link href={L("/espace-membre/rapports?nouveau=1")} className="btn btn--primary m-quick">
                <i className="fa-solid fa-plus" aria-hidden="true"></i>{t("Nouveau rapport")}
              </Link>
            </li>
          )}
          <li>
            <Link href={L("/espace-membre/carte")} className="btn btn--outline m-quick">
              <i className="fa-solid fa-id-card text-[var(--m-primary-text)]" aria-hidden="true"></i>{t("Voir ma carte")}
            </Link>
          </li>
          {active && (
            <li>
              <Link href={L(dues && !dues.aJour ? "/espace-membre/cotisations?payer=1" : "/espace-membre/cotisations")} className="btn btn--outline m-quick">
                <i className="fa-solid fa-wallet text-[var(--m-primary-text)]" aria-hidden="true"></i>{t("Payer ma cotisation")}
              </Link>
            </li>
          )}
        </ul>
      </nav>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Carte de membre */}
        <MemberCardBox className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className={`m-icon ${status.tone === "ok" ? "m-icon--ok" : status.tone === "bad" ? "m-icon--bad" : "m-icon--warn"}`}><i className="fa-solid fa-id-card" aria-hidden="true"></i></span>
            <div className="min-w-0 flex-1">
              <h2 className="m-tile-title">{t("Ma carte")}</h2>
              <span className={`m-pill m-pill--${status.tone}`}>{status.label}</span>
            </div>
          </div>
          {m.carte ? (
            <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="m-muted">{t("N° de carte")}</dt>
              <dd className="font-mono font-semibold text-right break-all">{m.carte.numero}</dd>
              <dt className="m-muted">{t("Valable jusqu'au")}</dt>
              <dd className="font-semibold text-right">{date(m.carte.expireLe)}</dd>
            </dl>
          ) : (
            <p className="text-sm m-muted">{m.statutLibelle}</p>
          )}
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <Link href={L("/espace-membre/carte?qr=1")} className="btn btn--outline btn--sm flex-1"><i className="fa-solid fa-qrcode" aria-hidden="true"></i>{t("QR code")}</Link>
            <Link href={L("/espace-membre/carte")} className="btn btn--outline btn--sm flex-1">{t("Voir ma carte")}</Link>
          </div>
        </MemberCardBox>

        {/* Prochaine réunion */}
        {active && (
          <MemberCardBox className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="m-icon"><i className="fa-solid fa-calendar-day" aria-hidden="true"></i></span>
              <h2 className="m-tile-title flex-1">{t("Prochaine réunion")}</h2>
              <Link href={L("/espace-membre/agenda")} className="m-link text-sm whitespace-nowrap py-1">
                {t("Détails")} <i className="fa-solid fa-chevron-right text-[10px]" aria-hidden="true"></i>
              </Link>
            </div>
            {load === "error" ? failed : meeting === undefined ? loading : meeting ? (
              <>
                <div className="min-w-0">
                  <p className="font-semibold leading-snug break-words">{meeting.titre}</p>
                  <p className="text-sm m-muted mt-0.5">{when(meeting.debut)}{meeting.lieu ? ` · ${meeting.lieu}` : ""}</p>
                </div>
                {meeting.statut !== "annulee" && (
                  <div className="mt-auto grid grid-cols-2 gap-2" role="group" aria-label={t("Votre réponse")}>
                    <button type="button" onClick={() => answer("present")} aria-pressed={meeting.maReponse === "present"} disabled={answering} className={`btn btn--sm ${meeting.maReponse === "present" ? "btn--green" : "btn--outline"}`}>
                      <i className="fa-solid fa-check" aria-hidden="true"></i>{meeting.maReponse === "present" ? t("Présence confirmée") : t("Présent")}
                    </button>
                    <button type="button" onClick={() => answer("absent")} aria-pressed={meeting.maReponse === "absent"} disabled={answering} className={`btn btn--sm btn--outline ${meeting.maReponse === "absent" ? "m-btn-absent" : ""}`}>
                      <i className="fa-solid fa-xmark" aria-hidden="true"></i>{t("Absent")}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm m-muted">{t("Aucune réunion prévue.")}</p>
            )}
          </MemberCardBox>
        )}

        {/* Cotisations */}
        {active && (
          <MemberCardBox className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className={`m-icon ${dues ? (dues.aJour ? "m-icon--ok" : "m-icon--warn") : ""}`}><i className="fa-solid fa-wallet" aria-hidden="true"></i></span>
              <div className="min-w-0 flex-1">
                <h2 className="m-tile-title">{t("Cotisations")}</h2>
                {dues && <span className={`m-pill ${dues.aJour ? "m-pill--ok" : "m-pill--warn"}`}>{dues.aJour ? t("À jour") : t(":n mois à régler", { n: dues.arrieres })}</span>}
              </div>
            </div>
            {load === "error" ? failed : load === "loading" ? loading : dues ? (
              <>
                <p className="text-sm">{dues.aJour ? t("Vous êtes à jour de vos cotisations.") : t(":n mois à régler", { n: dues.arrieres })}</p>
                <div className="mt-auto">
                  {dues.aJour ? (
                    <Link href={L("/espace-membre/cotisations")} className="btn btn--outline btn--sm w-full">{t("Voir")}</Link>
                  ) : (
                    // Ouvre directement le paiement du mois à régler
                    <Link href={L("/espace-membre/cotisations?payer=1")} className="btn btn--primary btn--sm w-full">{t("Payer ma cotisation")}</Link>
                  )}
                </div>
              </>
            ) : (
              <Link href={L("/espace-membre/cotisations")} className="btn btn--outline btn--sm w-full mt-auto">{t("Voir")}</Link>
            )}
          </MemberCardBox>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {active && (
          <section className="member-box m-card lg:col-span-2 overflow-hidden" aria-labelledby="home-news">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[var(--m-border)]">
              <h2 id="home-news">{t("Annonces et communiqués")}</h2>
              <Link href={L("/espace-membre/actualites")} className="m-link text-sm py-1">{t("Tout voir")}</Link>
            </div>
            {load === "error" ? failed : news === null ? loading : items.length ? (
              <ul className="divide-y divide-[var(--m-border)]">
                {items.map((n) => (
                  <li key={n.key}>
                    <Link href={n.href} className="flex gap-3 px-4 sm:px-5 py-3 hover:bg-[var(--m-surface-2)] transition-colors">
                      <span className="m-icon !w-8 !h-8"><i className="fa-solid fa-bullhorn text-xs" aria-hidden="true"></i></span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold leading-snug">{n.titre}</span>
                        {n.texte && <span className="block text-sm m-muted line-clamp-1 mt-0.5">{n.texte}</span>}
                        <span className="block text-xs m-muted mt-1">{n.kicker}{n.date ? ` · ${new Date(n.date).toLocaleDateString(locale)}` : ""}</span>
                      </span>
                      <i className="fa-solid fa-chevron-right text-xs m-muted self-center" aria-hidden="true"></i>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="m-state">
                <i className="fa-regular fa-newspaper" aria-hidden="true"></i>
                <p>{t("Aucune annonce pour le moment.")}</p>
              </div>
            )}
          </section>
        )}

        <section className={`member-box m-card overflow-hidden ${active ? "" : "lg:col-span-3"}`} aria-labelledby="home-more">
          <h2 id="home-more" className="px-4 sm:px-5 py-3 border-b border-[var(--m-border)]">{t("Raccourcis de l'espace membre")}</h2>
          <ul className="grid grid-cols-3 lg:grid-cols-2 gap-px bg-[var(--m-border)]">
            {others.map(([icon, label, href]) => (
              <li key={href} className="bg-[var(--m-surface)]">
                <Link href={L(href)} className="flex flex-col items-center justify-center gap-1.5 min-h-[4.5rem] px-2 py-3 text-center text-[13px] font-semibold leading-tight hover:bg-[var(--m-surface-2)] transition-colors">
                  <i className={`fa-solid ${icon} text-base text-[var(--m-primary-text)]`} aria-hidden="true"></i>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
