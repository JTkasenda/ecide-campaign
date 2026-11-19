"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getDonStatus, postDon, type DonResult } from "@/lib/api";
import { formatNumber, safeUrl } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import type { AdhererPage, PaymentMethod } from "@/lib/types";

type Currency = "cdf" | "usd";

/** Opérateurs Mobile Money : le numéro du payeur est obligatoire. */
const MOBILE = new Set(["airtel", "orange", "mpesa", "afrimoney"]);
const POLL_MS = 5000;
const MAX_POLLS = 36;

/** Logos et couleurs des marques affichées sur les puces des moyens de paiement. */
const BRANDS: Record<string, { icon: string; color: string; label: string }> = {
  visa: { icon: "fa-brands fa-cc-visa", color: "text-[#1a1f71]", label: "Visa" },
  mastercard: { icon: "fa-brands fa-cc-mastercard", color: "text-[#eb001b]", label: "Mastercard" },
  airtel: { icon: "fa-solid fa-mobile-screen-button", color: "text-[#e40000]", label: "Airtel Money" },
  orange: { icon: "fa-solid fa-mobile-screen-button", color: "text-[#ff7900]", label: "Orange Money" },
  mpesa: { icon: "fa-solid fa-mobile-screen-button", color: "text-[#1f7a3e]", label: "M-Pesa" },
  afrimoney: { icon: "fa-solid fa-mobile-screen-button", color: "text-[#5b2d90]", label: "Afrimoney" },
  paypal: { icon: "fa-brands fa-paypal", color: "text-[#003087]", label: "PayPal" },
};

/** Logos d'un moyen de paiement (marques connues, sinon l'icône du moyen). */
export function MethodIcons({ m, size = "text-xl", light = false }: { m: PaymentMethod; size?: string; /** Sur fond sombre : logos en blanc */ light?: boolean }) {
  const marques = (m.marques || []).filter((b) => BRANDS[b]);
  if (marques.length === 0) return <i className={`${m.icone || "fa-solid fa-wallet"} ${size} ${light ? "text-white" : "text-ecideBlue"}`} aria-hidden="true"></i>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {marques.map((b) => (
        <i key={b} className={`${BRANDS[b].icon} ${light ? "text-white" : BRANDS[b].color} ${size}`} aria-hidden="true" title={BRANDS[b].label}></i>
      ))}
    </span>
  );
}

/**
 * Don en francs congolais (dès le minimum configuré) ou en dollars : carte bancaire (Visa,
 * Mastercard) via la page sécurisée du prestataire, Mobile Money (Airtel Money, Orange Money,
 * M-Pesa, Afrimoney), PayPal ou banque. Un montant peut être présélectionné par ?montant=.
 * Le don est enregistré par l'API (POST /forms/don) qui lance le paiement par la passerelle
 * configurée côté serveur ; le formulaire affiche ensuite la référence, les instructions et le
 * statut (en attente, reçu, échec), relu toutes les quelques secondes (GET /forms/don/{reference}).
 * Brancher un prestataire ne demande aucun changement ici.
 */
