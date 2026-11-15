"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import { memberFile, type MemberProfile } from "@/lib/member";
import { showToast } from "@/lib/toast";
import { useDialog } from "./ui";

/**
 * Carte de membre numérique : recto et verso (dessinés par le serveur), QR code agrandi pour le
 * contrôle à l'entrée d'une réunion (ouvert d'emblée avec « ?qr » dans l'adresse, raccourci de
 * l'accueil), enregistrement en image et impression (PDF).
 */
export default function MemberCard({ membre }: { membre: MemberProfile }) {
  const { t, locale } = useI18n();
  const [face, setFace] = useState<"recto" | "verso">("recto");
  const [qr, setQr] = useState(false);
  const [busy, setBusy] = useState(false);
  const version = `${membre.carte?.numero}-${membre.statut}`;

  useEffect(() => {
    // Raccourci « QR code » de l'accueil : le code s'affiche aussitôt
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).has("qr")) setQr(true);
  }, []);

  /** Enregistre la face affichée en image PNG (deux fois la taille de la carte). */
  async function download() {
    setBusy(true);
    try {
      const svg = await (await fetch(memberFile(`carte/${face}`, version), { cache: "no-store" })).text();
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      const img = new Image();
      await new Promise<void>((ok, ko) => ((img.onload = () => ok()), (img.onerror = () => ko(new Error("image")), (img.src = url))));
      const canvas = document.createElement("canvas");
      canvas.width = 1712;
      canvas.height = 1080;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
      if (!blob) throw new Error("png");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `carte-membre-ecide-${face}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      showToast(t("L'image n'a pas pu être créée. Utilisez l'impression en PDF."), "error");
    } finally {
      setBusy(false);
    }
  }

  if (!membre.carte) return null;
  return (
    <div className="space-y-5">
      <div className="relative [perspective:1600px] max-w-xl mx-auto">
        { }
        <img key={face} src={memberFile(`carte/${face}`, version)} alt={face === "recto" ? t("Carte de membre, recto") : t("Carte de membre, verso")} width={856} height={540} className="member-card w-full h-auto rounded-[3%] shadow-2xl" />
        {membre.statut === "suspendu" && (
          <span className="absolute inset-0 rounded-[3%] bg-white/70 flex items-center justify-center">
            <span className="bg-red-600 text-white font-bold uppercase tracking-widest px-5 py-2 -rotate-6">{t("Carte suspendue")}</span>
          </span>
        )}
      </div>
      {/* Le QR code d'abord : c'est le geste du contrôle à l'entrée */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-2">
        <button type="button" onClick={() => setQr(true)} className="btn btn--dark col-span-2 min-h-11"><i className="fa-solid fa-qrcode" aria-hidden="true"></i>{t("Afficher le QR code")}</button>
        <button type="button" onClick={() => setFace(face === "recto" ? "verso" : "recto")} className="btn btn--outline btn--sm min-h-11 col-span-2 sm:col-span-1"><i className="fa-solid fa-rotate" aria-hidden="true"></i>{face === "recto" ? t("Voir le verso") : t("Voir le recto")}</button>
        <button type="button" onClick={download} disabled={busy} className="btn btn--outline btn--sm min-h-11 disabled:opacity-60"><i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-download"}`} aria-hidden="true"></i>{t("Image")}</button>
        <Link href={localePath(locale as Locale, "/espace-membre/carte/imprimer")} target="_blank" className="btn btn--outline btn--sm min-h-11"><i className="fa-regular fa-file-pdf" aria-hidden="true"></i>{t("PDF à imprimer")}</Link>
      </div>
      {qr && <QrDialog numero={membre.carte.numero} nom={membre.nomComplet} src={memberFile("carte/qr", version)} onClose={() => setQr(false)} />}
    </div>
  );
}

/** QR code en grand, sur fond blanc même en thème sombre (lisible par le scanner). */
function QrDialog({ numero, nom, src, onClose }: { numero: string; nom: string; src: string; onClose: () => void }) {
  const { t } = useI18n();
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="qr_title" className="qr-sheet w-full max-w-sm p-5 sm:p-6 space-y-4 text-center" style={{ background: "#fff", color: "#0b1f5c" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <p id="qr_title" className="font-bold text-left">{t("QR code de la carte")}</p>
          <button type="button" onClick={onClose} className="w-11 h-11 -mr-2 shrink-0 inline-flex items-center justify-center hover:opacity-70" aria-label={t("Fermer")}><i className="fa-solid fa-xmark text-xl" aria-hidden="true"></i></button>
        </div>
        { }
        <img src={src} alt={t("QR code de vérification de la carte :numero", { numero })} className="w-full aspect-square" />
        <div>
          <p className="font-bold">{nom}</p>
          <p className="font-mono font-bold">{numero}</p>
        </div>
        <p className="text-sm" style={{ color: "#4b5563" }}>{t("Présentez ce code au contrôle, à l'entrée d'une réunion ou d'un congrès. Montez la luminosité de l'écran si le scanner peine à le lire.")}</p>
      </div>
    </div>
  );
}
