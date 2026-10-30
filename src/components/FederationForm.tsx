"use client";

import { useState, type FormEvent } from "react";
import { postForm } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";

interface Labels {
  name: string;
  country: string;
  countryExample: string;
  city: string;
  contact: string;
  wish: string;
  submit: string;
}

/** Demande de rejoindre ou créer un secrétariat provincial exécutif de la diaspora (un par pays). */
export default function FederationForm({ choix, confirmation, labels }: { choix: string[]; confirmation: string; labels: Labels }) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState({ nom: "", pays: "", ville: "", contact: "", souhait: choix[0] || "" });
  const [busy, setBusy] = useState(false);
  const input = "w-full p-4 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-ecideBlue";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await postForm("federation", locale, form);
      showToast(r.ok ? r.message || confirmation : r.message || t("Le message n'a pas pu être envoyé. Vérifiez les champs."), r.ok ? "info" : "error");
      if (r.ok) setForm({ ...form, nom: "", pays: "", ville: "", contact: "" });
    } catch {
      showToast(t("Connexion impossible. Réessayez dans un instant."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white text-gray-900 p-8 lg:p-10 space-y-5 reveal">
      <div>
        <label htmlFor="dName" className="block font-bold text-gray-700 mb-2">{labels.name}</label>
        <input id="dName" type="text" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className={input} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="dCountry" className="block font-bold text-gray-700 mb-2">{labels.country}</label>
          <input id="dCountry" type="text" required placeholder={labels.countryExample} value={form.pays} onChange={(e) => setForm({ ...form, pays: e.target.value })} className={input} />
        </div>
        <div>
          <label htmlFor="dCity" className="block font-bold text-gray-700 mb-2">{labels.city}</label>
          <input id="dCity" type="text" required value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} className={input} />
        </div>
      </div>
      <div>
        <label htmlFor="dContact" className="block font-bold text-gray-700 mb-2">{labels.contact}</label>
        <input id="dContact" type="text" required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className={input} />
      </div>
      <div>
        <label htmlFor="dRole" className="block font-bold text-gray-700 mb-2">{labels.wish}</label>
        <select id="dRole" value={form.souhait} onChange={(e) => setForm({ ...form, souhait: e.target.value })} className={input}>
          {choix.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={busy} className="btn btn--primary btn--lg w-full disabled:opacity-60">{labels.submit}</button>
    </form>
  );
}
