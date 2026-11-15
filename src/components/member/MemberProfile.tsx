"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import { memberApi, type MemberData } from "@/lib/member";
import { showToast } from "@/lib/toast";
import { useMember } from "./MemberContext";
import { Field, INPUT, MemberCardBox, MemberPageHeader } from "./ui";

/**
 * Profil du membre : identité et rattachement (tenus par le parti, en lecture), coordonnées et
 * adresse modifiables par le membre.
 */
const FIELD_IDS = { telephone: "p_tel", email: "p_email", profession: "p_prof", etat_civil: "p_ec", quartier: "p_q", localite: "p_l", adresse: "p_a" } as const;

export default function MemberProfile() {
  const { t, locale } = useI18n();
  const { data, setData, logout } = useMember();
  const m = data.membre;
  const [form, setForm] = useState({
    telephone: m.telephone || "",
    email: m.email || "",
    profession: m.profession || "",
    etat_civil: m.etat_civil || "",
    quartier: m.quartier || "",
    localite: m.localite || "",
    adresse: m.adresse || "",
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((x) => (x[k] ? { ...x, [k]: undefined } : x));
  };
  // Rien à enregistrer tant que rien n'a changé
  const saved = { telephone: m.telephone || "", email: m.email || "", profession: m.profession || "", etat_civil: m.etat_civil || "", quartier: m.quartier || "", localite: m.localite || "", adresse: m.adresse || "" };
  const dirty = (Object.keys(form) as (keyof typeof form)[]).some((k) => form[k].trim() !== saved[k]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setBusy(true);
    const r = await memberApi<MemberData>("profil", locale, { method: "PUT", json: form });
    setBusy(false);
    if (!r.ok) {
      // Erreur affichée sous le champ concerné (validation, numéro ou adresse déjà pris)
      const byField: Partial<Record<keyof typeof form, string>> = {};
      Object.entries(r.data.errors || {}).forEach(([k, v]) => k in form && (byField[k as keyof typeof form] = v[0]));
      const msg = (r.message || "").toLowerCase();
      if (!r.data.errors && msg.includes("numéro")) byField.telephone = r.message;
      else if (!r.data.errors && (msg.includes("adresse est déjà") || msg.includes("e-mail"))) byField.email = r.message;
      setErrors(byField);
      const first = Object.keys(byField)[0];
      if (first) document.getElementById(FIELD_IDS[first as keyof typeof form])?.focus();
      return showToast(r.message || t("Enregistrement impossible. Réessayez."), "error");
    }
    // Numéro de connexion retenu sur cet appareil : il suit le nouveau numéro
    try {
      if (m.telephone && localStorage.getItem("ecide-membre-identifiant") && r.data.membre.telephone !== m.telephone) localStorage.setItem("ecide-membre-identifiant", r.data.membre.telephone || "");
    } catch {
      /* stockage indisponible */
    }
    setData(r.data);
    setForm({ telephone: r.data.membre.telephone || "", email: r.data.membre.email || "", profession: r.data.membre.profession || "", etat_civil: r.data.membre.etat_civil || "", quartier: r.data.membre.quartier || "", localite: r.data.membre.localite || "", adresse: r.data.membre.adresse || "" });
    showToast(t("Profil enregistré."));
  }
  const err = (k: keyof typeof form) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${FIELD_IDS[k]}-error` } : {});

  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale) : "—");
  return (
    <div className="space-y-6">
      <MemberPageHeader title={t("Mon profil")} subtitle={m.nomComplet} />
      <MemberCardBox>
        <h2 className="text-xl text-ecideDarkBlue no-bar member-title mb-4">{t("Identité et rattachement")}</h2>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {[
            [t("Nom complet"), m.nomComplet],
            [t("Sexe"), m.sexe === "F" ? t("Féminin") : m.sexe === "M" ? t("Masculin") : ""],
            [t("Date de naissance"), date(m.date_naissance)],
            [t("Lieu de naissance"), m.lieu_naissance],
            [t("Catégorie"), m.categorieLibelle],
            [t("Résidence"), m.residence],
            [t("Cellule / section"), m.section],
            [t("Membre depuis"), date(m.membreDepuis)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
              <dt className="text-gray-500">{k}</dt>
              <dd className="font-semibold text-right text-gray-900 min-w-0 break-words">{v || "—"}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-gray-500 mt-4">
          {t("Une erreur dans votre identité ou votre rattachement ?")}{" "}
          <Link href={localePath(locale as Locale, "/contact")} className="font-semibold text-ecideBlue underline">{t("Écrivez au Secrétariat Général.")}</Link>
        </p>
      </MemberCardBox>

      <MemberCardBox>
        <h2 className="text-xl text-ecideDarkBlue no-bar member-title mb-4">{t("Coordonnées")}</h2>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-5" noValidate>
          <Field id="p_tel" label={t("Téléphone")} help={t("Sert aussi à vous connecter et à recevoir les messages du parti.")} error={errors.telephone}>
            <input id="p_tel" type="tel" inputMode="tel" autoComplete="tel" value={form.telephone} onChange={(e) => set("telephone", e.target.value)} placeholder="+243 81 000 0000" className={INPUT} {...err("telephone")} />
          </Field>
          <Field id="p_email" label={t("E-mail")} optional={t("facultatif")} error={errors.email}>
            <input id="p_email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={form.email} onChange={(e) => set("email", e.target.value)} className={INPUT} {...err("email")} />
          </Field>
          <Field id="p_prof" label={t("Profession")} optional={t("facultatif")}>
            <input id="p_prof" value={form.profession} onChange={(e) => set("profession", e.target.value)} className={INPUT} />
          </Field>
          <Field id="p_ec" label={t("État civil")} optional={t("facultatif")}>
            <select id="p_ec" value={form.etat_civil} onChange={(e) => set("etat_civil", e.target.value)} className={INPUT}>
              <option value="">—</option>
              {Object.entries(data.options.etatsCivils).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}
            </select>
          </Field>
          <Field id="p_q" label={t("Quartier / Secteur / Chefferie")} optional={t("facultatif")}>
            <input id="p_q" value={form.quartier} onChange={(e) => set("quartier", e.target.value)} className={INPUT} />
          </Field>
          <Field id="p_l" label={t("Localité / Groupement")} optional={t("facultatif")}>
            <input id="p_l" value={form.localite} onChange={(e) => set("localite", e.target.value)} className={INPUT} />
          </Field>
          <Field id="p_a" label={t("Avenue, rue et numéro")} className="sm:col-span-2" error={errors.adresse}>
            <input id="p_a" autoComplete="street-address" {...err("adresse")} value={form.adresse} onChange={(e) => set("adresse", e.target.value)} className={INPUT} />
          </Field>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy || !dirty} className="btn btn--primary disabled:opacity-50">
              {busy && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>}
              {dirty || busy ? t("Enregistrer") : t("Enregistré")}
            </button>
            <button type="button" onClick={logout} className="btn btn--outline">
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
              {t("Se déconnecter")}
            </button>
          </div>
        </form>
      </MemberCardBox>
    </div>
  );
}
