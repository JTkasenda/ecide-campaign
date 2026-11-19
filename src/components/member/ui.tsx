import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import type { T } from "@/lib/i18n";
import type { MemberProfile } from "@/lib/member";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Fenêtre modale accessible : focus placé dans la fenêtre à l'ouverture, Tab qui reste dans la
 * fenêtre, Échap pour fermer (sauf pendant un envoi), page figée derrière, focus rendu à
 * l'élément d'origine à la fermeture. À poser sur le panneau de la fenêtre.
 */
export function useDialog<T extends HTMLElement>(onClose: () => void, locked = false): RefObject<T | null> {
  const ref = useRef<T>(null);
  const close = useRef(onClose);
  const lock = useRef(locked);
  useEffect(() => {
    close.current = onClose;
    lock.current = locked;
  });
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const box = ref.current;
    const first = box?.querySelector<HTMLElement>("[data-autofocus]") || box?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !lock.current) {
        e.preventDefault();
        close.current();
      } else if (e.key === "Tab" && ref.current) {
        const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const [a, z] = [items[0], items[items.length - 1]];
        if (e.shiftKey && (document.activeElement === a || !ref.current.contains(document.activeElement))) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (before && document.contains(before)) before.focus();
    };
  }, []);
  return ref;
}

/** Champs de saisie de l'espace membre. */
export const INPUT = "w-full px-3.5 py-2.5 min-h-11 bg-white border border-gray-300 rounded-lg text-gray-900 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-ecideBlue focus:ring-2 focus:ring-ecideBlue/25 disabled:opacity-60";

/**
 * Bloc de l'espace membre : carte blanche avec un en-tête (titre, sous-titre, action à droite) et
 * son contenu. Sert aux écrans de connexion et de demande d'adhésion.
 */
export function MemberPanel({ title, subtitle, children, narrow, aside }: { title: string; subtitle?: string; children: ReactNode; narrow?: boolean; aside?: ReactNode }) {
  return (
    <div className={`${narrow ? "max-w-md" : "max-w-3xl"} mx-auto w-full`}>
      <div className="member-box m-card overflow-hidden">
        <div className="px-5 sm:px-7 pt-6 pb-5 flex items-start gap-4 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            <h1>{title}</h1>
            {subtitle && <p className="m-page-head__sub">{subtitle}</p>}
          </div>
          {aside}
        </div>
        <div className="p-5 sm:p-7">{children}</div>
      </div>
    </div>
  );
}

/** En-tête d'une page de l'espace membre (Agenda, Annuaire…) : titre, phrase d'accueil, action à droite. */
export function MemberPageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="m-page-head">
      <div className="m-page-head__text">
        <h1>{title}</h1>
        {subtitle && <p className="m-page-head__sub">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
    </div>
  );
}

/** Bloc blanc de l'espace membre (passe en sombre avec le thème sombre). */
export function MemberCardBox({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`member-box m-card bg-white border border-gray-200 p-4 sm:p-5 ${className}`}>{children}</section>;
}

/** État de la carte du membre, pour les pastilles (barre latérale, accueil). */
export function cardStatus(m: MemberProfile, t: T): { label: string; tone: "ok" | "warn" | "bad" | "info" } {
  if (m.statut === "suspendu") return { label: t("Carte suspendue"), tone: "bad" };
  if (m.carte?.valide) return { label: t("Carte valide"), tone: "ok" };
  if (m.carte) return { label: t("Carte expirée"), tone: "bad" };
  return { label: m.statutLibelle || t("En cours"), tone: "warn" };
}

/** Initiales du membre (pastille à la place de la photo : rien de plus à télécharger). */
export function initials(m: MemberProfile): string {
  const parts = [m.prenom, m.nom].filter(Boolean) as string[];
  const src = parts.length ? parts : (m.nomComplet || "").split(/\s+/);
  return src.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";
}

/** Champ avec libellé ; l'erreur éventuelle s'affiche juste dessous (id « <id>-error »). */
export function Field({ id, label, optional, help, error, children, className = "" }: { id: string; label: string; optional?: string; help?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-semibold text-gray-800 mb-1.5 text-sm">
        {label} {optional && <span className="font-normal text-gray-400">({optional})</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="member-error text-xs font-semibold text-red-600 mt-1.5">
          <i className="fa-solid fa-circle-exclamation mr-1" aria-hidden="true"></i>
          {error}
        </p>
      ) : (
        help && <p className="text-xs text-gray-500 mt-1.5">{help}</p>
      )}
    </div>
  );
}

export function Notice({ tone = "info", icon, children }: { tone?: "info" | "warn" | "error" | "success"; icon?: string; children: ReactNode }) {
  const styles = {
    info: "border-ecideBlue-100 bg-ecideBlue-50 text-gray-700 [&>i]:text-ecideBlue",
    warn: "border-ecideYellow-200 bg-ecideYellow-50 text-gray-700 [&>i]:text-ecideYellow-800",
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-ecideGreen-100 bg-ecideGreen-50 text-gray-800 [&>i]:text-ecideGreen",
  }[tone];
  const fallback = { info: "fa-circle-info", warn: "fa-triangle-exclamation", error: "fa-circle-exclamation", success: "fa-circle-check" }[tone];
  return (
    <div className={`member-notice border rounded-lg px-3.5 py-3 text-sm flex gap-3 ${styles}`}>
      <i className={`fa-solid ${icon || fallback} mt-0.5`} aria-hidden="true"></i>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
