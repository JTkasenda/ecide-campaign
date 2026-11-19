"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import { amountLabel, isRdc, memberApi, memberFile, STEPS, type MemberData, type MemberProfile, type Step } from "@/lib/member";
import { Field, INPUT, MemberPanel, Notice } from "./ui";
import { useOnline } from "../OfflineSupport";
import { clearDraft, readDraft, writeDraft } from "./offlineDraft";

type Draft = Partial<Record<keyof MemberProfile, string>>;
type Errors = Partial<Record<keyof MemberProfile, string>>;
type SetField = (k: keyof MemberProfile, v: string) => void;

const OTHER = "__autre__";

/** Statuts où la demande se modifie encore (voir Member::EDITABLE). */
const EDITABLE = ["compte", "brouillon", "complement"];
const ADDRESS_FIELDS: (keyof MemberProfile)[] = ["pays", "province", "district", "ville", "commune", "quartier", "localite", "adresse"];

/** Catégories ouvertes selon le lieu de résidence (RD Congo ou diaspora). */
const categoriesFor = (data: MemberData, pays: string | null | undefined) => data.options.categories.filter((c) => c.pour === "tous" || (c.pour === "rdc") === isRdc(pays));

/** Champ concerné par un message d'erreur du serveur sans nom de champ. */
function fieldOf(message: string): keyof MemberProfile | null {
  const m = message.toLowerCase();
  if (m.includes("numéro")) return "telephone";
  if (m.includes("adresse est déjà") || m.includes("e-mail")) return "email";
  if (m.includes("province")) return "province";
  if (m.includes("15 ans")) return "date_naissance";
  return null;
}

/**
 * Demande d'adhésion en six étapes : identité, adresse, catégorie, documents, engagement,
 * paiement. Chaque étape est enregistrée dès qu'on la valide (la demande se reprend plus tard) ;
 * les champs à corriger sont signalés sous chaque champ. Quand tout est complet, le paiement
 * réussi transmet aussitôt la demande au parti.
 */
