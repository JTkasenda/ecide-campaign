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
}

/**
 * Inscription aux communiqués (pied de page et colonne des actualités). L'API reçoit
 * la langue de la page (?lang) : chaque abonné reçoit ses e-mails dans cette langue.
 */
export default function NewsletterForm({ variant, labels, description }: { variant: "footer" | "aside"; labels: Labels; description?: string }) {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const id = variant === "footer" ? "footerEmail" : "newsEmail";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await postForm("newsletter", locale, { email: email.trim(), nom: name.trim(), source: variant === "aside" ? "actualites" : "footer" });
      showToast(r.ok ? r.message || labels.success : r.message || t("Le message n'a pas pu être envoyé. Vérifiez les champs."), r.ok ? "info" : "error");
      if (r.ok) {
        setEmail("");
        setName("");
      }
    } catch {
      showToast(t("Connexion impossible. Réessayez dans un instant."), "error");
    } finally {
      setBusy(false);
    }
  }

  if (variant === "aside") {
    return (
      <section className="bg-ecideYellow-50 border border-ecideYellow-100 p-6 reveal">
        <h2 className="text-xl text-ecideDarkBlue">{labels.title}</h2>
        {description && <p className="text-sm text-gray-600 mt-2">{description}</p>}
        <form onSubmit={submit} className="mt-4 space-y-2">
          {labels.name && (
            <>
              <label htmlFor={`${id}Name`} className="sr-only">{labels.name}</label>
              <input id={`${id}Name`} name="nom" type="text" autoComplete="given-name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder={labels.name} className="w-full px-4 py-3 bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-ecideBlue" />
            </>
          )}
          <div className="flex gap-2">
            <label htmlFor={id} className="sr-only">{labels.placeholder}</label>
            <input id={id} name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={labels.placeholder} className="flex-1 min-w-0 px-4 py-3 bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-ecideBlue" />
            <button type="submit" disabled={busy} className="bg-ecideBlue text-white font-bold px-4 hover:bg-ecideDarkBlue transition disabled:opacity-60" aria-label={labels.submit}>
              <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>
            </button>
          </div>
          {labels.note && <p className="text-xs text-gray-500 pt-1">{labels.note}</p>}
        </form>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="pt-2">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">{labels.title}</label>
      <div className="flex gap-2">
        <input id={id} name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={labels.placeholder} className="flex-1 min-w-0 px-4 py-2.5 text-gray-900 bg-white text-sm" />
        <button type="submit" disabled={busy} className="bg-ecideYellow text-ecideDarkBlue font-black px-4 hover:bg-yellow-400 transition disabled:opacity-60" aria-label={labels.submit}>
          <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>
        </button>
      </div>
    </form>
  );
}
