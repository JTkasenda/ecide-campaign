"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { postForm } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";

interface Labels {
  title: string;
  name: string;
  email: string;
  recipient: string;
  message: string;
  submit: string;
}

/** Formulaire de contact ; ?structure=… (annuaires) présélectionne la structure destinataire. */
export default function ContactForm(props: { destinataires: string[]; confirmation: string; labels: Labels }) {
  return (
    <Suspense fallback={<Form {...props} structure="" />}>
      <FormWithQuery {...props} />
    </Suspense>
  );
}

function FormWithQuery(props: { destinataires: string[]; confirmation: string; labels: Labels }) {
  const structure = useSearchParams().get("structure") || "";
  return <Form {...props} structure={structure} />;
}

function Form({ destinataires, confirmation, labels, structure }: { destinataires: string[]; confirmation: string; labels: Labels; structure: string }) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const structureOption = structure ? t("Structure : :structure", { structure }) : "";
  const [form, setForm] = useState({ nom: "", email: "", destinataire: structureOption || destinataires[0] || "", message: "" });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await postForm("contact", locale, form);
      showToast(r.ok ? r.message || confirmation : r.message || t("Le message n'a pas pu être envoyé. Vérifiez les champs."), r.ok ? "info" : "error");
      if (r.ok) setForm({ ...form, nom: "", email: "", message: "" });
    } catch {
      showToast(t("Connexion impossible. Réessayez dans un instant."), "error");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full p-4 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-ecideBlue";
  return (
    <form onSubmit={submit} className="mob-plain lg:col-span-3 bg-ecideBlue-50 p-8 lg:p-10 space-y-6">
      <h2 className="text-4xl text-ecideDarkBlue no-bar">{labels.title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="cName" className="block font-bold text-gray-700 mb-2">{labels.name}</label>
          <input id="cName" name="nom" type="text" required autoComplete="name" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className={input} />
        </div>
        <div>
          <label htmlFor="cEmail" className="block font-bold text-gray-700 mb-2">{labels.email}</label>
          <input id="cEmail" name="email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
        </div>
      </div>
      <div>
        <label htmlFor="cSubject" className="block font-bold text-gray-700 mb-2">{labels.recipient}</label>
        <select id="cSubject" name="destinataire" value={form.destinataire} onChange={(e) => setForm({ ...form, destinataire: e.target.value })} className={input}>
          {structureOption && <option value={structureOption}>{structureOption}</option>}
          {destinataires.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="cMessage" className="block font-bold text-gray-700 mb-2">{labels.message}</label>
        <textarea id="cMessage" name="message" rows={6} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={structure ? t("Votre message à la structure « :structure » sera transmis à ses responsables.", { structure }) : undefined} className={input}></textarea>
      </div>
      <button type="submit" disabled={busy} className="btn btn--dark btn--lg w-full sm:w-auto disabled:opacity-60"><i className="fa-solid fa-paper-plane text-sm" aria-hidden="true"></i>{labels.submit}</button>
    </form>
  );
}
