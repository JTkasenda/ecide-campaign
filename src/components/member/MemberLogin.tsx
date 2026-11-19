"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { memberApi, type MemberData } from "@/lib/member";
import { showToast } from "@/lib/toast";
import { MemberPanel, INPUT } from "./ui";

/** Dernier numéro ou e-mail utilisé sur cet appareil (pré-rempli à la connexion suivante). */
const ID_KEY = "ecide-membre-identifiant";

interface Sent {
  destinataire: string;
  canal: "sms" | "email";
  demo: boolean;
  code: string | null;
}

/**
 * Connexion à l'espace membre sans mot de passe : numéro de téléphone ou adresse e-mail, puis le
 * code reçu par SMS ou e-mail (validé dès le sixième chiffre, collage accepté). Le compte est créé
 * à la première connexion. En démonstration, le code s'affiche à l'écran (aucun SMS n'est envoyé).
 */
export default function MemberLogin({ onLogged }: { onLogged: (data: MemberData) => void }) {
  const { t, locale } = useI18n();
  const [identifiant, setIdentifiant] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const idRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Numéro retenu dans ce navigateur : rien à retaper pour se reconnecter
    try {
      const saved = localStorage.getItem(ID_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setIdentifiant(saved);
    } catch {
      /* stockage indisponible */
    }
  }, []);

  async function askCode(e?: FormEvent, again = false) {
    e?.preventDefault();
    setError("");
    if (!identifiant.trim()) {
      idRef.current?.focus();
      return setError(t("Indiquez votre numéro de téléphone ou votre adresse e-mail."));
    }
    setBusy(true);
    const r = await memberApi<Sent>("code", locale, { json: { identifiant } });
    setBusy(false);
    if (!r.ok) {
      if (!again) idRef.current?.focus();
      return setError(r.message || t("Connexion impossible. Réessayez dans un instant."));
    }
    setSent(r.data);
    setCode("");
    if (again) showToast(t("Un nouveau code vous a été envoyé."));
    setTimeout(() => codeRef.current?.focus(), 0);
  }

  async function login(value: string) {
    setError("");
    if (!/^\d{6}$/.test(value)) {
      codeRef.current?.focus();
      return setError(t("Le code compte 6 chiffres."));
    }
    setBusy(true);
    const r = await memberApi("connexion", locale, { json: { identifiant: sent?.destinataire || identifiant, code: value } });
    if (!r.ok) {
      setBusy(false);
      setCode("");
      setTimeout(() => codeRef.current?.focus(), 0);
      return setError(r.message || t("Code incorrect."));
    }
    try {
      localStorage.setItem(ID_KEY, identifiant.trim());
    } catch {
      /* préférence non retenue */
    }
    const me = await memberApi("", locale);
    setBusy(false);
    if (me.ok) onLogged(me.data);
    else setError(me.message || t("Connexion impossible. Réessayez dans un instant."));
  }

  /** Saisie ou collage du code : seuls les chiffres comptent ; au sixième, la connexion part. */
  function typeCode(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (error) setError("");
    if (digits.length === 6 && !busy) login(digits);
  }

  const errorLine = (id: string) =>
    error && (
      <p id={id} role="alert" className="text-sm font-semibold text-red-600">
        <i className="fa-solid fa-circle-exclamation mr-1" aria-hidden="true"></i>
        {error}
      </p>
    );

  return (
    <MemberPanel title={t("Créer un compte ou se connecter")} subtitle={t("Avec votre téléphone ou votre e-mail. Pas de mot de passe à retenir.")} narrow>
      {!sent ? (
        <form onSubmit={askCode} className="space-y-5" noValidate>
          <div>
            <label htmlFor="mId" className="block font-bold text-gray-700 mb-2">{t("Téléphone ou e-mail")}</label>
            <input
              ref={idRef}
              id="mId"
              type="text"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={identifiant}
              onChange={(e) => (setIdentifiant(e.target.value), error && setError(""))}
              placeholder="+243 81 000 0000"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "mId-error" : "mId-help"}
              className={INPUT}
              autoFocus
            />
            <p id="mId-help" className="text-xs text-gray-500 mt-2">{t("En RD Congo comme dans la diaspora. Le numéro s'écrit avec l'indicatif du pays (+243, +32, +33…).")}</p>
          </div>
          {errorLine("mId-error")}
          <button type="submit" disabled={busy} className="btn btn--primary btn--lg w-full disabled:opacity-60">
            {busy ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> : <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>}
            {t("Recevoir un code")}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => (e.preventDefault(), login(code))} className="space-y-5" noValidate>
          <p className="text-sm text-gray-600">{t("Entrez le code envoyé à")} <strong className="text-ecideDarkBlue break-all">{sent.destinataire}</strong>.</p>
          {sent.demo && sent.code && (
            <p className="member-notice bg-ecideYellow-50 border border-ecideYellow-200 rounded-lg px-3.5 py-3 text-sm text-gray-700">
              {sent.canal === "email" ? t("Aucun e-mail n'est envoyé pendant la démonstration.") : t("Aucun SMS n'est envoyé pendant la démonstration.")} {t("Utilisez le code")} <strong className="font-mono">{sent.code}</strong>.
            </p>
          )}
          <div>
            <label htmlFor="mCode" className="block font-bold text-gray-700 mb-2">{t("Code de vérification")}</label>
            <input
              ref={codeRef}
              id="mCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => typeCode(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "mCode-error" : "mCode-help"}
              className={`${INPUT} font-mono !text-2xl tracking-[0.4em] text-center`}
              autoFocus
            />
            <p id="mCode-help" className="text-xs text-gray-500 mt-2">{t("6 chiffres : la connexion se fait dès le dernier chiffre.")}</p>
          </div>
          {errorLine("mCode-error")}
          <button type="submit" disabled={busy} className="btn btn--primary btn--lg w-full disabled:opacity-60">
            {busy && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>}
            {busy ? t("Connexion…") : t("Continuer")}
          </button>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={() => (setSent(null), setError(""), setTimeout(() => idRef.current?.select(), 0))} className="btn btn--outline flex-1">{t("Changer de numéro")}</button>
            <button type="button" onClick={() => askCode(undefined, true)} disabled={busy} className="btn btn--outline flex-1">{t("Renvoyer le code")}</button>
          </div>
        </form>
      )}
    </MemberPanel>
  );
}
