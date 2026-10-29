"use client";

import { useState } from "react";
import { postForm } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import type { AdhererPage } from "@/lib/types";

type Currency = "cdf" | "usd";

/** Don en francs congolais (dès le minimum configuré) ou en dollars, par Mobile Money, PayPal ou banque. */
export default function Donation({ config, title, text, warning }: { config: AdhererPage["paiement"]; title: string; text: string; warning: string }) {
  const { t, locale } = useI18n();
  const currencies: Record<Currency, { code: string; label: string; min: number; step: number; amounts: number[] }> = {
    cdf: { code: "CDF", label: "FC", min: config.cdf.min, step: 100, amounts: config.cdf.amounts },
    usd: { code: "USD", label: "USD", min: config.usd.min, step: 1, amounts: config.usd.amounts },
  };
  const defaultAmount = (c: Currency) => currencies[c].amounts[Math.min(2, currencies[c].amounts.length - 1)] ?? currencies[c].min;
  const [currency, setCurrency] = useState<Currency>(config.deviseDefaut);
  const [amount, setAmount] = useState<string>(String(defaultAmount(config.deviseDefaut)));
  const [method, setMethod] = useState(config.moyens[0]?.key || "");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");

  const c = currencies[currency];
  const fmt = (n: number) => formatNumber(n, locale);
  const value = parseFloat(amount);
  const amountNum = isNaN(value) || value <= 0 ? 0 : value;
  const moyen = config.moyens.find((m) => m.key === method) || config.moyens[0];

  const changeCurrency = (code: Currency) => {
    setCurrency(code);
    setAmount(String(defaultAmount(code)));
  };

  async function confirm() {
    if (amountNum < c.min) {
      showToast(t("Le don minimum est de :min :devise.", { min: fmt(c.min), devise: c.label }), "error");
      return;
    }
    setBusy(true);
    try {
      const r = await postForm("don", locale, { montant: amountNum, devise: c.code, moyen: moyen?.label || "" });
      if (!r.ok) {
        showToast(r.message || t("Le don n'a pas pu être enregistré."), "error");
        return;
      }
      setSuccess(
        t("Merci pour votre contribution de :montant via :moyen.", { montant: `${fmt(amountNum)} ${c.label}`, moyen: moyen?.label || "" }) +
          " " +
          (r.reference ? t("Indiquez la référence :ref lors du paiement, puis suivez les instructions ci-dessus.", { ref: r.reference }) : t("Suivez les instructions ci-dessus pour finaliser le paiement.")),
      );
    } catch {
      showToast(t("Connexion impossible. Réessayez dans un instant."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="don" className="panel p-8 lg:p-10 space-y-8 reveal scroll-mt-32">
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
          {t("Don minimum : :min :devise.", { min: fmt(c.min), devise: c.label })} {currency === "cdf" ? t("Les dons en dollars sont possibles à partir de 1 USD.") : t("Les dons en francs congolais sont possibles à partir de 500 FC.")}
        </p>
      </div>
      <div className="space-y-4">
        <p className="font-display font-semibold text-xl text-ecideDarkBlue">{t("Méthode de paiement")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm" role="group" aria-label={t("Méthodes de paiement")}>
          {config.moyens.map((m) => (
            <button type="button" key={m.key} onClick={() => setMethod(m.key)} className={`chip p-3 ${method === m.key ? "is-active" : ""}`}>{m.court}</button>
          ))}
        </div>
      </div>
      {moyen && (
        <div className="p-6 bg-white border-l-4 border-ecideDarkBlue text-base space-y-1" aria-live="polite">
          <p className="font-display font-semibold text-xl text-ecideDarkBlue">{moyen.label}</p>
          {moyen.lines.map((l, i) => (
            <p key={i} className="text-gray-700">{l}</p>
          ))}
          {moyen.note && currency === "cdf" && <p className="text-sm text-gray-500 pt-2">{moyen.note}</p>}
        </div>
      )}
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
      {success && (
        <div className="p-6 bg-green-50 border border-green-200 text-green-800 flex gap-4" role="status">
          <i className="fa-solid fa-circle-check text-2xl mt-0.5" aria-hidden="true"></i>
          <p>{success}</p>
        </div>
      )}
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
