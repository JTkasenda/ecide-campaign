"use client";

import { useState, type FormEvent } from "react";
import { postForm } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";

interface Labels {
  title: string;
  placeholder: string;
  submit: string;
  success: string;
  /** Prénom facultatif (colonne des actualités) : les e-mails sont personnalisés */
  name?: string;
  /** Note sous le formulaire (langue des envois) */
  note?: string;
  /** Numéro de téléphone (pied de page) : abonnement aux alertes par SMS, en plus ou à la place de l'e-mail */
  phone?: string;
}

/**
 * Inscription aux communiqués (pied de page, colonne des actualités, bandeau d'accueil). L'API
 * reçoit la langue de la page (?lang) : chaque abonné reçoit ses e-mails dans cette langue. Le
 * pied de page propose aussi le numéro de téléphone : alertes par SMS, en plus ou à la place de l'e-mail.
 */
export default function NewsletterForm({ variant, labels, description }: { variant: "footer" | "aside" | "hero"; labels: Labels; description?: string }) {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const id = variant === "footer" ? "footerEmail" : variant === "hero" ? "heroEmail" : "newsEmail";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      showToast(t("Indiquez un e-mail ou un numéro de téléphone."), "error");
      return;
    }
    setBusy(true);
    try {
      const r = await postForm("newsletter", locale, { email: email.trim(), telephone: phone.trim(), nom: name.trim(), source: variant === "aside" ? "actualites" : variant === "hero" ? "accueil" : "footer" });
      showToast(r.ok ? r.message || labels.success : r.message || t("Le message n'a pas pu être envoyé. Vérifiez les champs."), r.ok ? "info" : "error");
      if (r.ok) {
        setEmail("");
        setPhone("");
        setName("");
      }
    } catch {
      showToast(t("Connexion impossible. Réessayez dans un instant."), "error");
    } finally {
      setBusy(false);
    }
  }

  // Bandeau de la page d'accueil : champs sur fond gris-bleu, bouton jaune (formulaire de warnockforgeorgia.com)
  if (variant === "hero") {
    return (
      <form onSubmit={submit} className="newsletter-hero max-w-xl" aria-label={labels.title}>
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="bg-ecideBlue-50 text-gray-900 grid grid-cols-1 sm:grid-cols-2">
            <label htmlFor={id} className="sr-only">{labels.placeholder}</label>
            <input id={id} name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={labels.placeholder} className="min-w-0 px-5 py-5 bg-transparent text-base placeholder:text-gray-500 focus:outline-none focus:bg-white sm:border-r border-white" />
            {labels.name && (
              <>
                <label htmlFor={`${id}Name`} className="sr-only">{labels.name}</label>
                <input id={`${id}Name`} name="nom" type="text" autoComplete="given-name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder={labels.name} className="min-w-0 px-5 py-5 bg-transparent text-base placeholder:text-gray-500 focus:outline-none focus:bg-white border-t sm:border-t-0 border-white" />
              </>
            )}
          </div>
          <button type="submit" disabled={busy} className="btn btn--primary btn--lg sm:h-full disabled:opacity-60">{labels.submit}</button>
        </div>
        {labels.note && <p className="text-xs text-blue-100 pt-3 max-w-md font-sans">{labels.note}</p>}
      </form>
    );
  }

  if (variant === "aside") {
    return (
      <section className="bg-ecideDarkBlue text-white p-6 reveal diag">
        <h2 className="text-2xl">{labels.title}</h2>
        {description && <p className="text-sm text-blue-100 mt-2">{description}</p>}
        <form onSubmit={submit} className="mt-4 space-y-2">
          {labels.name && (
            <>
              <label htmlFor={`${id}Name`} className="sr-only">{labels.name}</label>
              <input id={`${id}Name`} name="nom" type="text" autoComplete="given-name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder={labels.name} className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 text-sm focus:ring-2 focus:ring-ecideYellow" />
            </>
          )}
          <div className="flex gap-2">
            <label htmlFor={id} className="sr-only">{labels.placeholder}</label>
            <input id={id} name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={labels.placeholder} className="flex-1 min-w-0 px-4 py-3 bg-white text-gray-900 border border-gray-200 text-sm focus:ring-2 focus:ring-ecideYellow" />
            <button type="submit" disabled={busy} className="btn btn--primary px-4 disabled:opacity-60" aria-label={labels.submit}>
              <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>
            </button>
          </div>
          {labels.note && <p className="text-xs text-blue-200 pt-1">{labels.note}</p>}
        </form>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="pt-2 space-y-2">
      <p id={`${id}Title`} className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">{labels.title}</p>
      <label htmlFor={id} className="sr-only">{labels.placeholder}</label>
      <input id={id} name="email" type="email" required={!labels.phone} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={labels.placeholder} className="w-full min-w-0 px-4 py-2.5 text-gray-900 bg-white text-sm" />
      <div className="flex gap-2">
        {labels.phone ? (
          <>
            <label htmlFor={`${id}Phone`} className="sr-only">{labels.phone}</label>
            <input id={`${id}Phone`} name="telephone" type="tel" autoComplete="tel" inputMode="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={labels.phone} className="flex-1 min-w-0 px-4 py-2.5 text-gray-900 bg-white text-sm" />
          </>
        ) : (
          <span className="flex-1" aria-hidden="true"></span>
        )}
        <button type="submit" disabled={busy} className="bg-ecideYellow text-ecideDarkBlue font-black px-4 hover:bg-yellow-400 transition disabled:opacity-60" aria-label={labels.submit}>
          <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>
        </button>
      </div>
      {labels.phone && labels.note && <p className="text-xs text-blue-200">{labels.note}</p>}
    </form>
  );
}