export default function MembershipWizard({ data, setData }: { data: MemberData; setData: (d: MemberData) => void }) {
  const { t, locale } = useI18n();
  const m = data.membre;
  const o = data.options;
  const firstMissing: Step = STEPS.find((s) => m.manque[s]) || "paiement";
  const [step, setStep] = useState<Step>(m.statut === "compte" ? "identite" : firstMissing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [draft, setDraft] = useState<Draft>(() => {
    const d: Draft = {};
    (["nom", "postnom", "prenom", "sexe", "date_naissance", "lieu_naissance", "etat_civil", "profession", "telephone", "email", "pays", "province", "district", "ville", "commune", "quartier", "localite", "adresse", "categorie"] as const).forEach((k) => (d[k] = (m[k] as string) || ""));
    if (!d.pays) d.pays = o.geo.rdc;
    // Saisie pas encore enregistrée (coupure, page rechargée) : retrouvée sur cet appareil
    if (EDITABLE.includes(m.statut)) Object.assign(d, readDraft(m.id)?.champs);
    return d;
  });
  // Connexion intermittente : étapes validées hors ligne, envoyées au retour du réseau
  const [kept] = useState(() => (EDITABLE.includes(m.statut) ? readDraft(m.id) : null));
  const [waiting, setWaiting] = useState(() => !!kept?.enAttente.length);
  const [restored, setRestored] = useState(() => !!kept);
  const pending = useRef<(keyof MemberProfile)[]>((kept?.enAttente || []) as (keyof MemberProfile)[]);
  const dirty = useRef(!!kept);
  const latest = useRef(draft);
  const flushing = useRef(false);
  const online = useOnline();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const set: SetField = (k, v) => {
    dirty.current = true;
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };
  const index = STEPS.indexOf(step);
  const labels: Record<Step, string> = { identite: t("Identité"), adresse: t("Adresse"), categorie: t("Catégorie"), documents: t("Documents"), engagement: t("Engagement"), paiement: t("Paiement") };
  const done = (s: Step) => (s === "paiement" ? data.adhesionPayee : !m.manque[s] && m.statut !== "compte");
  const missingSteps = STEPS.filter((s) => s !== "paiement" && m.manque[s]);

  // Une seule catégorie possible pour ce lieu de résidence : elle est choisie d'office
  const choices = categoriesFor(data, draft.pays);
  const only = step === "categorie" && choices.length === 1 && !draft.categorie ? choices[0].id : "";
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (only) setDraft((d) => ({ ...d, categorie: only }));
  }, [only]);

  // Chaque saisie est gardée sur l'appareil jusqu'à ce que le parti l'ait reçue
  useEffect(() => {
    latest.current = draft;
    if (dirty.current) writeDraft(m.id, draft, pending.current);
  }, [draft, m.id]);

  /** Envoie les étapes remplies hors ligne ; sans réponse du serveur, nouvel essai plus tard. */
  async function flush() {
    const fields = pending.current;
    if (!fields.length || flushing.current) return;
    flushing.current = true;
    const payload: Record<string, string | null> = {};
    fields.forEach((k) => (payload[k] = String(latest.current[k] ?? "").trim() || null));
    const r = await memberApi("demande", locale, { method: "PUT", json: payload });
    flushing.current = false;
    if (r.status === 0) return;
    pending.current = [];
    setWaiting(false);
    if (!r.ok) {
      // Refusé par le serveur : retour à l'étape concernée, la saisie reste gardée
      const byField: Errors = {};
      Object.entries(r.data.errors || {}).forEach(([k, v]) => (byField[k as keyof MemberProfile] = v[0]));
      const first = (Object.keys(byField)[0] || (r.message ? fieldOf(r.message) : null) || fields[0]) as keyof MemberProfile;
      go(first === "categorie" ? "categorie" : ADDRESS_FIELDS.includes(first) ? "adresse" : "identite");
      if (Object.keys(byField).length) showErrors(byField);
      writeDraft(m.id, latest.current, []);
      return setError(r.message || t("Enregistrement impossible. Réessayez."));
    }
    clearDraft(m.id);
    dirty.current = false;
    setRestored(false);
    setData(r.data);
    showToast(t("Connexion retrouvée : vos informations sont enregistrées."));
  }
  // Retour de la connexion : envoi aussitôt, puis toutes les 30 secondes si le serveur ne répond pas
  useEffect(() => {
    if (!online || !waiting) return;
    flush();
    const id = setInterval(flush, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, waiting]);

  // Nouvelle étape : titre ramené en vue et annoncé (pas au premier affichage)
  useEffect(() => {
    if (!moved.current) return;
    document.getElementById("adhesion")?.scrollIntoView({ behavior: "smooth", block: "start" });
    titleRef.current?.focus({ preventScroll: true });
  }, [step]);

  function go(s: Step) {
    setError("");
    setErrors({});
    moved.current = true;
    setStep(s);
  }
  const next = () => go(STEPS[Math.min(index + 1, STEPS.length - 1)]);

  /** Erreurs sous les champs ; le premier champ en défaut reçoit le focus. */
  function showErrors(list: Errors) {
    setErrors(list);
    const first = Object.keys(list)[0];
    if (first) setTimeout(() => (document.getElementById(`m_${first}`) || document.querySelector<HTMLElement>(`[name="${first}"]`))?.focus(), 0);
  }

  /** Enregistre des champs de la demande, puis passe à l'étape suivante. */
  async function save(fields: (keyof MemberProfile)[], required: (keyof MemberProfile)[]) {
    setError("");
    const missing = required.filter((k) => !String(draft[k] || "").trim());
    if (missing.length) {
      showErrors(Object.fromEntries(missing.map((k) => [k, k === "sexe" || k === "categorie" ? t("Faites un choix.") : t("Champ obligatoire.")])));
      return setError(missing.length > 1 ? t(":n champs à compléter : ils sont signalés en rouge.", { n: missing.length }) : t("Un champ à compléter : il est signalé en rouge."));
    }
    setBusy(true);
    const payload: Record<string, string | null> = {};
    fields.forEach((k) => (payload[k] = String(draft[k] ?? "").trim() || null));
    const r = await memberApi("demande", locale, { method: "PUT", json: payload });
    setBusy(false);
    // Pas de connexion : l'étape est gardée sur l'appareil et partira au retour du réseau
    if (r.status === 0) {
      pending.current = [...new Set([...pending.current, ...fields])];
      writeDraft(m.id, draft, pending.current);
      setWaiting(true);
      return next();
    }
    if (!r.ok) {
      // Erreurs par champ (validation) ou message du serveur rattaché à son champ
      const byField: Errors = {};
      Object.entries(r.data.errors || {}).forEach(([k, v]) => (byField[k as keyof MemberProfile] = v[0]));
      const guess = !r.data.errors && r.message ? fieldOf(r.message) : null;
      if (guess && fields.includes(guess)) byField[guess] = r.message;
      if (Object.keys(byField).length) showErrors(byField);
      return setError(r.message || t("Enregistrement impossible. Réessayez."));
    }
    if (!pending.current.length) {
      clearDraft(m.id);
      dirty.current = false;
      setRestored(false);
    }
    setData(r.data);
    next();
  }

  async function submit() {
    setError("");
    setBusy(true);
    const r = await memberApi("soumettre", locale, { json: {} });
    setBusy(false);
    if (!r.ok) return setError(r.status === 0 ? t("Pas de connexion : la demande n'est pas encore transmise. Réessayez au retour du réseau.") : r.message || t("Transmission impossible. Réessayez."));
    clearDraft(m.id);
    showToast(r.data.message || t("Votre demande est transmise."));
    setData(r.data);
  }

  const header = (
    <ol className="grid grid-cols-6 gap-1.5 mb-8" aria-label={t("Étapes de la demande")}>
      {STEPS.map((s, i) => {
        const reachable = i <= index || done(s) || STEPS.slice(0, i).every(done);
        return (
          <li key={s}>
            <button type="button" disabled={!reachable} onClick={() => go(s)} aria-current={s === step ? "step" : undefined} aria-label={`${i + 1}. ${labels[s]}${done(s) ? ` (${t("complété")})` : ""}`} className="w-full text-left group py-3 sm:py-1 disabled:cursor-not-allowed">
              <span className={`block h-1.5 ${i < index || done(s) ? "bg-ecideDarkBlue" : s === step ? "bg-ecideYellow" : "bg-gray-200"}`}></span>
              <span className={`hidden sm:block text-[11px] mt-2 truncate ${s === step ? "font-bold text-ecideDarkBlue" : "text-gray-500 group-enabled:group-hover:text-ecideDarkBlue"}`}>{labels[s]}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  // Bouton d'envoi du formulaire de l'étape : Entrée au clavier fait la même chose
  const nav = (
    <div className="flex gap-3 pt-6">
      {index > 0 && <button type="button" onClick={() => go(STEPS[index - 1])} className="btn btn--outline">{t("Retour")}</button>}
      <button type="submit" disabled={busy} className="btn btn--primary btn--lg flex-1 min-w-0 disabled:opacity-60">
        {busy && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>}
        {t("Continuer")}
      </button>
    </div>
  );

  const onNext: Partial<Record<Step, () => void>> = {
    identite: () => save(["nom", "postnom", "prenom", "sexe", "date_naissance", "lieu_naissance", "etat_civil", "profession", "telephone", "email"], ["nom", "prenom", "sexe", "date_naissance", "lieu_naissance"]),
    adresse: () =>
      save(
        ["pays", "province", "district", "ville", "commune", "quartier", "localite", "adresse"],
        isRdc(draft.pays) ? (draft.province === "Kinshasa" ? ["province", "district", "commune", "adresse"] : ["province", "ville", "commune", "adresse"]) : ["pays", "ville", "adresse"],
      ),
    categorie: () => save(["categorie"], ["categorie"]),
    documents: () => (m.photo && m.piece ? next() : setError(!m.photo && !m.piece ? t("Ajoutez votre photo et votre pièce d'identité.") : !m.photo ? t("Ajoutez votre photo d'identité.") : t("Ajoutez votre pièce d'identité."))),
    engagement: async () => {
      const box = document.getElementById("mEngage") as HTMLInputElement | null;
      const honneurBox = document.getElementById("mHonneur") as HTMLInputElement | null;
      // Code d'honneur : à accepter s'il existe, sauf s'il l'a déjà été
      const needHonneur = !!o.codeHonneur && !m.honneur;
      if (m.engagement && !needHonneur) return next();
      if (!m.engagement && !box?.checked) {
        box?.focus();
        return setError(t("Cochez la case pour prendre l'engagement."));
      }
      if (needHonneur && !honneurBox?.checked) {
        honneurBox?.focus();
        return setError(t("Cochez la case pour accepter le code d'honneur."));
      }
      setBusy(true);
      const r = await memberApi("engagement", locale, { json: { accepte: true, honneur: needHonneur } });
      setBusy(false);
      if (!r.ok) return setError(r.message);
      setData(r.data);
      next();
    },
  };

  return (
    <MemberPanel title={t("Demande d'adhésion")} subtitle={o.intro}>
      <div id="adhesion" className="scroll-mt-32">
        {m.statut === "complement" && m.motif && (
          <div className="mb-6">
            <Notice tone="info" icon="fa-comment-dots"><strong>{t("Le parti vous demande de compléter votre demande")} :</strong> {m.motif}</Notice>
          </div>
        )}
        {(!online || waiting) && (
          <div className="mb-6" role="status">
            <Notice tone="warn" icon="fa-wifi">
              <strong>{online ? t("Envoi en attente") : t("Hors ligne")} :</strong> {online ? t("vos informations sont gardées sur cet appareil et seront envoyées dès que le serveur répondra.") : t("continuez à remplir votre demande. Ce que vous saisissez est gardé sur cet appareil et sera envoyé dès le retour de la connexion.")}
              {online && <button type="button" onClick={() => flush()} className="ml-2 font-bold text-ecideBlue underline">{t("Réessayer maintenant")}</button>}
            </Notice>
          </div>
        )}
        {restored && online && !waiting && (
          <div className="mb-6">
            <Notice tone="info" icon="fa-clock-rotate-left">{t("Vos dernières saisies, pas encore enregistrées, ont été retrouvées sur cet appareil.")}</Notice>
          </div>
        )}
        {header}
        <p className="eyebrow eyebrow--dark text-xs mb-2">{t("Étape :n sur :total", { n: index + 1, total: STEPS.length })}</p>
        <h2 ref={titleRef} tabIndex={-1} className="text-3xl text-ecideDarkBlue no-bar mb-6 focus:outline-none">{labels[step]}</h2>

        {/* Entrée valide l'étape, comme le bouton « Continuer » */}
        <form onSubmit={(e) => (e.preventDefault(), onNext[step]?.())} noValidate>
          {step === "identite" && <Identity draft={draft} set={set} etats={o.etatsCivils} errors={errors} />}
          {step === "adresse" && <Address draft={draft} set={set} geo={o.geo} errors={errors} />}
          {step === "categorie" && <Categories draft={draft} set={set} data={data} error={errors.categorie} />}
          {step === "documents" && <Documents data={data} setData={setData} />}
          {step === "engagement" && <Engagement data={data} onCheck={() => setError("")} />}

          {error && <p role="alert" className="mt-5 text-sm font-semibold text-red-600"><i className="fa-solid fa-circle-exclamation mr-1" aria-hidden="true"></i>{error}</p>}

          {step !== "paiement" && nav}
        </form>
        {step === "paiement" && <Payment data={data} setData={setData} ready={!missingSteps.length} submit={submit} />}
        {step === "paiement" && error && <p role="alert" className="mt-5 text-sm font-semibold text-red-600"><i className="fa-solid fa-circle-exclamation mr-1" aria-hidden="true"></i>{error}</p>}
        {step === "paiement" && <Submit data={data} busy={busy} submit={submit} back={() => go("engagement")} goTo={go} />}
      </div>
    </MemberPanel>
  );
}

/** Champ texte de la demande, relié à son erreur éventuelle. */
function textInput(draft: Draft, set: SetField, errors: Errors, k: keyof MemberProfile, props: Record<string, unknown> = {}) {
  return (
    <input id={`m_${k}`} value={draft[k] || ""} onChange={(e) => set(k, e.target.value)} aria-invalid={errors[k] ? true : undefined} aria-describedby={errors[k] ? `m_${k}-error` : undefined} className={`${INPUT} ${errors[k] ? "!border-red-500" : ""}`} {...props} />
  );
}

/** Date de naissance la plus récente acceptée (15 ans). */
const latestBirth = () => new Date(Date.now() - 15 * 365.25 * 864e5).toISOString().slice(0, 10);

/* ---------- Étape 1 : identité ---------- */
function Identity({ draft, set, etats, errors }: { draft: Draft; set: SetField; etats: Record<string, string>; errors: Errors }) {
  const { t } = useI18n();
  const [maxBirth] = useState(latestBirth);
  const input = (k: keyof MemberProfile, props: Record<string, unknown> = {}) => textInput(draft, set, errors, k, props);
  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <Field id="m_nom" label={t("Nom")} error={errors.nom}>{input("nom", { autoComplete: "family-name", autoCapitalize: "characters", required: true })}</Field>
      <Field id="m_postnom" label={t("Post-nom")} optional={t("facultatif")} error={errors.postnom}>{input("postnom", { autoComplete: "additional-name", autoCapitalize: "characters" })}</Field>
      <Field id="m_prenom" label={t("Prénom")} error={errors.prenom}>{input("prenom", { autoComplete: "given-name", autoCapitalize: "words", required: true })}</Field>
      <fieldset aria-describedby={errors.sexe ? "m_sexe-error" : undefined}>
        <legend className="block font-bold text-gray-700 mb-2 text-sm">{t("Sexe")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {[["F", t("Féminin")], ["M", t("Masculin")]].map(([v, l]) => (
            <label key={v} className={`flex items-center justify-center gap-2 p-3.5 border cursor-pointer font-semibold text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ecideBlue ${draft.sexe === v ? "bg-ecideDarkBlue text-white border-ecideDarkBlue member-choice-on" : `bg-gray-50 text-gray-700 ${errors.sexe ? "border-red-500" : "border-gray-200"}`}`}>
              <input type="radio" name="sexe" value={v} checked={draft.sexe === v} onChange={() => set("sexe", v)} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
        {errors.sexe && <p id="m_sexe-error" className="member-error text-xs font-semibold text-red-600 mt-1.5"><i className="fa-solid fa-circle-exclamation mr-1" aria-hidden="true"></i>{errors.sexe}</p>}
      </fieldset>
      <Field id="m_date_naissance" label={t("Date de naissance")} error={errors.date_naissance}>{input("date_naissance", { type: "date", autoComplete: "bday", min: "1900-01-01", max: maxBirth })}</Field>
      <Field id="m_lieu_naissance" label={t("Lieu de naissance")} error={errors.lieu_naissance}>{input("lieu_naissance", { autoCapitalize: "words" })}</Field>
      <Field id="m_etat_civil" label={t("État civil")} optional={t("facultatif")}>
        <select id="m_etat_civil" value={draft.etat_civil || ""} onChange={(e) => set("etat_civil", e.target.value)} className={INPUT}>
          <option value="">—</option>
          {Object.entries(etats).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}
        </select>
      </Field>
      <Field id="m_profession" label={t("Profession")} optional={t("facultatif")} error={errors.profession}>{input("profession", { autoComplete: "organization-title" })}</Field>
      <Field id="m_telephone" label={t("Téléphone")} help={t("Sert aussi à vous connecter et à recevoir les messages du parti.")} error={errors.telephone}>{input("telephone", { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "+243 81 000 0000" })}</Field>
      <Field id="m_email" label={t("E-mail")} optional={t("facultatif")} error={errors.email}>{input("email", { type: "email", inputMode: "email", autoComplete: "email", autoCapitalize: "none", spellCheck: false })}</Field>
    </div>
  );
}

/* ---------- Étape 2 : adresse ---------- */
function Address({ draft, set, geo, errors }: { draft: Draft; set: SetField; geo: MemberData["options"]["geo"]; errors: Errors }) {
  const { t } = useI18n();
  const rdc = isRdc(draft.pays);
  const known = rdc || geo.pays.includes(draft.pays || "");
  const [otherCountry, setOtherCountry] = useState(!known);
  const kin = draft.province === "Kinshasa";
  const communes = kin ? geo.kinshasa[draft.district || ""] || [] : [];
  const regions = geo.diasporaProvinces[draft.pays || ""] || [];
  const input = (k: keyof MemberProfile, props: Record<string, unknown> = {}) => textInput(draft, set, errors, k, props);
  const select = (k: keyof MemberProfile, props: Record<string, unknown>, children: ReactNode) => (
    <select id={`m_${k}`} value={draft[k] || ""} aria-invalid={errors[k] ? true : undefined} aria-describedby={errors[k] ? `m_${k}-error` : undefined} className={`${INPUT} ${errors[k] ? "!border-red-500" : ""}`} {...props}>
      {children}
    </select>
  );
  const changeCountry = (v: string) => {
    if (v === OTHER) {
      setOtherCountry(true);
      set("pays", "");
    } else {
      setOtherCountry(false);
      set("pays", v);
    }
    set("province", "");
    set("district", "");
    set("ville", "");
    set("commune", "");
  };
  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <Field id="m_pays" label={t("Pays de résidence")} className="sm:col-span-2" error={errors.pays}>
        <select id="m_pays" value={otherCountry ? OTHER : rdc ? geo.rdc : draft.pays} onChange={(e) => changeCountry(e.target.value)} autoComplete="country-name" className={INPUT}>
          <option value={geo.rdc}>{t("RD Congo")}</option>
          <optgroup label={t("Diaspora")}>
            {geo.pays.map((p) => <option key={p} value={p}>{t(p)}</option>)}
            <option value={OTHER}>{t("Autre pays…")}</option>
          </optgroup>
        </select>
        {otherCountry && <input aria-label={t("Pays")} value={draft.pays || ""} onChange={(e) => set("pays", e.target.value)} placeholder={t("Nom du pays")} className={`${INPUT} mt-2`} autoFocus />}
      </Field>
      {rdc ? (
        <>
          <Field id="m_province" label={t("Province")} error={errors.province}>
            {select(
              "province",
              { onChange: (e: { target: { value: string } }) => (set("province", e.target.value), set("district", ""), set("commune", ""), set("ville", e.target.value === "Kinshasa" ? "Kinshasa" : "")) },
              <>
                <option value="">{t("Choisir…")}</option>
                {geo.provinces.map((p) => <option key={p} value={p}>{p}</option>)}
              </>,
            )}
          </Field>
          {kin ? (
            <Field id="m_district" label={t("District")} error={errors.district}>
              {select(
                "district",
                { onChange: (e: { target: { value: string } }) => (set("district", e.target.value), set("commune", "")) },
                <>
                  <option value="">{t("Choisir…")}</option>
                  {Object.keys(geo.kinshasa).map((d) => <option key={d} value={d}>{d}</option>)}
                </>,
              )}
            </Field>
          ) : (
            <Field id="m_ville" label={t("Ville")} error={errors.ville}>{input("ville", { autoComplete: "address-level2" })}</Field>
          )}
          {kin ? (
            <Field id="m_commune" label={t("Commune")} error={errors.commune}>
              {select(
                "commune",
                { onChange: (e: { target: { value: string } }) => set("commune", e.target.value), disabled: !draft.district },
                <>
                  <option value="">{draft.district ? t("Choisir…") : t("Choisissez d'abord le district")}</option>
                  {communes.map((c) => <option key={c} value={c}>{c}</option>)}
                </>,
              )}
            </Field>
          ) : (
            <Field id="m_commune" label={t("Commune / Territoire")} error={errors.commune}>{input("commune")}</Field>
          )}
          <Field id="m_quartier" label={t("Quartier / Secteur / Chefferie")} optional={t("facultatif")}>{input("quartier")}</Field>
          <Field id="m_localite" label={t("Localité / Groupement")} optional={t("facultatif")}>{input("localite")}</Field>
        </>
      ) : (
        <>
          <Field id="m_province" label={t("Province, région ou État")} optional={t("facultatif")}>
            {input("province", { list: "m_regions", autoComplete: "address-level1" })}
            <datalist id="m_regions">{regions.map((r) => <option key={r} value={r} />)}</datalist>
          </Field>
          <Field id="m_ville" label={t("Ville")} error={errors.ville}>{input("ville", { autoComplete: "address-level2" })}</Field>
          <Field id="m_commune" label={t("Commune ou quartier")} optional={t("facultatif")}>{input("commune")}</Field>
        </>
      )}
      <Field id="m_adresse" label={t("Avenue, rue et numéro")} className="sm:col-span-2" error={errors.adresse}>{input("adresse", { autoComplete: "street-address" })}</Field>
      <p className="sm:col-span-2 text-xs text-gray-500"><i className="fa-solid fa-lock mr-1" aria-hidden="true"></i>{t("Votre adresse sert à vous rattacher à votre section ou à votre fédération. Elle n'est jamais publiée.")}</p>
    </div>
  );
}

/* ---------- Étape 3 : catégorie ---------- */
function Categories({ draft, set, data, error }: { draft: Draft; set: SetField; data: MemberData; error?: string }) {
  const { t, locale } = useI18n();
  const list = categoriesFor(data, data.membre.pays);
  if (!list.length) return <Notice tone="warn">{t("Aucune catégorie n'est ouverte pour le moment. Revenez plus tard.")}</Notice>;
  return (
    <fieldset className="grid sm:grid-cols-2 gap-4" aria-describedby={error ? "m_categorie-error" : undefined}>
      <legend className="sr-only">{t("Catégorie de membre")}</legend>
      {list.length === 1 && <p className="sm:col-span-2 text-sm text-gray-600">{t("Une seule catégorie correspond à votre lieu de résidence : elle est déjà choisie.")}</p>}
      {list.map((c) => {
        const on = draft.categorie === c.id;
        return (
          <label key={c.id} className={`relative p-5 border-2 cursor-pointer transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ecideBlue ${on ? "border-ecideDarkBlue bg-ecideBlue-50" : error ? "border-red-500" : "border-gray-200 hover:border-ecideBlue"}`}>
            <input type="radio" name="categorie" value={c.id} checked={on} onChange={() => set("categorie", c.id)} className="sr-only" />
            <span className="flex items-start justify-between gap-3">
              <span className="font-bold text-ecideDarkBlue text-lg leading-tight">{c.libelle}</span>
              <i className={`fa-solid ${on ? "fa-circle-check text-ecideDarkBlue" : "fa-circle text-gray-200"} text-xl`} aria-hidden="true"></i>
            </span>
            {c.description && <span className="block text-sm text-gray-600 mt-2">{c.description}</span>}
            <span className="block mt-4 font-display text-2xl text-ecideDarkBlue">
              {amountLabel(c.usd, "USD", locale)} <span className="text-sm font-sans text-gray-500">· {amountLabel(c.cdf, "CDF", locale)}</span>
            </span>
          </label>
        );
      })}
      {error && <p id="m_categorie-error" className="member-error sm:col-span-2 text-xs font-semibold text-red-600"><i className="fa-solid fa-circle-exclamation mr-1" aria-hidden="true"></i>{error}</p>}
    </fieldset>
  );
}

/* ---------- Étape 4 : documents ---------- */
function Documents({ data, setData }: { data: MemberData; setData: (d: MemberData) => void }) {
  const { t } = useI18n();
  const m = data.membre;
  return (
    <div className="space-y-6">
      <Upload type="photo" label={t("Photo d'identité")} help={t("Une photo récente de votre visage, de face, sur fond clair.")} present={m.photo} accept="image/jpeg,image/png,image/webp" data={data} setData={setData} />
      <Upload type="piece" label={t("Pièce d'identité ou carte d'électeur")} help={t("Photo nette ou PDF de la pièce : toutes les informations doivent être lisibles.")} present={m.piece} pdf={m.pieceType === "pdf"} accept="image/jpeg,image/png,image/webp,application/pdf" data={data} setData={setData} />
      <p className="text-xs text-gray-500"><i className="fa-solid fa-lock mr-1" aria-hidden="true"></i>{t("Vos documents ne sont vus que par les responsables qui vérifient les adhésions. Ils ne sont jamais publiés.")}</p>
    </div>
  );
}

function Upload({ type, label, help, present, pdf, accept, data, setData }: { type: "photo" | "piece"; label: string; help: string; present: boolean; pdf?: boolean; accept: string; data: MemberData; setData: (d: MemberData) => void }) {
  const { t, locale } = useI18n();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(() => Date.now());
  const max = data.options.documentMaxMo;
  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > max * 1024 * 1024) return showToast(t("Le fichier dépasse :max Mo.", { max }), "error");
    const form = new FormData();
    form.append("fichier", file);
    setBusy(true);
    const r = await memberApi(`documents/${type}`, locale, { form });
    setBusy(false);
    if (ref.current) ref.current.value = "";
    if (!r.ok) return showToast(r.message || t("Envoi impossible. Réessayez."), "error");
    setVersion(Date.now());
    setData(r.data);
  }
  return (
    <div>
      <p className="font-bold text-gray-700 mb-2 text-sm">{label}</p>
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} className={`w-full flex items-center gap-4 p-4 border-2 border-dashed text-left transition ${present ? "border-ecideGreen bg-ecideGreen-50/50" : "border-gray-300 hover:border-ecideBlue"}`}>
        <span className="w-20 h-20 shrink-0 bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
          {busy ? (
            <i className="fa-solid fa-spinner fa-spin text-2xl text-ecideBlue" aria-hidden="true"></i>
          ) : present && !pdf ? (
            <img src={memberFile(`documents/${type}`, version)} alt="" className="w-full h-full object-cover" />
          ) : (
            <i className={`fa-solid ${pdf ? "fa-file-pdf" : type === "photo" ? "fa-user" : "fa-id-card"} text-3xl text-gray-300`} aria-hidden="true"></i>
          )}
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-gray-900">{present ? (type === "photo" ? t("Photo ajoutée") : t("Pièce ajoutée")) : t("Ajouter un fichier")}</span>
          <span className="block text-xs text-gray-500 mt-1">{present ? t("Touchez pour remplacer") : help}</span>
        </span>
        <i className={`fa-solid ${present ? "fa-circle-check text-ecideGreen" : "fa-arrow-up-from-bracket text-ecideBlue"} text-xl ml-auto`} aria-hidden="true"></i>
      </button>
      <input ref={ref} type="file" accept={accept} capture={type === "photo" ? "user" : undefined} className="sr-only" aria-label={label} onChange={(e) => upload(e.target.files?.[0])} />
    </div>
  );
}

/* ---------- Étape 5 : engagement ---------- */
function Engagement({ data, onCheck }: { data: MemberData; onCheck: () => void }) {
  const { t } = useI18n();
  const m = data.membre;
  return (
    <div className="space-y-5">
      <blockquote className="bg-ecideBlue-50 border-l-4 border-ecideDarkBlue p-5 text-gray-800 leading-relaxed">{data.options.engagement}</blockquote>
      <label className="flex items-start gap-3 p-4 border border-gray-200 cursor-pointer">
        <input id="mEngage" type="checkbox" defaultChecked={m.engagement} disabled={m.engagement} onChange={onCheck} className="w-5 h-5 mt-0.5 shrink-0" />
        <span className="text-sm text-gray-700">
          <strong>{t("Je prends cet engagement.")}</strong> {t("J'atteste aussi que les informations de ma demande sont exactes.")}
        </span>
      </label>
      {/* Code d'honneur rédigé par l'administration : texte officiel en français, à accepter */}
      {data.options.codeHonneur && (
        <>
          <section aria-labelledby="mHonneurTitre" className="space-y-3 pt-2">
            <h3 id="mHonneurTitre" className="text-xl text-ecideDarkBlue">{data.options.codeHonneur.titre}</h3>
            <div tabIndex={0} className="max-h-72 overflow-y-auto border border-gray-200 bg-white p-5 text-gray-800 leading-relaxed whitespace-pre-line focus:outline-2 focus:outline-ecideBlue">
              {data.options.codeHonneur.texte}
            </div>
          </section>
          <label className="flex items-start gap-3 p-4 border border-gray-200 cursor-pointer">
            <input id="mHonneur" type="checkbox" defaultChecked={m.honneur} disabled={m.honneur} onChange={onCheck} className="w-5 h-5 mt-0.5 shrink-0" />
            <span className="text-sm text-gray-700">
              <strong>{t("J'ai lu le code d'honneur et je m'engage à le respecter.")}</strong>
            </span>
          </label>
        </>
      )}
    </div>
  );
}

/* ---------- Étape 6 : paiement ---------- */
function Payment({ data, setData, ready, submit }: { data: MemberData; setData: (d: MemberData) => void; ready: boolean; submit: () => Promise<void> }) {
  const { t, locale } = useI18n();
  const o = data.options;
  const m = data.membre;
  const cat = o.categories.find((c) => c.id === m.categorie);
  // Devise et moyen d'un essai précédent (paiement annulé ou en attente), sinon les premiers proposés
  const last = data.paiements[0];
  const [devise, setDevise] = useState<"USD" | "CDF">(last?.devise || "USD");
  const [moyen, setMoyen] = useState(o.moyens.some((x) => x.key === last?.moyen) ? last!.moyen : o.moyens[0]?.key || "");
  const [tel, setTel] = useState(m.telephone || "");
  const [busy, setBusy] = useState(false);
  const [instructions, setInstructions] = useState<string[]>([]);
  const mobile = o.moyens.find((x) => x.key === moyen)?.mobile;
  // Paiements du plus récent au plus ancien : le dernier en attente est celui de la catégorie choisie
  const pending = !data.adhesionPayee ? data.paiements.find((p) => p.statut === "en_attente") || null : null;

  async function pay(e?: FormEvent) {
    e?.preventDefault();
    if (!cat) return;
    if (mobile && !tel.trim()) {
      document.getElementById("m_paytel")?.focus();
      return showToast(t("Indiquez le numéro Mobile Money qui paie."), "error");
    }
    setBusy(true);
    const r = await memberApi("paiement", locale, { json: { moyen, devise, telephone: mobile ? tel : null } });
    if (!r.ok) {
      setBusy(false);
      return showToast(r.message || t("Paiement impossible. Réessayez."), "error");
    }
    if (o.demo && r.data.paiement) {
      // Démonstration : le paiement simulé aboutit aussitôt
      await new Promise((res) => setTimeout(res, 900));
      const s = await memberApi(`paiement/${r.data.paiement.reference}/simuler`, locale, { json: {} });
      if (!s.ok) {
        setBusy(false);
        return showToast(s.message, "error");
      }
      setData(s.data);
      // Demande complète : le paiement réussi la transmet aussitôt (un geste de moins)
      if (ready) await submit();
      else showToast(t("Paiement reçu."));
      return setBusy(false);
    }
    setBusy(false);
    setInstructions(r.data.instructions || []);
    setData(r.data);
  }

  if (!cat) return <Notice tone="warn">{t("Choisissez d'abord votre catégorie de membre.")}</Notice>;
  if (data.adhesionPayee) {
    const paid = data.paiements.find((p) => p.statut === "reussi");
    return (
      <Notice tone="success">
        <strong>{t("Adhésion réglée")}</strong> · {paid?.montantLibelle} · {paid?.moyenLibelle} · <span className="font-mono break-all">{paid?.reference}</span>
      </Notice>
    );
  }
  const amount = amountLabel(devise === "USD" ? cat.usd : cat.cdf, devise, locale);
  return (
    <form onSubmit={pay} className="space-y-6" noValidate>
      <div className="bg-ecideDarkBlue text-white p-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-blue-100 text-sm">{cat.libelle}</p>
          <p className="font-display text-4xl sm:text-5xl leading-none mt-1 break-words">{amount}</p>
        </div>
        <p className="text-xs text-blue-100">{t("Adhésion annuelle")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("Devise")}>
        {([["USD", t("Dollars ($)")], ["CDF", t("Francs congolais (FC)")]] as const).map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={devise === k} onClick={() => setDevise(k)} className={`p-3.5 border font-semibold text-sm ${devise === k ? "bg-ecideDarkBlue text-white border-ecideDarkBlue member-choice-on" : "bg-white border-gray-200 text-gray-700"}`}>{l}</button>
        ))}
      </div>
      <div>
        <p className="font-bold text-gray-700 mb-2 text-sm">{t("Moyen de paiement")}</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("Moyen de paiement")}>
          {o.moyens.map((x) => (
            <button key={x.key} type="button" role="radio" aria-checked={moyen === x.key} onClick={() => setMoyen(x.key)} className={`p-3.5 border font-semibold text-sm ${moyen === x.key ? "bg-ecideDarkBlue text-white border-ecideDarkBlue member-choice-on" : "bg-white border-gray-200 text-gray-700 hover:border-ecideBlue"}`}>{x.libelle}</button>
          ))}
        </div>
      </div>
      {mobile && (
        <Field id="m_paytel" label={t("Numéro Mobile Money qui paie")} help={tel && tel === m.telephone ? t("Votre numéro de connexion ; modifiez-le si un autre numéro paie.") : undefined}>
          <input id="m_paytel" type="tel" inputMode="tel" autoComplete="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="+243 81 000 0000" className={INPUT} />
        </Field>
      )}
      {o.demo ? (
        <Notice tone="warn">{t("Paiement simulé : aucune somme n'est prélevée et aucune coordonnée bancaire n'est demandée.")}</Notice>
      ) : pending ? (
        <Notice tone="info">
          <p className="font-bold mb-1">{t("Paiement en attente")} · {pending.montantLibelle} · <span className="font-mono break-all">{pending.reference}</span></p>
          {instructions.length > 0 && <ul className="list-disc pl-5 space-y-1">{instructions.map((i) => <li key={i}>{i}</li>)}</ul>}
          <p className="mt-1">{t("Une fois le paiement effectué, transmettez votre demande : la Trésorerie confirme la réception lors de la vérification de votre dossier.")}</p>
        </Notice>
      ) : null}
      {(o.demo || !pending) && (
        <button type="submit" disabled={busy || !moyen} className="btn btn--primary btn--lg w-full disabled:opacity-60">
          {busy ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> : <i className="fa-solid fa-lock" aria-hidden="true"></i>}
          {o.demo ? (ready ? t("Simuler le paiement et transmettre") : t("Simuler le paiement")) : t("Payer :montant", { montant: amount })}
        </button>
      )}
    </form>
  );
}

/* ---------- Transmission de la demande ---------- */
function Submit({ data, busy, submit, back, goTo }: { data: MemberData; busy: boolean; submit: () => Promise<void>; back: () => void; goTo: (s: Step) => void }) {
  const { t } = useI18n();
  const m = data.membre;
  const missing = useMemo(() => STEPS.filter((s) => s !== "paiement" && m.manque[s]), [m.manque]);
  const pendingPayment = !data.adhesionPayee && data.paiements.some((p) => p.statut === "en_attente") && !data.options.demo;
  const ready = !missing.length && (data.adhesionPayee || pendingPayment);
  const labels: Record<Step, string> = { identite: t("Identité"), adresse: t("Adresse"), categorie: t("Catégorie"), documents: t("Documents"), engagement: t("Engagement"), paiement: t("Paiement") };

  return (
    <div className="space-y-4 pt-6">
      {missing.length > 0 && (
        <Notice tone="warn">
          {t("Il reste à compléter")} :{" "}
          {missing.map((s, i) => (
            <span key={s}>
              {i > 0 && ", "}
              <button type="button" onClick={() => goTo(s)} className="font-bold underline">{labels[s]}</button>
            </span>
          ))}
          .
        </Notice>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={back} className="btn btn--outline">{t("Retour")}</button>
        {/* Bouton de transmission seulement quand il sert : adhésion réglée ou paiement déclaré */}
        {(ready || missing.length > 0) && (
          <button type="button" onClick={submit} disabled={busy || !ready} className="btn btn--dark btn--lg flex-1 min-w-0 disabled:opacity-50">
            {busy ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> : <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>}
            {t("Transmettre ma demande")}
          </button>
        )}
      </div>
    </div>
  );
}
