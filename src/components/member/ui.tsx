import { useEffect, useRef, type ReactNode, type RefObject } from "react";

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
export const INPUT = "w-full p-3.5 bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-ecideBlue focus:bg-white disabled:opacity-60";

/** Bloc de l'espace membre : en-tête bleu nuit (emblème, titre, sous-titre) et contenu sur fond blanc. */
export function MemberPanel({ title, subtitle, children, narrow, aside }: { title: string; subtitle?: string; children: ReactNode; narrow?: boolean; aside?: ReactNode }) {
  return (
    <div className={`${narrow ? "max-w-xl" : "max-w-4xl"} mx-auto w-full`}>
      <div className="member-hero relative overflow-hidden bg-ecideDarkBlue text-white px-6 sm:px-8 py-6 flex items-center gap-5">
        <img src="/assets/img/logo-160.png" alt="" width={56} height={56} className="w-14 h-14 rounded-full shrink-0 ring-2 ring-white/30" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl sm:text-4xl leading-tight no-bar">{title}</h1>
          {subtitle && <p className="text-blue-100 text-sm mt-1">{subtitle}</p>}
        </div>
        {aside}
      </div>
      <div className="bg-white border border-gray-200 border-t-0 p-6 sm:p-8 lg:p-10">{children}</div>
    </div>
  );
}

/** En-tête d'une page de l'espace membre (Agenda, Annuaire…) : titre, phrase d'accueil, action à droite. */
export function MemberPageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="member-hero relative overflow-hidden bg-ecideDarkBlue text-white px-6 sm:px-8 py-6 flex flex-wrap items-center gap-5">
      <img src="/assets/img/logo-160.png" alt="" width={52} height={52} className="w-13 h-13 rounded-full shrink-0 ring-2 ring-white/30" />
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl sm:text-4xl leading-tight no-bar">{title}</h1>
        {subtitle && <p className="text-blue-100 text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Bloc blanc de l'espace membre (passe en sombre avec le thème sombre). */
export function MemberCardBox({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`member-box bg-white border border-gray-200 p-5 sm:p-6 ${className}`}>{children}</section>;
}

/** Champ avec libellé ; l'erreur éventuelle s'affiche juste dessous (id « <id>-error »). */
export function Field({ id, label, optional, help, error, children, className = "" }: { id: string; label: string; optional?: string; help?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-bold text-gray-700 mb-2 text-sm">
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
    info: "border-ecideBlue bg-ecideBlue-50 text-gray-700",
    warn: "border-ecideYellow bg-ecideYellow/15 text-gray-700",
    error: "border-red-500 bg-red-50 text-red-800",
    success: "border-ecideGreen bg-ecideGreen-50 text-gray-800",
  }[tone];
  const fallback = { info: "fa-circle-info", warn: "fa-triangle-exclamation", error: "fa-circle-exclamation", success: "fa-circle-check" }[tone];
  return (
    <div className={`border-l-4 px-4 py-3 text-sm flex gap-3 ${styles}`}>
      <i className={`fa-solid ${icon || fallback} mt-0.5`} aria-hidden="true"></i>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
