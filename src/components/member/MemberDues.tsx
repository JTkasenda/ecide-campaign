"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import { amountLabel, memberApi, type MemberPayment } from "@/lib/member";
import { useMember } from "./MemberContext";
import { Field, INPUT, MemberCardBox, MemberPageHeader, Notice, useDialog } from "./ui";

type Etat = "a_payer" | "paye" | "en_attente";
interface Mois {
  periode: string;
  libelle: string;
  statut: Etat;
  paiement: MemberPayment | null;
}
interface Speciale {
  id: number;
  titre: string;
  description: string;
  usd: number;
  cdf: number;
  echeance: string | null;
  statut: Etat;
  paiement: MemberPayment | null;
}
interface Dues {
  reglages: { actif: boolean; usd: number; cdf: number; texte: string };
  mois: Mois[];
  aJour: boolean;
  arrieres: number;
  speciales: Speciale[];
  historique: (MemberPayment & { objet?: string; periode?: string | null })[];
}
/** Ce que le membre s'apprête à payer : un mois ou une cotisation spéciale. */
interface Item {
  type: "mensuelle" | "speciale";
  key: string;
  libelle: string;
  usd: number;
  cdf: number;
}

const PILL: Record<string, string> = {
  paye: "bg-ecideGreen-50 text-ecideGreen",
  reussi: "bg-ecideGreen-50 text-ecideGreen",
  en_attente: "bg-ecideYellow/20 text-ecideDarkBlue",
  a_payer: "bg-red-50 text-red-700",
  echoue: "bg-red-50 text-red-700",
  annule: "bg-gray-100 text-gray-500",
};

/**
 * Cotisations du membre : état (à jour ou mois à régler), mois depuis la validation de l'adhésion,
 * cotisations spéciales ouvertes par la Trésorerie, paiement par Mobile Money ou carte (simulé en
 * démonstration) et historique des paiements.
 */
