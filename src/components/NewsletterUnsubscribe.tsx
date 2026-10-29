"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { postForm } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/locales";

type State = { step: "pending" } | { step: "done"; email: string; message: string } | { step: "resubscribed"; message: string } | { step: "error"; message: string };

/** Page de désabonnement : le jeton personnel reçu dans chaque e-mail (?token=…) est envoyé à l'API. */
export default function NewsletterUnsubscribe() {
  return (
    <Suspense fallback={<Status state={{ step: "pending" }} />}>
      <WithToken />
    </Suspense>
  );
}

function WithToken() {
  const token = useSearchParams().get("token") || "";
  const { t, locale } = useI18n();
  const [state, setState] = useState<State>(() => (token ? { step: "pending" } : { step: "error", message: t("Lien de désabonnement manquant.") }));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    postForm("newsletter/desinscription", locale, { token })
      .then((r) => {
        if (cancelled) return;
        setState(r.ok ? { step: "done", email: r.email || "", message: r.message } : { step: "error", message: r.message || t("Ce lien de désabonnement n'est plus valide.") });
      })
      .catch(() => !cancelled && setState({ step: "error", message: t("Connexion impossible. Réessayez dans un instant.") }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, locale]);

  async function resubscribe(email: string) {
    setBusy(true);
    try {
      const r = await postForm("newsletter", locale, { email });
      setState(r.ok ? { step: "resubscribed", message: t("Vous êtes de nouveau abonné.") } : { step: "error", message: r.message });
    } catch {
      setState({ step: "error", message: t("Connexion impossible. Réessayez dans un instant.") });
    } finally {
      setBusy(false);
    }
  }

  return <Status state={state} busy={busy} onResubscribe={resubscribe} />;
}

function Status({ state, busy = false, onResubscribe }: { state: State; busy?: boolean; onResubscribe?: (email: string) => void }) {
  const { t, locale } = useI18n();
  const l = isLocale(locale) ? locale : "fr";
  const icon = state.step === "pending" ? "fa-spinner fa-spin text-ecideBlue" : state.step === "error" ? "fa-circle-exclamation text-red-600" : "fa-circle-check text-ecideGreen";
  return (
    <div className="panel p-8 lg:p-10 space-y-6 text-center" aria-live="polite">
      <i className={`fa-solid ${icon} text-5xl`} aria-hidden="true"></i>
      {state.step === "pending" && <p className="text-lg text-gray-600">{t("Traitement de votre demande…")}</p>}
      {state.step === "done" && (
        <>
          <p className="text-lg font-semibold text-gray-900">{state.message}</p>
          {state.email && (
            <p className="text-sm text-gray-500">
              {t("Adresse désabonnée :")} <span className="font-semibold text-gray-800">{state.email}</span>
            </p>
          )}
          {state.email && onResubscribe && (
            <button type="button" onClick={() => onResubscribe(state.email)} disabled={busy} className="btn btn--dark disabled:opacity-60">
              <i className="fa-solid fa-envelope" aria-hidden="true"></i>
              {t("Se réabonner")}
            </button>
          )}
        </>
      )}
      {state.step === "resubscribed" && <p className="text-lg font-semibold text-gray-900">{state.message}</p>}
      {state.step === "error" && <p className="text-lg font-semibold text-red-700">{state.message}</p>}
      <div>
        <Link href={localePath(l, "/")} className="arrow-link">{t("Retour à l'accueil")}</Link>
      </div>
    </div>
  );
}
