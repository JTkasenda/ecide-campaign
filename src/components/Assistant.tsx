"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { Locale } from "@/lib/locales";

/**
 * Le panneau n'est téléchargé qu'au premier clic (ou au survol du bouton, pour gagner un instant) :
 * la page ne porte que ce bouton, quelques centaines d'octets, pour les connexions lentes.
 */
const loadPanel = () => import("./AssistantPanel");
const AssistantPanel = dynamic(loadPanel, { ssr: false, loading: () => <PanelLoading /> });

function PanelLoading() {
  const { t } = useI18n();
  return (
    <div className="assistant-panel assistant-panel--loading" role="status">
      <i className="fa-solid fa-circle-notch fa-spin text-2xl text-ecideBlue" aria-hidden="true"></i>
      <span className="sr-only">{t("Chargement…")}</span>
    </div>
  );
}

/**
 * Assistant du site : bouton flottant en bas à gauche (le bouton « haut de page » est à droite et
 * la barre d'action mobile en bas) qui ouvre un petit panneau de questions-réponses. Les réponses
 * viennent de la base de connaissances de l'administration (aucune intelligence artificielle).
 */
export default function Assistant({ locale }: { locale: Locale }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    button.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`assistant-fab ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-controls="assistant-panel"
        aria-label={open ? t("Fermer l'assistant") : t("Une question ? Demandez à l'assistant")}
        title={open ? t("Fermer l'assistant") : t("Une question ? Demandez à l'assistant")}
        onPointerEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        onClick={() => {
          setLoaded(true);
          setOpen((o) => !o);
        }}
      >
        <i className={`fa-solid ${open ? "fa-xmark" : "fa-comment-dots"}`} aria-hidden="true"></i>
      </button>
      {loaded && <AssistantPanel locale={locale} open={open} onClose={close} />}
    </>
  );
}
