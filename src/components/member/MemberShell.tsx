"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { isLocale, localePath, switchLocale, type Locale } from "@/lib/locales";
import { memberApi, type MemberData } from "@/lib/member";
import { MemberContext } from "./MemberContext";
import MemberLogin from "./MemberLogin";
import MembershipFlow from "./MemberSpace";
import { Notice, cardStatus, initials, useDialog } from "./ui";

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

export interface ShellLanguage {
  code: string;
  nom: string;
}

interface Brand {
  languages: ShellLanguage[];
  logo: string;
  siteName: string;
}

/** Rubriques de l'espace membre : [suffixe d'adresse, icône, libellé, onglet du bas sur téléphone]. */
type NavItem = [string, string, string, boolean];

/**
 * Cadre de l'espace membre, une application distincte du site public. Lit la session au
 * chargement (cookie protégé, via le relais) : sans session, la connexion par code ; pendant la
 * demande d'adhésion, le parcours de demande (barre simple, contenu centré) ; pour un membre
 * validé, la barre latérale (ordinateur) ou les onglets du bas et la feuille « Plus » (téléphone),
 * la barre du haut (titre, langue, retour au site, cloche, thème sombre, déconnexion), puis la page.
 */
export default function MemberShell({ children, languages, logo, siteName }: { children: ReactNode } & Brand) {
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

  const brand = { languages, logo, siteName };
  const member = state === "ready" && data && ["actif", "suspendu"].includes(data.membre.statut);
  const root = `m-app ${dark ? "member-dark" : ""}`;

  let body: ReactNode;
  if (member && data) {
    body = (
      <AppFrame data={data} brand={brand} dark={dark} toggleTheme={toggleTheme} logout={logout}>
        {children}
      </AppFrame>
    );
  } else {
    let content: ReactNode;
    let narrow = true;
    if (state === "loading") {
      content = (
        <div className="m-state" aria-live="polite">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
          <p>{t("Chargement de votre espace…")}</p>
        </div>
      );
    } else if (state === "error") {
      content = (
        <Notice tone="error">
          {t("L'espace membre est momentanément indisponible.")}{" "}
          <button type="button" onClick={() => (setState("loading"), load())} className="font-bold underline">{t("Réessayer")}</button>
        </Notice>
      );
    } else if (state === "guest" || !data) {
      content = <MemberLogin onLogged={(d) => (setData(d), setState("ready"))} />;
    } else {
      // Demande d'adhésion en cours, transmise ou refusée : le même parcours sur toutes les pages
      narrow = !["compte", "brouillon", "complement"].includes(data.membre.statut);
      content = <MembershipFlow data={data} setData={setData} logout={logout} />;
    }
    body = (
      <GuestFrame brand={brand} narrow={narrow}>
        {content}
      </GuestFrame>
    );
  }

  return (
    <MemberContext.Provider value={data ? { data, setData, reload: load, logout } : null}>
      <div className={root}>{body}</div>
    </MemberContext.Provider>
  );
}

/* ---------- Écrans sans compte validé (connexion, demande d'adhésion) ---------- */

function GuestFrame({ brand, narrow, children }: { brand: Brand; narrow: boolean; children: ReactNode }) {
  const { t, locale } = useI18n();
  return (
    <>
      <a href="#main" className="m-skip">{t("Aller au contenu principal")}</a>
      <div className="m-topbar">
        <Link href={localePath(locale as Locale, "/espace-membre")} className="m-brand flex-1">
          <img src={brand.logo} alt="" width={32} height={32} />
          <span className="min-w-0">
            <span className="m-brand__name">{brand.siteName}</span>
            <span className="m-brand__sub">{t("Espace membre")}</span>
          </span>
        </Link>
        <LangSelect languages={brand.languages} />
        <SiteLink />
      </div>
      <div id="main" role="main" tabIndex={-1} className={`m-guest-main ${narrow ? "m-guest-main--narrow" : ""}`}>
        {children}
      </div>
    </>
  );
}

/** Retour au site public (icône seule sur téléphone). */
function SiteLink({ block }: { block?: boolean }) {
  const { t, locale } = useI18n();
  const href = localePath(locale as Locale, "/");
  if (block) {
    return (
      <Link href={href} className="m-sheet__row">
        <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
        {t("Retour au site")}
      </Link>
    );
  }
  return (
    <Link href={href} className="m-textbtn" title={t("Retour au site")}>
      <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
      <span className="hidden sm:inline">{t("Retour au site")}</span>
      <span className="sr-only sm:hidden">{t("Retour au site")}</span>
    </Link>
  );
}

