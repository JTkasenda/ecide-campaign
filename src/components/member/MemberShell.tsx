"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import { memberApi, type MemberData } from "@/lib/member";
import { MemberContext } from "./MemberContext";
import MemberLogin from "./MemberLogin";
import MembershipFlow from "./MemberSpace";
import { Notice } from "./ui";

const THEME_KEY = "ecide-membre-theme";

interface Notif {
  id: string;
  type: string;
  titre: string;
  texte: string;
  date: string;
  url: string;
  nonLu: boolean;
}

/**
 * Cadre de l'espace membre. Lit la session au chargement (cookie protégé, via le relais) :
 * sans session, la connexion par code ; pendant la demande d'adhésion, le parcours de demande ;
 * pour un membre validé, la navigation (Accueil, Ma carte, Agenda, Actualités, Annuaire,
 * Documents, Cotisations, Profil), la cloche et le thème sombre, puis la page demandée.
 */
export default function MemberShell({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<MemberData | null>(null);
  const [state, setState] = useState<"loading" | "guest" | "ready" | "error">("loading");
  const [dark, setDark] = useState(false);

  const load = useCallback(async () => {
    const r = await memberApi("", locale);
    if (r.ok) {
      setData(r.data);
      setState("ready");
    } else setState(r.status === 401 ? "guest" : "error");
  }, [locale]);

  useEffect(() => {
    // Session et thème lus une fois dans le navigateur (cookie protégé, préférence locale)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    try {
      setDark(localStorage.getItem(THEME_KEY) === "sombre");
    } catch {
      /* stockage indisponible : thème clair */
    }
  }, [load]);

  const toggleTheme = () => {
    setDark((d) => {
      try {
        localStorage.setItem(THEME_KEY, d ? "clair" : "sombre");
      } catch {
        /* préférence non retenue */
      }
      return !d;
    });
  };

  const logout = useCallback(async () => {
    await memberApi("deconnexion", locale, { json: {} });
    setData(null);
    setState("guest");
  }, [locale]);

  let body: ReactNode;
  if (state === "loading") {
    body = (
      <div className="py-24 text-center text-gray-500" aria-live="polite">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-ecideBlue" aria-hidden="true"></i>
        <p className="mt-4">{t("Chargement de votre espace…")}</p>
      </div>
    );
  } else if (state === "error") {
    body = (
      <div className="max-w-xl mx-auto">
        <Notice tone="error">
          {t("L'espace membre est momentanément indisponible.")}{" "}
          <button type="button" onClick={() => (setState("loading"), load())} className="font-bold underline">{t("Réessayer")}</button>
        </Notice>
      </div>
    );
  } else if (state === "guest" || !data) {
    body = <MemberLogin onLogged={(d) => (setData(d), setState("ready"))} />;
  } else if (!["actif", "suspendu"].includes(data.membre.statut)) {
    // Demande d'adhésion en cours, transmise ou refusée : le même parcours sur toutes les pages
    body = <MembershipFlow data={data} setData={setData} logout={logout} />;
  } else {
    body = (
      <>
        <MemberNav data={data} dark={dark} toggleTheme={toggleTheme} logout={logout} />
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">{children}</div>
      </>
    );
  }

  return (
    <MemberContext.Provider value={data ? { data, setData, reload: load, logout } : null}>
      <div className={`member-root min-h-[60vh] bg-ecideBlue-50 ${dark ? "member-dark" : ""} ${state === "ready" && data && ["actif", "suspendu"].includes(data.membre.statut) ? "" : "py-10 sm:py-16 px-4 sm:px-6"}`}>{body}</div>
    </MemberContext.Provider>
  );
}

/* ---------- Navigation du membre validé ---------- */

