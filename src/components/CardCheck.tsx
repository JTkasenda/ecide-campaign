"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";

/** Même champ que le formulaire de contact */
const INPUT = "w-full p-4 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-ecideBlue";

type Result = { confirme: boolean; message: string } | null;

/** Lecteur de QR code du navigateur (Chrome / Android, Safari récent) : absent ailleurs. */
type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => Detector;
  }
}

/**
 * Vérification d'une carte de membre pour les services étrangers, ambassades et services d'asile :
 * numéro de carte + nom du titulaire → « confirmé » ou « non confirmé », rien de plus. Le QR code de
 * la carte ouvre directement la page de vérification ; on peut aussi le scanner ici.
 */
export default function CardCheck({ locale }: { locale: Locale }) {
  const { t } = useI18n();
  const router = useRouter();
  const [numero, setNumero] = useState("");
  const [nom, setNom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!numero.trim() || !nom.trim()) return setError(t("Indiquez le numéro de la carte et le nom du titulaire."));
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/carte-verifier?lang=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Language": locale },
        body: JSON.stringify({ numero: numero.trim(), nom: nom.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as { confirme?: boolean; message?: string; errors?: Record<string, string[]> };
      if (!res.ok) setError((body.errors && Object.values(body.errors)[0]?.[0]) || body.message || t("La vérification n'a pas abouti. Réessayez."));
      else setResult({ confirme: !!body.confirme, message: body.message || "" });
    } catch {
      setError(t("Pas de connexion : la vérification n'a pas pu être faite. Réessayez une fois connecté."));
    } finally {
      setBusy(false);
    }
  }

  function stopScan() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setScanning(false);
  }

  async function startScan() {
    setScanNote("");
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      return setScanNote(t("Ce navigateur ne lit pas les QR codes : ouvrez l'appareil photo du téléphone et visez le QR code de la carte, il ouvre la page de vérification."));
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setScanning(true);
    } catch {
      setScanNote(t("La caméra n'est pas accessible. Autorisez-la, ou saisissez le numéro et le nom ci-dessus."));
    }
  }

  // Lecture en continu tant que la caméra est ouverte ; un QR code de carte ouvre sa page de vérification
  useEffect(() => {
    if (!scanning || !video.current || !stream.current || !window.BarcodeDetector) return;
    const el = video.current;
    el.srcObject = stream.current;
    void el.play();
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      try {
        const [code] = await detector.detect(el);
        const token = code?.rawValue.match(/\/verifier\/([A-Za-z0-9]{32,64})/)?.[1];
        if (token) {
          alive = false;
          stopScan();
          return router.push(localePath(locale, `/verifier/${token}`));
        }
        if (code) setScanNote(t("Ce QR code n'est pas celui d'une carte de membre de l'ECiDé."));
      } catch {
        /* image pas encore prête */
      }
      window.setTimeout(tick, 300);
    };
    void tick();
    return () => {
      alive = false;
    };
  }, [scanning, locale, router, t]);

  useEffect(() => stopScan, []);

  return (
    <div className="space-y-10">
      <form onSubmit={submit} noValidate className="space-y-5" aria-describedby="checkHelp">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="checkNumero" className="block font-bold text-gray-700 mb-2">{t("Numéro de la carte")}</label>
            <input id="checkNumero" type="text" inputMode="text" autoComplete="off" spellCheck={false} placeholder="10/0000123/45" value={numero} onChange={(e) => setNumero(e.target.value)} className={`${INPUT} font-mono`} />
          </div>
          <div>
            <label htmlFor="checkNom" className="block font-bold text-gray-700 mb-2">{t("Nom du titulaire")}</label>
            <input id="checkNom" type="text" autoComplete="off" spellCheck={false} placeholder={t("Nom de famille, tel qu'il figure sur la carte")} value={nom} onChange={(e) => setNom(e.target.value)} className={INPUT} />
          </div>
        </div>
        <p id="checkHelp" className="text-sm text-gray-600">{t("Le nom de famille suffit ; vous pouvez ajouter le post-nom et le prénom, dans n'importe quel ordre.")}</p>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn btn--dark" disabled={busy}>
            <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-shield-halved"}`} aria-hidden="true"></i>
            {t("Vérifier")}
          </button>
          <button type="button" className="btn btn--outline text-ecideBlue" onClick={scanning ? stopScan : startScan}>
            <i className="fa-solid fa-qrcode" aria-hidden="true"></i>
            {scanning ? t("Fermer la caméra") : t("Scanner le QR code de la carte")}
          </button>
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      </form>

      {scanning && (
        <div className="max-w-sm">
          <video ref={video} playsInline muted className="w-full aspect-square object-cover bg-gray-900" aria-label={t("Image de la caméra")} />
        </div>
      )}
      {scanNote && <p className="text-sm text-gray-700 border-l-4 border-ecideBlue bg-ecideBlue-50 px-4 py-3">{scanNote}</p>}

      <div aria-live="polite">
        {result && (
          <div className={`flex items-start gap-4 p-6 text-white ${result.confirme ? "bg-ecideGreen" : "bg-red-700"}`}>
            <i className={`fa-solid ${result.confirme ? "fa-circle-check" : "fa-circle-xmark"} text-4xl shrink-0`} aria-hidden="true"></i>
            <div className="space-y-1">
              <p className="text-2xl font-display font-bold">{result.confirme ? t("Confirmé") : t("Non confirmé")}</p>
              <p>{result.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
