"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { isRdc, memberApi, memberFile, type EventReport, type EventReportOptions, type MemberData } from "@/lib/member";
import { showToast } from "@/lib/toast";
import { useOnline } from "../OfflineSupport";
import { clearReportDraft, readReportDraft, writeReportDraft } from "./offlineDraft";
import { prepareUpload, uploadLimitMo } from "@/lib/upload";
import { Field, INPUT, MemberCardBox, Notice } from "./ui";

/** Champs du formulaire, tous en texte (comme dans les champs de saisie), sauf les types d'incident. */
interface Fields {
  titre: string;
  type: string;
  lieu_nom: string;
  lieu_adresse: string;
  pays: string;
  province: string;
  ville: string;
  commune: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  participants: string;
  recit: string;
  incidents: "" | "oui" | "non";
  incident_types: string[];
  incident_description: string;
  blesses: string;
  deces: string;
  arrestations: string;
}

type Errors = Partial<Record<keyof Fields | "fichier", string>>;
type TextKey = Exclude<keyof Fields, "incident_types" | "incidents">;

const OTHER = "__autre__";
const COUNTS = ["blesses", "deces", "arrestations"] as const;

/** Date du jour sur l'appareil (AAAA-MM-JJ), pour borner le calendrier. */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function fromReport(r: EventReport): Fields {
  const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  return {
    titre: r.titre, type: r.type, lieu_nom: r.lieu_nom, lieu_adresse: s(r.lieu_adresse), pays: r.pays, province: s(r.province), ville: s(r.ville), commune: s(r.commune),
    date: r.date, heure_debut: r.heure_debut, heure_fin: s(r.heure_fin), participants: s(r.participants), recit: s(r.recit),
    incidents: r.incidents ? "oui" : "non", incident_types: r.incident_types || [], incident_description: s(r.incident_description),
    blesses: r.incidents ? s(r.blesses) : "", deces: r.incidents ? s(r.deces) : "", arrestations: r.incidents ? s(r.arrestations) : "",
  };
}

/** Nouveau rapport : lieu prérempli avec la résidence du membre, date du jour. */
function blank(m: MemberData["membre"], rdcLabel: string): Fields {
  const rdc = isRdc(m.pays);
  return {
    titre: "", type: "", lieu_nom: "", lieu_adresse: "", pays: rdc ? rdcLabel : m.pays || "", province: m.province || "", ville: m.ville || (m.province === "Kinshasa" ? "Kinshasa" : ""), commune: m.commune || "",
    date: today(), heure_debut: "", heure_fin: "", participants: "", recit: "", incidents: "", incident_types: [], incident_description: "", blesses: "", deces: "", arrestations: "",
  };
}

/** Brouillon relu de l'appareil : seules les clés connues, du bon type. */
function merge(base: Fields, kept: Record<string, unknown> | undefined): Fields {
  if (!kept) return base;
  const out = { ...base };
  (Object.keys(base) as (keyof Fields)[]).forEach((k) => {
    const v = kept[k];
    if (k === "incident_types") out.incident_types = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : base.incident_types;
    else if (typeof v === "string") (out as Record<string, unknown>)[k] = v;
  });
  return out;
}

function payload(f: Fields) {
  const n = (v: string) => (v.trim() === "" ? null : Number(v));
  const incidents = f.incidents === "oui";
  return {
    titre: f.titre.trim(), type: f.type, lieu_nom: f.lieu_nom.trim(), lieu_adresse: f.lieu_adresse.trim() || null,
    pays: f.pays.trim(), province: f.province.trim() || null, ville: f.ville.trim(), commune: f.commune.trim() || null,
    date: f.date, heure_debut: f.heure_debut, heure_fin: f.heure_fin || null, participants: n(f.participants), recit: f.recit.trim() || null,
    incidents, incident_types: incidents ? f.incident_types : [], incident_description: incidents ? f.incident_description.trim() || null : null,
    blesses: incidents ? n(f.blesses) ?? 0 : 0, deces: incidents ? n(f.deces) ?? 0 : 0, arrestations: incidents ? n(f.arrestations) ?? 0 : 0,
  };
}