/** Choix de la langue : même page dans l'autre langue (comme l'en-tête du site). */
function LangSelect({ languages, block }: { languages: ShellLanguage[]; block?: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  if (languages.length < 2) return null;
  const change = (code: string) => {
    if (!isLocale(code) || code === locale) return;
    try {
      localStorage.setItem("ecide-lang", code);
    } catch {
      /* préférence non retenue */
    }
    router.push(switchLocale(pathname, code));
  };
  return (
    <label className={`m-lang ${block ? "m-lang--block" : ""}`}>
      <i className="fa-solid fa-globe" aria-hidden="true"></i>
      <span className="sr-only">{t("Choisir la langue")}</span>
      <select value={locale} onChange={(e) => change(e.target.value)}>
        {languages.map((l) => (
          <option key={l.code} value={l.code}>
            {block ? l.nom : l.code.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ---------- Cadre du membre validé ---------- */

function AppFrame({ data, brand, dark, toggleTheme, logout, children }: { data: MemberData; brand: Brand; dark: boolean; toggleTheme: () => void; logout: () => Promise<void>; children: ReactNode }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const [sheet, setSheet] = useState(false);
  const base = localePath(locale as Locale, "/espace-membre");
  const items: NavItem[] = [
    ["", "fa-house", t("Accueil"), true],
    ["/carte", "fa-id-card", t("Ma carte"), true],
    ["/agenda", "fa-calendar-days", t("Agenda"), true],
    ["/cotisations", "fa-wallet", t("Cotisations"), true],
    ["/rapports", "fa-clipboard-list", t("Rapports"), false],
    ["/actualites", "fa-newspaper", t("Actualités"), false],
    ["/annuaire", "fa-address-book", t("Annuaire"), false],
    ["/documents", "fa-book-open", t("Documents"), false],
    ["/profil", "fa-user", t("Profil"), false],
  ];
  const isCurrent = (suffix: string) => {
    const href = base + suffix;
    return suffix === "" ? pathname === href || pathname === `${href}/` : pathname === href || pathname.startsWith(`${href}/`);
  };
  const current = items.find(([s]) => isCurrent(s));
  const title = current ? current[2] : t("Espace membre");
  const inSheet = items.some(([s, , , tab]) => !tab && isCurrent(s));
  const m = data.membre;
  const status = cardStatus(m, t);
  const themeLabel = dark ? t("Thème clair") : t("Thème sombre");

  // Changement de page : la feuille « Plus » se referme
  const [seen, setSeen] = useState(pathname);
  if (seen !== pathname) {
    setSeen(pathname);
    setSheet(false);
  }

  return (
    <>
      <a href="#main" className="m-skip">{t("Aller au contenu principal")}</a>

      <aside className="m-sidebar" aria-label={t("Espace membre")}>
        <div className="m-sidebar__head">
          <Link href={base} className="m-brand">
            <img src={brand.logo} alt="" width={32} height={32} />
            <span className="min-w-0">
              <span className="m-brand__name">{brand.siteName}</span>
              <span className="m-brand__sub">{t("Espace membre")}</span>
            </span>
          </Link>
        </div>
        <nav className="m-sidebar__nav" aria-label={t("Navigation de l'espace membre")}>
          <ul className="m-nav">
            {items.map(([suffix, icon, label]) => (
              <li key={suffix || "accueil"}>
                <Link href={base + suffix} aria-current={isCurrent(suffix) ? "page" : undefined} className="m-nav__link">
                  <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="m-sidebar__foot">
          <Link href={base + "/profil"} className="m-user rounded-lg -m-1 p-1 hover:bg-[var(--m-surface-2)]">
            <span className="m-avatar" aria-hidden="true">{initials(m)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold truncate">{m.nomComplet}</span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                <span className={`m-pill m-pill--${status.tone}`}>{status.label}</span>
              </span>
              {m.carte?.numero && <span className="block text-xs m-muted mt-1 font-mono truncate">{t("N° de carte")} {m.carte.numero}</span>}
            </span>
          </Link>
        </div>
      </aside>

      <div className="m-body">
        <div className="m-topbar">
          <Link href={base} className="m-topbar__brand shrink-0" aria-label={t("Espace membre")}>
            <img src={brand.logo} alt="" width={30} height={30} className="w-[30px] h-[30px] rounded-full" />
          </Link>
          <p className="m-topbar__title">{title}</p>
          <span className="m-only-desktop flex items-center gap-1">
            <LangSelect languages={brand.languages} />
            <SiteLink />
          </span>
          <Bell />
          <button type="button" onClick={toggleTheme} className="m-iconbtn m-only-desktop" aria-pressed={dark} aria-label={themeLabel} title={themeLabel}>
            <i className={`fa-solid ${dark ? "fa-sun" : "fa-moon"}`} aria-hidden="true"></i>
          </button>
          <button type="button" onClick={logout} className="m-textbtn m-only-desktop" title={`${t("Se déconnecter")} · ${m.telephone || m.email || ""}`}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
            {t("Se déconnecter")}
          </button>
        </div>
        <div id="main" role="main" tabIndex={-1} className="m-main">
          {children}
        </div>
      </div>

      <nav className="m-tabbar" aria-label={t("Navigation de l'espace membre")}>
        {items
          .filter(([, , , tab]) => tab)
          .map(([suffix, icon, label]) => (
            <Link key={suffix || "accueil"} href={base + suffix} aria-current={isCurrent(suffix) ? "page" : undefined} className="m-tab">
              <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
              <span>{label}</span>
            </Link>
          ))}
        <button type="button" onClick={() => setSheet(true)} className="m-tab" data-active={inSheet || undefined} aria-haspopup="dialog" aria-expanded={sheet}>
          <i className="fa-solid fa-ellipsis" aria-hidden="true"></i>
          <span>{t("Plus")}</span>
        </button>
      </nav>

      {sheet && (
        <MoreSheet onClose={() => setSheet(false)} title={t("Plus")}>
          <ul className="m-sheet__grid">
            {items
              .filter(([, , , tab]) => !tab)
              .map(([suffix, icon, label]) => (
                <li key={suffix}>
                  <Link href={base + suffix} onClick={() => setSheet(false)} aria-current={isCurrent(suffix) ? "page" : undefined} className="m-sheet__item">
                    <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
                    {label}
                  </Link>
                </li>
              ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-[var(--m-border)] space-y-1">
            <div className="m-user py-2">
              <span className="m-avatar" aria-hidden="true">{initials(m)}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{m.nomComplet}</span>
                <span className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className={`m-pill m-pill--${status.tone}`}>{status.label}</span>
                  {m.carte?.numero && <span className="text-xs m-muted font-mono">{m.carte.numero}</span>}
                </span>
              </span>
            </div>
            <div className="py-2">
              <LangSelect languages={brand.languages} block />
            </div>
            <button type="button" onClick={toggleTheme} className="m-sheet__row" aria-pressed={dark}>
              <i className={`fa-solid ${dark ? "fa-sun" : "fa-moon"}`} aria-hidden="true"></i>
              {themeLabel}
            </button>
            <SiteLink block />
            <button type="button" onClick={() => (setSheet(false), logout())} className="m-sheet__row">
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
              {t("Se déconnecter")}
              <span className="ml-auto text-xs m-muted truncate max-w-[45%]">{m.telephone || m.email || ""}</span>
            </button>
          </div>
        </MoreSheet>
      )}
    </>
  );
}

/** Feuille « Plus » (téléphone) : fenêtre modale posée en bas de l'écran. */
function MoreSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useI18n();
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <>
      <div className="m-sheet-backdrop" onClick={onClose} aria-hidden="true"></div>
      <div ref={ref} className="m-sheet" role="dialog" aria-modal="true" aria-labelledby="m-sheet-title">
        <div className="m-sheet__grip" aria-hidden="true"></div>
        <div className="flex items-center justify-between mb-3">
          <h2 id="m-sheet-title" className="text-base">{title}</h2>
          <button type="button" onClick={onClose} className="m-iconbtn -mr-2" aria-label={t("Fermer")} data-autofocus>
            <i className="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
          </button>
        </div>
        {children}
      </div>
    </>
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
      <button type="button" onClick={toggle} className="m-iconbtn" aria-haspopup="true" aria-expanded={open} aria-label={unread ? t(":n notifications non lues", { n: unread }) : t("Notifications")}>
        <i className="fa-regular fa-bell text-[1.05rem]" aria-hidden="true"></i>
        {unread > 0 && <span className="m-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="m-popover">
          <p className="px-4 py-3 border-b border-[var(--m-border)] font-semibold text-sm">{t("Notifications")}</p>
          {items.length ? (
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-[var(--m-border)]">
              {items.map((n) => (
                <li key={n.id}>
                  <Link href={localePath(locale as Locale, n.url)} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-[var(--m-surface-2)]">
                    <span className="m-icon !w-8 !h-8 !rounded-full"><i className={`fa-solid ${NOTIF_ICON[n.type] || "fa-circle-info"} text-xs`} aria-hidden="true"></i></span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm truncate ${n.nonLu ? "font-bold" : "font-medium"}`}>{n.titre}</span>
                      {n.texte && <span className="block text-xs m-muted line-clamp-2">{n.texte}</span>}
                      <span className="block text-[11px] m-muted mt-1">{ago(n.date)}</span>
                    </span>
                    {n.nonLu && <span className="w-2 h-2 mt-2 rounded-full bg-[var(--m-primary)] shrink-0" aria-label={t("Non lue")}></span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="m-state">
              <i className="fa-regular fa-bell-slash" aria-hidden="true"></i>
              <p>{t("Aucune notification pour le moment.")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