export default function Donation({ config, title, text, warning }: { config: AdhererPage["paiement"]; title: string; text: string; warning: string }) {
  const { t, locale } = useI18n();
  const preset = Number(useSearchParams().get("montant") || 0);
  const currencies: Record<Currency, { code: string; label: string; min: number; step: number; amounts: number[] }> = {
    cdf: { code: "CDF", label: "FC", min: config.cdf.min, step: 100, amounts: config.cdf.amounts },
    usd: { code: "USD", label: "USD", min: config.usd.min, step: 1, amounts: config.usd.amounts },
  };
  const defaultAmount = (c: Currency) => currencies[c].amounts[Math.min(2, currencies[c].amounts.length - 1)] ?? currencies[c].min;
  const [currency, setCurrency] = useState<Currency>(config.deviseDefaut);
  const [amount, setAmount] = useState<string>(String(preset > 0 ? preset : defaultAmount(config.deviseDefaut)));
  const [method, setMethod] = useState(config.moyens[0]?.key || "");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  /** Don en cours : réponse de l'API, puis statut rafraîchi tant que le paiement n'est pas terminé */
  const [don, setDon] = useState<DonResult | null>(null);
  const [polls, setPolls] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const c = currencies[currency];
  const fmt = (n: number) => formatNumber(n, locale);
  const value = parseFloat(amount);
  const amountNum = isNaN(value) || value <= 0 ? 0 : value;
  const moyen = config.moyens.find((m) => m.key === method) || config.moyens[0];
  const mobile = MOBILE.has(moyen?.key || "");
  const phoneOk = /^\+?[0-9 .\-()]{8,20}$/.test(phone.trim());

  const changeCurrency = (code: Currency) => {
    setCurrency(code);
    setAmount(String(defaultAmount(code)));
  };

  // Suivi du paiement : le statut est relu toutes les 5 s pendant 3 minutes tant qu'il n'est pas final
  useEffect(() => {
    if (!don?.reference || don.final || polls >= MAX_POLLS) return;
    timer.current = setTimeout(async () => {
      const s = await getDonStatus(don.reference!, locale);
      setPolls((n) => n + 1);
      if (s && s.statut) setDon((d) => (d ? { ...d, statut: s.statut, final: s.final, message: s.message || d.message } : d));
    }, POLL_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [don, polls, locale]);

  async function refresh() {
    if (!don?.reference) return;
    const s = await getDonStatus(don.reference, locale);
    if (s && s.statut) setDon((d) => (d ? { ...d, statut: s.statut, final: s.final, message: s.message || d.message } : d));
  }

  function reset() {
    setDon(null);
    setPolls(0);
  }

  async function confirm() {
    if (amountNum < c.min) {
      showToast(t("Le don minimum est de :min :devise.", { min: fmt(c.min), devise: c.label }), "error");
      return;
    }
    if (mobile && !phoneOk) {
      showToast(t("Indiquez le numéro de téléphone Mobile Money qui effectuera le paiement."), "error");
      return;
    }
    if (phone.trim() && !phoneOk) {
      showToast(t("Indiquez un numéro de téléphone valide (par exemple +243 81 000 0000)."), "error");
      return;
    }
    setBusy(true);
    try {
      const r = await postDon(locale, { montant: amountNum, devise: c.code, moyen: moyen?.key || "", telephone: phone.trim(), nom: name.trim(), email: email.trim() });
      if (!r.ok && !r.reference) {
        showToast(r.message || t("Le don n'a pas pu être enregistré."), "error");
        return;
      }
      setPolls(0);
      setDon({ ...r, montant: amountNum, devise: c.label, moyen: moyen?.label || "" });
      if (r.redirectUrl) window.open(safeUrl(r.redirectUrl), "_blank", "noopener");
    } catch {
      showToast(t("Connexion impossible. Réessayez dans un instant."), "error");
    } finally {
      setBusy(false);
    }
  }

  // Après l'envoi : le suivi du paiement remplace le formulaire (référence, instructions, statut)
  if (don) {
    const statut = don.statut || "en_attente";
    const tone = statut === "reussi" ? "bg-green-50 border-green-600 text-green-900" : statut === "en_attente" ? "bg-ecideYellow-50 border-ecideYellow text-gray-900" : "bg-red-50 border-red-600 text-red-900";
    const icon = statut === "reussi" ? "fa-circle-check text-green-600" : statut === "en_attente" ? "fa-spinner fa-spin text-ecideYellow-700" : "fa-circle-xmark text-red-600";
    const heading = statut === "reussi" ? t("Don reçu, merci !") : statut === "en_attente" ? t("Paiement en attente") : statut === "annule" ? t("Don annulé") : t("Paiement non abouti");
    const montant = `${fmt(don.montant || amountNum)} ${don.devise || c.label}`;
    return (
      <div id="don" className="panel p-8 lg:p-10 space-y-6 scroll-mt-32">
        <div>
          <h2 className="text-4xl text-ecideDarkBlue no-bar">{title}</h2>
          {text && <p className="text-gray-600 mt-2">{text}</p>}
        </div>
        <div className={`p-6 border-l-4 space-y-4 ${tone}`} role="status" aria-live="polite" data-don-statut={statut}>
          <div className="flex items-start gap-4">
            <i className={`fa-solid ${icon} text-3xl mt-0.5`} aria-hidden="true"></i>
            <div className="space-y-1 min-w-0">
              <p className="font-display font-semibold text-2xl leading-tight">{heading}</p>
              <p>{statut === "reussi" ? t("Votre don de :montant par :moyen a bien été reçu.", { montant, moyen: don.moyen || "" }) : don.message}</p>
              {don.reference && (
                <p className="text-sm">
                  {t("Référence")} : <span className="font-mono font-bold">{don.reference}</span> · {montant} · {don.moyen}
                </p>
              )}
            </div>
          </div>
          {statut === "en_attente" && (don.instructions || []).length > 0 && (
            <ol className="list-decimal pl-6 space-y-1 text-gray-800">
              {don.instructions!.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ol>
          )}
          {statut === "en_attente" && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {don.redirectUrl && (
                <a href={safeUrl(don.redirectUrl)} target="_blank" rel="noopener" className="btn btn--dark btn--sm">
                  <i className="fa-solid fa-lock text-xs" aria-hidden="true"></i>
                  {t("Ouvrir la page de paiement")}
                </a>
              )}
              <button type="button" onClick={refresh} className="btn btn--outline btn--sm text-ecideDarkBlue">
                <i className="fa-solid fa-rotate text-xs" aria-hidden="true"></i>
                {t("Actualiser le statut")}
              </button>
              <span className="text-sm text-gray-600">{polls < MAX_POLLS ? t("Nous vérifions la confirmation du paiement…") : t("Le statut sera mis à jour dès la confirmation de la Trésorerie : conservez votre référence.")}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {statut === "reussi" ? (
            <button type="button" onClick={reset} className="btn btn--dark">{t("Faire un autre don")}</button>
          ) : statut !== "en_attente" ? (
            <button type="button" onClick={reset} className="btn btn--primary">{t("Réessayer")}</button>
          ) : null}
        </div>
        {warning && (
          <p className="text-xs text-gray-500 flex items-start gap-2">
            <i className="fa-solid fa-lock mt-0.5" aria-hidden="true"></i>
            {warning}
          </p>
        )}
      </div>
    );
  }

  return (
    <div id="don" className="panel p-8 lg:p-10 space-y-10 scroll-mt-32">
      <div>
        <h2 className="text-4xl text-ecideDarkBlue no-bar">{title}</h2>
        <p className="text-gray-600 mt-2">{text}</p>
      </div>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display font-semibold text-xl text-ecideDarkBlue">{t("Sélectionnez le montant")}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("Devise")}>
            <button type="button" onClick={() => changeCurrency("cdf")} className={`chip px-4 py-2 text-sm ${currency === "cdf" ? "is-active" : ""}`} aria-pressed={currency === "cdf"}>{t("Francs congolais")}</button>
            <button type="button" onClick={() => changeCurrency("usd")} className={`chip px-4 py-2 text-sm ${currency === "usd" ? "is-active" : ""}`} aria-pressed={currency === "usd"}>{t("Dollars US")}</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3" role="group" aria-label={t("Montants suggérés")}>
          {c.amounts.map((a) => (
            <button type="button" key={a} onClick={() => setAmount(String(a))} className={`chip flex-auto min-w-[5.5rem] px-3 py-3 ${a === amountNum ? "is-active" : ""}`} aria-pressed={a === amountNum}>
              {fmt(a)} {c.label}
            </button>
          ))}
        </div>
        <label htmlFor="customDonation" className="sr-only">{t("Autre montant")}</label>
        <div className="relative">
          <input type="number" id="customDonation" min={c.min} step={c.step} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t("Autre montant")} className="w-full p-4 pr-16 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-ecideBlue text-lg" />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">{c.label}</span>
        </div>
        <p className="text-xs text-gray-500">
          {t("Don minimum : :min :devise.", { min: fmt(c.min), devise: c.label })} {currency === "cdf" ? t("Les dons en dollars sont possibles à partir de :min USD.", { min: fmt(currencies.usd.min) }) : t("Les dons en francs congolais sont possibles à partir de :min FC.", { min: fmt(currencies.cdf.min) })}
        </p>
      </div>
      <div className="space-y-4">
        <p className="font-display font-semibold text-xl text-ecideDarkBlue">{t("Méthode de paiement")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm" role="group" aria-label={t("Méthodes de paiement")}>
          {config.moyens.map((m) => (
            <button type="button" key={m.key} onClick={() => setMethod(m.key)} className={`chip p-3 flex flex-col items-center justify-center gap-1.5 ${method === m.key ? "is-active" : ""}`} aria-pressed={method === m.key}>
              <MethodIcons m={m} size="text-2xl" />
              <span>{m.court}</span>
            </button>
          ))}
        </div>
      </div>
      {moyen && (
        <div className="p-6 bg-white border-l-4 border-ecideDarkBlue text-base space-y-1" aria-live="polite">
          <p className="font-display font-semibold text-xl text-ecideDarkBlue">{moyen.label}</p>
          {moyen.lines.map((l, i) => (
            <p key={i} className="text-gray-700">{l}</p>
          ))}
          {moyen.note && (moyen.key !== "paypal" || currency === "cdf") && <p className="text-sm text-gray-500 pt-2">{moyen.note}</p>}
          {moyen.url && (
            <p className="pt-3">
              <a href={safeUrl(moyen.url)} target="_blank" rel="noopener" className="btn btn--dark btn--sm">
                <i className="fa-solid fa-lock text-xs" aria-hidden="true"></i>
                {t("Payer par carte sur la page sécurisée")}
              </a>
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        <p className="font-display font-semibold text-xl text-ecideDarkBlue">{t("Vos coordonnées")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="donPhone" className="sr-only">{mobile ? t("Numéro Mobile Money qui paiera") : t("Téléphone (facultatif)")}</label>
            <input id="donPhone" name="telephone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} required={mobile} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={mobile ? `${t("Numéro Mobile Money qui paiera")} · +243 81 000 0000` : t("Téléphone (facultatif)")} className="w-full p-4 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-ecideBlue" />
          </div>
          <div>
            <label htmlFor="donName" className="sr-only">{t("Votre nom (facultatif)")}</label>
            <input id="donName" name="nom" type="text" autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Votre nom (facultatif)")} className="w-full p-4 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-ecideBlue" />
          </div>
          <div>
            <label htmlFor="donEmail" className="sr-only">{t("E-mail pour le reçu (facultatif)")}</label>
            <input id="donEmail" name="email" type="email" autoComplete="email" maxLength={190} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("E-mail pour le reçu (facultatif)")} className="w-full p-4 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-ecideBlue" />
          </div>
        </div>
      </div>
      <p className="text-gray-600">
        {amountNum <= 0 ? (
          t("Choisissez un montant pour voir le récapitulatif de votre contribution.")
        ) : amountNum < c.min ? (
          <span className="text-red-600 font-semibold">{t("Le don minimum est de :min :devise.", { min: fmt(c.min), devise: c.label })}</span>
        ) : (
          <Summary text={t("Vous vous apprêtez à contribuer :montant via :moyen.")} montant={`${fmt(amountNum)} ${c.label}`} moyen={moyen?.label || ""} />
        )}
      </p>
      <button type="button" onClick={confirm} disabled={busy} className="btn btn--primary btn--lg w-full disabled:opacity-60">
        <i className="fa-solid fa-hand-holding-heart text-sm" aria-hidden="true"></i>
        {t("Confirmer le Don")}
      </button>
      {warning && (
        <p className="text-xs text-gray-500 flex items-start gap-2">
          <i className="fa-solid fa-lock mt-0.5" aria-hidden="true"></i>
          {warning}
        </p>
      )}
    </div>
  );
}

/** Phrase traduite avec le montant et le moyen mis en gras (les paramètres :montant / :moyen sont remplacés par des éléments). */
function Summary({ text, montant, moyen }: { text: string; montant: string; moyen: string }) {
  const parts = text.split(/(:montant|:moyen)/);
  return (
    <>
      {parts.map((p, i) =>
        p === ":montant" ? <strong key={i} className="text-ecideDarkBlue">{montant}</strong> : p === ":moyen" ? <strong key={i} className="text-ecideDarkBlue">{moyen}</strong> : <span key={i}>{p}</span>,
      )}
    </>
  );
}