export default function MemberDues() {
  const { t, locale } = useI18n();
  const { data } = useMember();
  const [dues, setDues] = useState<Dues | null>(null);
  const [error, setError] = useState("");
  const [item, setItem] = useState<Item | null>(null);

  const load = useCallback(async () => {
    const r = await memberApi<Dues>("cotisations", locale);
    if (r.ok) {
      setDues(r.data);
      setError("");
    } else setError(r.message || t("Les cotisations sont momentanément indisponibles."));
  }, [locale, t]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  // « Payer ma cotisation » depuis l'accueil (?payer) : le premier mois à régler de la liste s'ouvre d'emblée
  const auto = useRef(true);
  useEffect(() => {
    if (!dues || !auto.current) return;
    auto.current = false;
    if (!new URLSearchParams(window.location.search).has("payer")) return;
    const due = dues.reglages.actif ? dues.mois.find((m) => m.statut === "a_payer") : undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (due) setItem({ type: "mensuelle", key: due.periode, libelle: due.libelle, usd: dues.reglages.usd, cdf: dues.reglages.cdf });
  }, [dues]);

  // Dernier paiement réussi : son moyen et sa devise sont proposés d'office (paiement en un geste)
  const lastPaid = dues?.historique.find((p) => p.statut === "reussi");
  const statusLabel = (s: Etat) => ({ paye: t("Payée"), en_attente: t("En attente"), a_payer: t("À régler") })[s];
  const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)) : "");
  const both = (usd: number, cdf: number) => [usd > 0 ? amountLabel(usd, "USD", locale) : "", cdf > 0 ? amountLabel(cdf, "CDF", locale) : ""].filter(Boolean).join(" · ");
  const pill = (cls: string, label: string) => <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${PILL[cls] || PILL.annule}`}>{label}</span>;

  return (
    <div className="space-y-5">
      <MemberPageHeader title={t("Cotisations")} subtitle={t("Votre cotisation mensuelle et les cotisations spéciales du parti.")} />
      {error && <Notice tone="error">{error}</Notice>}
      {!dues && !error && <p className="text-center text-gray-500 py-10"><i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>{t("Chargement…")}</p>}
      {dues && (
        <>
          {dues.reglages.actif && (
            <MemberCardBox className={`border-l-4 ${dues.aJour ? "border-l-ecideGreen" : "border-l-ecideYellow"}`}>
              <div className="flex items-center gap-4">
                <span className={`w-12 h-12 rounded-full shrink-0 inline-flex items-center justify-center text-xl ${dues.aJour ? "bg-ecideGreen-50 text-ecideGreen" : "bg-ecideYellow/20 text-ecideDarkBlue"}`}>
                  <i className={`fa-solid ${dues.aJour ? "fa-circle-check" : "fa-hourglass-half"}`} aria-hidden="true"></i>
                </span>
                <div className="min-w-0">
                  <p className="font-display text-2xl leading-tight text-ecideDarkBlue">{dues.aJour ? t("À jour") : dues.arrieres > 1 ? t(":n mois à régler", { n: dues.arrieres }) : t("1 mois à régler")}</p>
                  <p className="text-sm text-gray-600">{t("Cotisation mensuelle :")} <strong>{both(dues.reglages.usd, dues.reglages.cdf)}</strong></p>
                </div>
              </div>
              {dues.reglages.texte && <p className="text-sm text-gray-600 mt-4 leading-relaxed">{dues.reglages.texte}</p>}
            </MemberCardBox>
          )}

          {dues.reglages.actif && (
            <MemberCardBox>
              <h2 className="text-xl text-ecideDarkBlue mb-3">{t("Cotisation mensuelle")}</h2>
              <ul className="divide-y divide-gray-100">
                {dues.mois.map((m) => (
                  <li key={m.periode} className="py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900">{m.libelle}</p>
                      <p className="text-xs text-gray-500">{m.paiement ? m.paiement.montantLibelle : amountLabel(dues.reglages.usd, "USD", locale)}</p>
                    </div>
                    {pill(m.statut, statusLabel(m.statut))}
                    {m.statut !== "paye" && (
                      <button type="button" onClick={() => setItem({ type: "mensuelle", key: m.periode, libelle: m.libelle, usd: dues.reglages.usd, cdf: dues.reglages.cdf })} className="btn btn--yellow !py-2 !px-4 text-sm shrink-0 min-h-10">
                        {t("Payer")}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </MemberCardBox>
          )}

          {dues.speciales.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl text-ecideDarkBlue">{t("Cotisations spéciales")}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {dues.speciales.map((s) => (
                  <MemberCardBox key={s.id} className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-ecideBlue">{both(s.usd, s.cdf)}</p>
                      {pill(s.statut, statusLabel(s.statut))}
                    </div>
                    <h3 className="text-lg font-bold text-ecideDarkBlue leading-snug">{s.titre}</h3>
                    {s.description && <p className="text-sm text-gray-600 leading-relaxed">{s.description}</p>}
                    {s.echeance && <p className="text-xs text-gray-500"><i className="fa-regular fa-calendar mr-1.5" aria-hidden="true"></i>{t("Échéance : :date", { date: date(s.echeance) })}</p>}
                    {s.statut !== "paye" && (
                      <button type="button" onClick={() => setItem({ type: "speciale", key: String(s.id), libelle: s.titre, usd: s.usd, cdf: s.cdf })} className="btn btn--yellow w-full mt-auto">
                        {t("Payer")}
                      </button>
                    )}
                  </MemberCardBox>
                ))}
              </div>
            </section>
          )}

          {!dues.reglages.actif && dues.speciales.length === 0 && <Notice tone="info">{t("Aucune cotisation n'est ouverte pour le moment.")}</Notice>}

          <MemberCardBox>
            <h2 className="text-xl text-ecideDarkBlue mb-3">{t("Historique des paiements")}</h2>
            {dues.historique.length === 0 ? (
              <p className="text-sm text-gray-500">{t("Aucun paiement pour le moment.")}</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                <li className="hidden sm:grid grid-cols-[7rem_1fr_8rem_6rem_6rem] gap-3 pb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <span>{t("Date")}</span><span>{t("Objet")}</span><span>{t("Moyen")}</span><span className="text-right">{t("Montant")}</span><span className="text-right">{t("Statut")}</span>
                </li>
                {dues.historique.map((p) => (
                  <li key={p.id} className="py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[7rem_1fr_8rem_6rem_6rem] gap-x-3 gap-y-1 items-center text-sm">
                    <span className="text-gray-500 order-3 sm:order-none text-xs sm:text-sm">{date(p.payeLe || p.date)}</span>
                    <span className="font-semibold text-gray-900 min-w-0 break-words">{p.libelle}<span className="block text-xs text-gray-400 font-mono font-normal">{p.reference}</span></span>
                    <span className="hidden sm:block text-gray-600">{p.moyenLibelle}</span>
                    <span className="font-bold text-gray-900 text-right">{p.montantLibelle}</span>
                    <span className="text-right order-4 sm:order-none">{pill(p.statut, p.statut === "reussi" ? t("Payée") : p.statut === "en_attente" ? t("En attente") : p.statut === "echoue" ? t("Échec") : t("Annulé"))}</span>
                  </li>
                ))}
              </ul>
            )}
          </MemberCardBox>
        </>
      )}
      {item && <PayDialog item={item} demo={data.options.demo} moyens={data.options.moyens} telephone={data.membre.telephone || ""} last={lastPaid} onClose={() => setItem(null)} onDone={load} />}
    </div>
  );
}

/**
 * Fenêtre de paiement : devise, moyen, numéro Mobile Money ; simulation en démonstration. Le moyen,
 * la devise et le numéro du dernier paiement réussi sont repris : il ne reste qu'à valider.
 */
function PayDialog({ item, demo, moyens, telephone, last, onClose, onDone }: { item: Item; demo: boolean; moyens: { key: string; libelle: string; mobile: boolean }[]; telephone: string; last?: MemberPayment; onClose: () => void; onDone: () => Promise<void> }) {
  const { t, locale } = useI18n();
  const lastDevise = last && (last.devise === "USD" ? item.usd : item.cdf) > 0 ? last.devise : null;
  const [devise, setDevise] = useState<"USD" | "CDF">(lastDevise || (item.usd > 0 ? "USD" : "CDF"));
  const [moyen, setMoyen] = useState(last && moyens.some((x) => x.key === last.moyen) ? last.moyen : moyens[0]?.key || "");
  const [tel, setTel] = useState(telephone);
  const [busy, setBusy] = useState(false);
  const [instructions, setInstructions] = useState<{ ref: string; lines: string[] } | null>(null);
  const mobile = moyens.find((x) => x.key === moyen)?.mobile;
  const montant = amountLabel(devise === "USD" ? item.usd : item.cdf, devise, locale);
  const devises = ([["USD", t("Dollars"), item.usd], ["CDF", t("Francs congolais"), item.cdf]] as const).filter(([, , n]) => n > 0);

  const ref = useDialog<HTMLFormElement>(onClose, busy);

  async function pay(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const body = item.type === "mensuelle" ? { type: "mensuelle", periode: item.key } : { type: "speciale", contribution_id: Number(item.key) };
    const r = await memberApi<{ paiement: MemberPayment; instructions: string[] }>("cotisations", locale, { json: { ...body, moyen, devise, telephone: mobile ? tel : null } });
    if (!r.ok) {
      setBusy(false);
      return showToast(r.message || t("Paiement impossible. Réessayez."), "error");
    }
    if (demo) {
      // Démonstration : le paiement simulé aboutit aussitôt
      await new Promise((res) => setTimeout(res, 900));
      const s = await memberApi(`paiement/${r.data.paiement.reference}/simuler`, locale, { json: {} });
      setBusy(false);
      if (!s.ok) return showToast(s.message || t("Paiement impossible. Réessayez."), "error");
      showToast(t("Paiement reçu. Merci pour votre cotisation."));
      await onDone();
      return onClose();
    }
    setBusy(false);
    setInstructions({ ref: r.data.paiement.reference, lines: r.data.instructions || [] });
    await onDone();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !busy && onClose()}>
      <form ref={ref} onSubmit={pay} noValidate role="dialog" aria-modal="true" aria-labelledby="dues_title" className="member-box bg-white w-full sm:max-w-md max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <p id="dues_title" className="font-bold text-ecideDarkBlue text-lg">{t("Payer ma cotisation")}</p>
            <p className="text-sm text-gray-500 truncate">{item.libelle} · {montant}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="w-11 h-11 -mr-2 shrink-0 inline-flex items-center justify-center text-gray-500 hover:text-ecideDarkBlue" aria-label={t("Fermer")}><i className="fa-solid fa-xmark text-xl" aria-hidden="true"></i></button>
        </div>
        {instructions ? (
          <div className="p-5 space-y-4">
            <Notice tone="info">
              <p className="font-bold mb-1">{t("Paiement en attente")} · {montant} · <span className="font-mono">{instructions.ref}</span></p>
              {instructions.lines.length > 0 && <ul className="list-disc pl-5 space-y-1">{instructions.lines.map((i) => <li key={i}>{i}</li>)}</ul>}
            </Notice>
            <button type="button" data-autofocus onClick={onClose} className="btn btn--primary w-full">{t("Fermer")}</button>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {devises.length > 1 && (
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("Devise")}>
                {devises.map(([k, l]) => (
                  <button key={k} type="button" role="radio" aria-checked={devise === k} onClick={() => setDevise(k)} className={`p-3 border font-semibold text-sm ${devise === k ? "bg-ecideDarkBlue text-white border-ecideDarkBlue" : "bg-white border-gray-200 text-gray-700"}`}>{l}</button>
                ))}
              </div>
            )}
            <div>
              <p className="font-bold text-gray-700 mb-2 text-sm">{t("Moyen de paiement")}</p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("Moyen de paiement")}>
                {moyens.map((x) => (
                  <button key={x.key} type="button" role="radio" aria-checked={moyen === x.key} onClick={() => setMoyen(x.key)} className={`p-3 border font-semibold text-sm ${moyen === x.key ? "bg-ecideDarkBlue text-white border-ecideDarkBlue" : "bg-white border-gray-200 text-gray-700 hover:border-ecideBlue"}`}>{x.key === "carte" ? t("Carte bancaire") : x.libelle}</button>
                ))}
              </div>
            </div>
            {mobile && (
              <Field id="dues_tel" label={t("Numéro Mobile Money")}>
                <input id="dues_tel" type="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="+243 81 000 0000" className={INPUT} />
              </Field>
            )}
            {demo && <Notice tone="warn">{t("Paiement simulé : aucune somme n'est prélevée.")}</Notice>}
            {last && last.moyen === moyen && <p className="text-xs text-gray-500"><i className="fa-solid fa-clock-rotate-left mr-1" aria-hidden="true"></i>{t("Moyen de votre dernier paiement.")}</p>}
            <button type="submit" data-autofocus disabled={busy || !moyen} className="btn btn--yellow w-full min-h-12 disabled:opacity-60">
              {busy ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> : <i className="fa-solid fa-lock" aria-hidden="true"></i>}
              {demo ? t("Simuler le paiement") : t("Payer :montant", { montant })}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