const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);
const extOf = (name: string) => (name.split(".").pop() || "").toLowerCase();

/**
 * Formulaire d'un rapport d'activité (nouveau, en cours de modification ou en lecture seule une
 * fois examiné). Connexion intermittente : la saisie est gardée sur l'appareil à chaque frappe ;
 * hors ligne, l'envoi attend le retour de la connexion. Les listes de présence (fichiers) ne
 * peuvent être ni gardées sur l'appareil ni envoyées hors ligne : le membre les ajoute ensuite.
 */
export default function MemberReportForm({ data, report, options, onSaved, onCancel }: { data: MemberData; report: EventReport | null; options: EventReportOptions; onSaved: (r: EventReport, message: string, stay: boolean) => void; onCancel: () => void }) {
  const { t, locale } = useI18n();
  const m = data.membre;
  const geo = data.options.geo;
  // Taille maximale d'une liste de présence : celle du serveur, plafonnée à celle du relais (lib/upload)
  const maxMo = uploadLimitMo(options.fichierMaxMo);
  const key = report ? report.id : ("nouveau" as const);
  const readOnly = !!report && !report.modifiable;
  const online = useOnline();

  const [kept] = useState(() => (readOnly ? null : readReportDraft(m.id, key)));
  const [f, setF] = useState<Fields>(() => merge(report ? fromReport(report) : blank(m, geo.rdc), kept?.champs));
  const [restored, setRestored] = useState(!!kept);
  const [waiting, setWaiting] = useState(!!kept?.enAttente);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState(report?.fichiers || []);
  const [queue, setQueue] = useState<File[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [otherCountry, setOtherCountry] = useState(() => !isRdc(f.pays) && !geo.pays.includes(f.pays));
  const [dirty, setDirty] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => {
    setDirty(true);
    setF((d) => ({ ...d, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  // Chaque modification est gardée sur l'appareil (avec l'envoi en attente, s'il y en a un)
  useEffect(() => {
    if (!readOnly && dirty) writeReportDraft(m.id, key, f as unknown as Record<string, unknown>, waiting);
  }, [f, waiting, m.id, key, readOnly, dirty]);

  const rdc = isRdc(f.pays);
  const kin = rdc && f.province === "Kinshasa";
  const maxDate = rdc ? today() : undefined;
  const total = files.length + queue.length;

  function validate(): Errors {
    const e: Errors = {};
    if (!f.titre.trim()) e.titre = t("Donnez un titre à l'événement.");
    if (!f.type) e.type = t("Choisissez le type d'événement.");
    if (!f.lieu_nom.trim()) e.lieu_nom = t("Indiquez le nom du lieu.");
    if (!rdc && !f.pays.trim()) e.pays = t("Indiquez le pays.");
    if (rdc && !f.province) e.province = t("Choisissez la province.");
    if (!f.ville.trim()) e.ville = t("Indiquez la ville.");
    if (!f.date) e.date = t("Indiquez la date de l'événement.");
    else if (rdc && f.date > today()) e.date = t("La date ne peut pas être dans le futur.");
    if (!f.heure_debut) e.heure_debut = t("Indiquez l'heure de début.");
    const bad = (v: string) => v.trim() !== "" && !(/^\d+$/.test(v.trim()));
    if (bad(f.participants)) e.participants = t("Indiquez un nombre entier, 0 ou plus.");
    if (f.incidents === "") e.incidents = t("Indiquez s'il y a eu des incidents.");
    if (f.incidents === "oui") {
      if (!f.incident_types.length) e.incident_types = t("Indiquez le type d'incident.");
      COUNTS.forEach((k) => bad(f[k]) && (e[k] = t("Indiquez un nombre entier, 0 ou plus.")));
    }
    return e;
  }

  /** Listes de présence choisies pour un nouveau rapport : envoyées une à une après sa création. */
  async function sendQueue(id: number): Promise<{ last: EventReport | null; failed: string[] }> {
    let last: EventReport | null = null;
    const failed: string[] = [];
    for (const file of queue) {
      setUploading(file.name);
      const form = new FormData();
      form.append("fichier", file);
      const r = await memberApi<{ rapport: EventReport }>(`rapports/${id}/fichiers`, locale, { form });
      if (r.ok) last = r.data.rapport;
      else failed.push(file.name);
    }
    setUploading(null);
    setQueue([]);
    return { last, failed };
  }

  async function submit() {
    if (readOnly || busy) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      // Premier champ en défaut : visible et prêt à corriger
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    if (!online) {
      setWaiting(true);
      writeReportDraft(m.id, key, f as unknown as Record<string, unknown>, true);
      return;
    }
    setBusy(true);
    const r = await memberApi<{ rapport: EventReport }>(report ? `rapports/${report.id}` : "rapports", locale, { method: report ? "PUT" : "POST", json: payload(f) });
    if (!r.ok) {
      setBusy(false);
      if (r.status === 0) {
        // Réseau coupé pendant l'envoi : la saisie est gardée, nouvel essai au retour de la connexion
        setWaiting(true);
        writeReportDraft(m.id, key, f as unknown as Record<string, unknown>, true);
        return;
      }
      setWaiting(false);
      const server: Errors = {};
      Object.entries(r.data.errors || {}).forEach(([k, v]) => (server[k.split(".")[0] as keyof Errors] = v[0]));
      setErrors(server);
      showToast(r.message || t("Le rapport n'a pas pu être enregistré."), "error");
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    clearReportDraft(m.id, key);
    setDirty(false);
    setWaiting(false);
    let saved = r.data.rapport;
    let failed: string[] = [];
    if (!report && queue.length) {
      const sent = await sendQueue(saved.id);
      saved = sent.last || saved;
      failed = sent.failed;
    }
    setBusy(false);
    if (failed.length) {
      onSaved(saved, t("Rapport envoyé, mais ces fichiers n'ont pas pu être joints : :fichiers. Ajoutez-les de nouveau.", { fichiers: failed.join(", ") }), true);
    } else onSaved(saved, report ? t("Rapport mis à jour.") : t("Rapport envoyé au parti."), false);
  }

  // Retour de la connexion (ou page rouverte avec un envoi en attente) : l'envoi part tout seul,
  // une fois ; un serveur injoignable ne relance pas d'essais en boucle (bouton « Réessayer »)
  const submitRef = useRef(submit);
  const waitingRef = useRef(waiting);
  useEffect(() => {
    submitRef.current = submit;
    waitingRef.current = waiting;
  });
  useEffect(() => {
    if (online && waitingRef.current) submitRef.current();
  }, [online]);

  async function pick(list: FileList | null) {
    if (!list?.length) return;
    const picked = [...list];
    if (fileInput.current) fileInput.current.value = "";
    for (const file of picked) {
      if (!options.formats.includes(extOf(file.name))) return setErrors((e) => ({ ...e, fichier: t("Formats acceptés : PDF, photo (JPG, PNG, WebP, HEIC), CSV ou XLSX.") }));
    }
    // Photos de listes papier réduites avant l'envoi ; limite plafonnée à celle du relais (lib/upload)
    const chosen = await Promise.all(picked.map(prepareUpload));
    for (const file of chosen) {
      if (file.size > maxMo * 1048576) return setErrors((e) => ({ ...e, fichier: t("Le fichier dépasse :max Mo.", { max: maxMo }) }));
    }
    if (total + chosen.length > options.fichiersMax) return setErrors((e) => ({ ...e, fichier: t("Au plus :n fichiers par rapport.", { n: options.fichiersMax }) }));
    setErrors((e) => ({ ...e, fichier: undefined }));
    if (!report) return setQueue((q) => [...q, ...chosen]);
    // Rapport déjà enregistré : chaque fichier part tout de suite
    (async () => {
      for (const file of chosen) {
        setUploading(file.name);
        const form = new FormData();
        form.append("fichier", file);
        const r = await memberApi<{ rapport: EventReport }>(`rapports/${report.id}/fichiers`, locale, { form });
        if (r.ok) {
          setFiles(r.data.rapport.fichiers);
          showToast(t("Liste de présence ajoutée."));
        } else {
          setErrors((e) => ({ ...e, fichier: r.status === 0 ? t("Envoi impossible sans connexion. Réessayez dès le retour du réseau.") : r.message || t("Le fichier n'a pas pu être envoyé.") }));
          break;
        }
      }
      setUploading(null);
    })();
  }

  async function removeFile(id: number) {
    if (!report) return;
    const r = await memberApi<{ rapport: EventReport }>(`rapports/${report.id}/fichiers/${id}`, locale, { method: "DELETE" });
    if (r.ok) {
      setFiles(r.data.rapport.fichiers);
      showToast(t("Fichier retiré."));
    } else showToast(r.message || t("Le fichier n'a pas pu être retiré."), "error");
  }

  /* ---------- Champs ---------- */
  const describedBy = (k: keyof Errors) => (errors[k] ? `r_${k}-error` : undefined);
  const text = (k: TextKey, props: Record<string, unknown> = {}) => (
    <input id={`r_${k}`} value={f[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={errors[k] ? true : undefined} aria-describedby={describedBy(k)} className={`${INPUT} ${errors[k] ? "!border-red-500" : ""}`} {...props} />
  );
  const count = (k: TextKey) => text(k, { type: "number", inputMode: "numeric", min: 0, step: 1, placeholder: "0" });
  const section = (title: string, icon: string, children: ReactNode, extra = "") => (
    <MemberCardBox className={`space-y-5 ${extra}`}>
      <h2 className="text-xl font-bold text-ecideDarkBlue no-bar member-title flex items-center gap-2"><i className={`fa-solid ${icon} text-ecideBlue text-base`} aria-hidden="true"></i>{title}</h2>
      {children}
    </MemberCardBox>
  );

  const changeCountry = (v: string) => {
    setOtherCountry(v === OTHER);
    set("pays", v === OTHER ? "" : v);
    set("province", "");
    set("ville", "");
    set("commune", "");
  };

  return (
    <form ref={formRef} noValidate onSubmit={(e) => (e.preventDefault(), submit())} className="space-y-5">
      {readOnly && (
        <Notice tone="info" icon="fa-lock">
          {report?.examineLe ? t("Ce rapport a été examiné par le parti le :date : il ne peut plus être modifié.", { date: new Date(report.examineLe).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) }) : t("Ce rapport a été examiné par le parti : il ne peut plus être modifié.")}
        </Notice>
      )}
      {!readOnly && (!online || waiting) && (
        <Notice tone="warn" icon="fa-wifi">
          <strong>{online ? t("Envoi en attente") : t("Hors ligne")} :</strong>{" "}
          {waiting ? t("votre rapport est gardé sur cet appareil et sera envoyé dès le retour de la connexion.") : t("continuez à remplir votre rapport. Ce que vous saisissez est gardé sur cet appareil ; envoyez-le dès le retour de la connexion.")}
          {online && waiting && <button type="button" onClick={() => submit()} className="ml-2 font-bold text-ecideBlue underline">{t("Réessayer maintenant")}</button>}
        </Notice>
      )}
      {!readOnly && restored && online && !waiting && (
        <Notice tone="info" icon="fa-clock-rotate-left">
          {t("Votre saisie précédente a été retrouvée sur cet appareil.")}{" "}
          <button
            type="button"
            className="font-bold text-ecideBlue underline"
            onClick={() => {
              clearReportDraft(m.id, key);
              setDirty(false);
              setF(report ? fromReport(report) : blank(m, geo.rdc));
              setRestored(false);
            }}
          >
            {report ? t("Revenir au rapport enregistré") : t("Effacer et recommencer")}
          </button>
        </Notice>
      )}

      <fieldset disabled={readOnly || busy} className="space-y-5 min-w-0">
        {section(t("L'événement"), "fa-flag", (
          <div className="grid sm:grid-cols-2 gap-5">
            <Field id="r_titre" label={t("Titre")} className="sm:col-span-2" error={errors.titre}>{text("titre", { maxLength: 190, placeholder: t("Meeting de la section de Limete") })}</Field>
            <Field id="r_type" label={t("Type d'événement")} error={errors.type}>
              <select id="r_type" value={f.type} onChange={(e) => set("type", e.target.value)} aria-invalid={errors.type ? true : undefined} aria-describedby={describedBy("type")} className={`${INPUT} ${errors.type ? "!border-red-500" : ""}`}>
                <option value="">{t("Choisir…")}</option>
                {Object.entries(options.types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field id="r_participants" label={t("Nombre estimé de participants")} optional={t("facultatif")} error={errors.participants}>{count("participants")}</Field>
            <Field id="r_date" label={t("Date")} error={errors.date}>{text("date", { type: "date", max: maxDate })}</Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="r_heure_debut" label={t("Début")} error={errors.heure_debut}>{text("heure_debut", { type: "time" })}</Field>
              <Field id="r_heure_fin" label={t("Fin")} optional={t("facultatif")}>{text("heure_fin", { type: "time" })}</Field>
            </div>
            <Field id="r_recit" label={t("Déroulement de l'événement")} optional={t("facultatif")} className="sm:col-span-2" help={t("Ce qui s'est passé, les intervenants, les messages portés, l'accueil de la population…")}>
              <textarea id="r_recit" rows={5} maxLength={20000} value={f.recit} onChange={(e) => set("recit", e.target.value)} className={INPUT} />
            </Field>
          </div>
        ))}

        {section(t("Lieu"), "fa-location-dot", (
          <div className="grid sm:grid-cols-2 gap-5">
            <Field id="r_lieu_nom" label={t("Nom du lieu")} error={errors.lieu_nom}>{text("lieu_nom", { maxLength: 190, placeholder: t("Place, salle, école, terrain…") })}</Field>
            <Field id="r_lieu_adresse" label={t("Adresse")} optional={t("facultatif")}>{text("lieu_adresse", { maxLength: 255, autoComplete: "off" })}</Field>
            <Field id="r_pays" label={t("Pays")} className="sm:col-span-2" error={errors.pays}>
              <select id="r_pays" value={otherCountry ? OTHER : rdc ? geo.rdc : f.pays} onChange={(e) => changeCountry(e.target.value)} className={INPUT}>
                <option value={geo.rdc}>{t("RD Congo")}</option>
                <optgroup label={t("Diaspora")}>
                  {geo.pays.map((p) => <option key={p} value={p}>{t(p)}</option>)}
                  <option value={OTHER}>{t("Autre pays…")}</option>
                </optgroup>
              </select>
              {otherCountry && <input aria-label={t("Pays")} value={f.pays} onChange={(e) => set("pays", e.target.value)} placeholder={t("Nom du pays")} aria-invalid={errors.pays ? true : undefined} className={`${INPUT} mt-2`} />}
            </Field>
            {rdc ? (
              <>
                <Field id="r_province" label={t("Province")} error={errors.province}>
                  <select
                    id="r_province"
                    value={f.province}
                    onChange={(e) => (set("province", e.target.value), set("commune", ""), set("ville", e.target.value === "Kinshasa" ? "Kinshasa" : ""))}
                    aria-invalid={errors.province ? true : undefined}
                    aria-describedby={describedBy("province")}
                    className={`${INPUT} ${errors.province ? "!border-red-500" : ""}`}
                  >
                    <option value="">{t("Choisir…")}</option>
                    {geo.provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                <Field id="r_ville" label={t("Ville")} error={errors.ville}>{text("ville", { maxLength: 120 })}</Field>
                <Field id="r_commune" label={kin ? t("Commune") : t("Commune / Territoire")} optional={t("facultatif")} className="sm:col-span-2">
                  {kin ? (
                    <select id="r_commune" value={f.commune} onChange={(e) => set("commune", e.target.value)} className={INPUT}>
                      <option value="">{t("Choisir…")}</option>
                      {Object.entries(geo.kinshasa).map(([district, communes]) => (
                        <optgroup key={district} label={district}>{communes.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
                      ))}
                    </select>
                  ) : (
                    text("commune", { maxLength: 120 })
                  )}
                </Field>
              </>
            ) : (
              <>
                <Field id="r_ville" label={t("Ville")} error={errors.ville}>
                  {text("ville", { maxLength: 120, list: "r_regions" })}
                  <datalist id="r_regions">{(geo.diasporaProvinces[f.pays] || []).map((r) => <option key={r} value={r} />)}</datalist>
                </Field>
                <Field id="r_commune" label={t("Commune ou quartier")} optional={t("facultatif")}>{text("commune", { maxLength: 120 })}</Field>
              </>
            )}
          </div>
        ))}

        {section(t("Incidents"), "fa-triangle-exclamation", (
          <>
            <fieldset>
              <legend className="block font-bold text-gray-700 mb-2 text-sm">{t("Y a-t-il eu des incidents ?")}</legend>
              <div className="grid grid-cols-2 gap-3 max-w-md" id="r_incidents">
                {(["non", "oui"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set("incidents", v)}
                    aria-pressed={f.incidents === v}
                    className={`py-3 px-3 font-bold border-2 transition ${f.incidents === v ? (v === "oui" ? "bg-red-50 border-red-600 text-red-700" : "bg-ecideDarkBlue border-ecideDarkBlue text-white") : "bg-white border-gray-200 text-gray-700 hover:border-ecideDarkBlue"}`}
                  >
                    {v === "oui" ? t("Oui") : t("Non")}
                  </button>
                ))}
              </div>
              {errors.incidents && <p className="member-error text-xs font-semibold text-red-600 mt-1.5"><i className="fa-solid fa-circle-exclamation mr-1" aria-hidden="true"></i>{errors.incidents}</p>}
            </fieldset>
            {f.incidents === "oui" && (
              <div className="space-y-5 border-l-4 border-red-500 pl-4 sm:pl-5">
                <fieldset>
                  <legend className="block font-bold text-gray-700 mb-2 text-sm">{t("Types d'incident")}</legend>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {Object.entries(options.incidentTypes).map(([k, v]) => {
                      const on = f.incident_types.includes(k);
                      return (
                        <label key={k} className={`flex items-center gap-3 p-3 border cursor-pointer ${on ? "border-red-500 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
                          <input type="checkbox" checked={on} onChange={() => set("incident_types", on ? f.incident_types.filter((x) => x !== k) : [...f.incident_types, k])} aria-invalid={errors.incident_types ? true : undefined} className="w-5 h-5 accent-red-600 shrink-0" />
                          <span className="text-sm text-gray-800">{v}</span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.incident_types && <p className="member-error text-xs font-semibold text-red-600 mt-1.5"><i className="fa-solid fa-circle-exclamation mr-1" aria-hidden="true"></i>{errors.incident_types}</p>}
                </fieldset>
                <div className="grid grid-cols-3 gap-3">
                  <Field id="r_blesses" label={t("Blessés")} error={errors.blesses}>{count("blesses")}</Field>
                  <Field id="r_deces" label={t("Décès")} error={errors.deces}>{count("deces")}</Field>
                  <Field id="r_arrestations" label={t("Personnes arrêtées")} error={errors.arrestations}>{count("arrestations")}</Field>
                </div>
                <Field id="r_incident_description" label={t("Description des incidents")} optional={t("facultatif")} help={t("Ce qui s'est passé, qui en est l'auteur si vous le savez, où et à quelle heure.")}>
                  <textarea id="r_incident_description" rows={4} maxLength={20000} value={f.incident_description} onChange={(e) => set("incident_description", e.target.value)} className={INPUT} />
                </Field>
              </div>
            )}
          </>
        ))}

        {section(t("Listes de présence"), "fa-paperclip", (
          <>
            <p className="text-sm text-gray-600">{t("Si vous le pouvez, joignez la liste des personnes présentes : PDF, photo d'une liste papier, CSV ou XLSX (:n fichiers au plus, :max Mo chacun).", { n: options.fichiersMax, max: maxMo })}</p>
            {(files.length > 0 || queue.length > 0) && (
              <ul className="divide-y divide-gray-100 border border-gray-200">
                {files.map((file) => (
                  <li key={file.id} className="flex items-center gap-3 px-4 py-3">
                    <i className={`fa-regular ${file.type === "pdf" ? "fa-file-pdf text-red-600" : ["csv", "xlsx"].includes(file.type) ? "fa-file-excel text-ecideGreen" : "fa-file-image text-ecideBlue"} text-xl`} aria-hidden="true"></i>
                    <span className="min-w-0 flex-1">
                      <a href={memberFile(`rapports/${report?.id}/fichiers/${file.id}`)} download={file.nom} className="block font-semibold text-gray-900 hover:text-ecideBlue break-all">{file.nom}</a>
                      <span className="block text-xs text-gray-500">{size(file.taille)}</span>
                    </span>
                    {!readOnly && (
                      <button type="button" onClick={() => removeFile(file.id)} disabled={!online} className="w-10 h-10 inline-flex items-center justify-center text-gray-500 hover:text-red-600 disabled:opacity-40" aria-label={t("Retirer :nom", { nom: file.nom })} title={t("Retirer")}>
                        <i className="fa-regular fa-trash-can" aria-hidden="true"></i>
                      </button>
                    )}
                  </li>
                ))}
                {queue.map((file, i) => (
                  <li key={`q${i}`} className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                    <i className={`fa-solid ${uploading === file.name ? "fa-spinner fa-spin" : "fa-clock"} text-gray-400`} aria-hidden="true"></i>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-gray-900 break-all">{file.name}</span>
                      <span className="block text-xs text-gray-500">{size(file.size)} · {t("envoyé avec le rapport")}</span>
                    </span>
                    <button type="button" onClick={() => setQueue((q) => q.filter((_, j) => j !== i))} className="w-10 h-10 inline-flex items-center justify-center text-gray-500 hover:text-red-600" aria-label={t("Retirer :nom", { nom: file.name })} title={t("Retirer")}>
                      <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!readOnly && (
              online ? (
                total < options.fichiersMax && (
                  <div>
                    <input ref={fileInput} id="r_fichier" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.csv,.xlsx,application/pdf,image/*,text/csv" className="sr-only" onChange={(e) => pick(e.target.files)} aria-describedby={errors.fichier ? "r_fichier-error" : undefined} />
                    <label htmlFor="r_fichier" className={`inline-flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 text-sm font-bold text-ecideBlue cursor-pointer hover:border-ecideBlue ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                      <i className={`fa-solid ${uploading ? "fa-spinner fa-spin" : "fa-plus"}`} aria-hidden="true"></i>
                      {uploading ? t("Envoi de :nom…", { nom: uploading }) : t("Ajouter une liste de présence")}
                    </label>
                  </div>
                )
              ) : (
                <Notice tone="warn" icon="fa-wifi">{t("Hors ligne : les listes de présence ne peuvent ni être envoyées ni être gardées sur l'appareil. Envoyez d'abord le rapport, puis ajoutez-les plus tard en le modifiant.")}</Notice>
              )
            )}
            {errors.fichier && <p id="r_fichier-error" className="member-error text-xs font-semibold text-red-600"><i className="fa-solid fa-circle-exclamation mr-1" aria-hidden="true"></i>{errors.fichier}</p>}
            {readOnly && !files.length && <p className="text-sm text-gray-500">{t("Aucune liste de présence jointe.")}</p>}
          </>
        ))}
      </fieldset>

      <p className="text-xs text-gray-500"><i className="fa-solid fa-lock mr-1" aria-hidden="true"></i>{t("Rapport confidentiel : seuls vous et les responsables du parti chargés de votre zone y ont accès. Les noms des participants ne sont jamais publiés.")}</p>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn btn--outline btn--sm min-h-11">{readOnly ? t("Retour à mes rapports") : t("Annuler")}</button>
        {!readOnly && (
          <button type="submit" disabled={busy} aria-busy={busy || undefined} className="btn btn--primary min-h-11">
            <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : online ? "fa-paper-plane" : "fa-clock"}`} aria-hidden="true"></i>
            {busy ? t("Envoi…") : !online ? t("Envoyer au retour de la connexion") : report ? t("Enregistrer les modifications") : t("Envoyer le rapport")}
          </button>
        )}
      </div>
    </form>
  );
}