function MemberNav({ data, dark, toggleTheme, logout }: { data: MemberData; dark: boolean; toggleTheme: () => void; logout: () => Promise<void> }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const base = localePath(locale as Locale, "/espace-membre");
  const items: [string, string, string][] = [
    ["", "fa-house", t("Accueil")],
    ["/carte", "fa-id-card", t("Ma carte")],
    ["/agenda", "fa-calendar-days", t("Agenda")],
    ["/actualites", "fa-newspaper", t("Actualités")],
    ["/annuaire", "fa-address-book", t("Annuaire")],
    ["/documents", "fa-book-open", t("Documents")],
    ["/cotisations", "fa-wallet", t("Cotisations")],
    ["/profil", "fa-user", t("Profil")],
  ];
  const navRef = useRef<HTMLElement>(null);
  // Sur téléphone, l'onglet de la page courante reste visible dans la barre défilante
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);
  const current = (suffix: string) => {
    const href = base + suffix;
    return suffix === "" ? pathname === href || pathname === `${href}/` : pathname === href || pathname.startsWith(`${href}/`);
  };
  return (
    <div className="member-nav bg-ecideDarkBlue text-white border-t border-white/10 sticky top-16 xl:top-20 z-30 print:hidden">
      <div className="max-w-5xl mx-auto px-2 sm:px-6 flex items-center gap-1">
        <nav ref={navRef} className="flex-1 min-w-0 overflow-x-auto no-scrollbar" aria-label={t("Navigation de l'espace membre")}>
          <ul className="flex items-center gap-1 py-1.5">
            {items.map(([suffix, icon, label]) => {
              const on = current(suffix);
              return (
                <li key={suffix || "accueil"} className="shrink-0">
                  <Link href={base + suffix} aria-current={on ? "page" : undefined} className={`inline-flex items-center gap-1.5 px-2.5 py-2.5 text-[13px] font-semibold transition ${on ? "bg-ecideYellow text-ecideDarkBlue" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                    <i className={`fa-solid ${icon} text-xs`} aria-hidden="true"></i>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <Bell />
        <button type="button" onClick={toggleTheme} className="w-10 h-10 shrink-0 inline-flex items-center justify-center text-blue-100 hover:text-white hover:bg-white/10" aria-pressed={dark} aria-label={dark ? t("Thème clair") : t("Thème sombre")} title={dark ? t("Thème clair") : t("Thème sombre")}>
          <i className={`fa-solid ${dark ? "fa-sun" : "fa-moon"}`} aria-hidden="true"></i>
        </button>
        <button type="button" onClick={logout} className="w-10 h-10 shrink-0 inline-flex items-center justify-center text-blue-100 hover:text-white hover:bg-white/10" aria-label={t("Se déconnecter")} title={`${t("Se déconnecter")} · ${data.membre.telephone || data.membre.email || ""}`}>
          <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  );
}

/* ---------- Cloche des notifications ---------- */

const NOTIF_ICON: Record<string, string> = { adhesion: "fa-id-card", reunion: "fa-calendar-days", communique: "fa-bullhorn", cotisation: "fa-wallet" };

function Bell() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  // Heure de la dernière lecture : sert à dater les notifications (« Aujourd'hui », « Hier »)
  const [now, setNow] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    const r = await memberApi<{ items: Notif[]; nonLues: number }>("notifications", locale);
    if (r.ok) {
      setNow(Date.now());
      setItems(r.data.items || []);
      setUnread(r.data.nonLues || 0);
    }
  }, [locale]);

  useEffect(() => {
    // Relue chaque minute tant que la page est visible
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifs();
    const id = setInterval(() => document.visibilityState === "visible" && fetchNotifs(), 60000);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      await memberApi("notifications/lues", locale, { json: {} });
    }
  }

  const ago = (iso: string) => {
    const d = new Date(iso);
    const days = Math.floor((now - d.getTime()) / 864e5);
    if (days <= 0) return t("Aujourd'hui");
    if (days === 1) return t("Hier");
    return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  };

  return (
    <div ref={root} className="relative shrink-0">
      <button type="button" onClick={toggle} className="relative w-10 h-10 inline-flex items-center justify-center text-blue-100 hover:text-white hover:bg-white/10" aria-haspopup="true" aria-expanded={open} aria-label={unread ? t(":n notifications non lues", { n: unread }) : t("Notifications")}>
        <i className="fa-regular fa-bell" aria-hidden="true"></i>
        {unread > 0 && <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-ecideYellow text-ecideDarkBlue text-[10px] font-bold flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="member-box absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-1.5rem))] bg-white text-gray-800 shadow-2xl border border-gray-200 z-50">
          <p className="px-4 py-3 border-b border-gray-100 font-bold text-ecideDarkBlue">{t("Notifications")}</p>
          {items.length ? (
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
              {items.map((n) => (
                <li key={n.id}>
                  <Link href={localePath(locale as Locale, n.url)} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-ecideBlue-50">
                    <span className="w-9 h-9 shrink-0 rounded-full bg-ecideBlue-50 text-ecideBlue flex items-center justify-center"><i className={`fa-solid ${NOTIF_ICON[n.type] || "fa-circle-info"} text-sm`} aria-hidden="true"></i></span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm truncate ${n.nonLu ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>{n.titre}</span>
                      {n.texte && <span className="block text-xs text-gray-500 line-clamp-2">{n.texte}</span>}
                      <span className="block text-[11px] text-gray-400 mt-1">{ago(n.date)}</span>
                    </span>
                    {n.nonLu && <span className="w-2 h-2 mt-2 rounded-full bg-ecideYellow shrink-0" aria-label={t("Non lue")}></span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-gray-500">{t("Aucune notification pour le moment.")}</p>
          )}
        </div>
      )}
    </div>
  );
}
