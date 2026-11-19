"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { API_URL } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { isLocale, localePath, type Locale } from "@/lib/locales";

/** Réponse de GET /api/v1/assistant (voir App\Assistant\Assistant côté Laravel). */
interface Chip {
  id: string;
  question: string;
}
interface Answer {
  id: string;
  source: "assistant" | "faq" | "page";
  question: string;
  reponse: string;
  lien: { url: string; libelle: string } | null;
}
interface AssistantResult {
  trouve?: boolean;
  vide?: boolean;
  reponse?: Answer | null;
  suggestions?: Chip[];
  contact?: { url: string };
}

type Message =
  | { role: "user"; text: string }
  | { role: "bot"; kind: "answer"; answer: Answer; suggestions: Chip[] }
  | { role: "bot"; kind: "notfound"; empty: boolean; suggestions: Chip[]; contact: string }
  | { role: "bot"; kind: "error"; text: string; retry: Query };

type Query = { q: string } | { id: string; question: string };

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

/** Paragraphes d'une réponse : retours à la ligne, et étapes numérotées « 1. … 2. … » sur leur propre ligne. */
function paragraphs(text: string): string[] {
  return text
    .split(/\n+|\s(?=\d\.\s)/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Panneau de l'assistant (chargé à la demande) : accueil, questions proposées, échanges et saisie.
 * Fenêtre de dialogue au clavier : le focus reste dans le panneau, Échap le ferme ; les réponses
 * sont annoncées par les lecteurs d'écran (journal aria-live).
 */
export default function AssistantPanel({ locale, open, onClose }: { locale: Locale; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [starters, setStarters] = useState<Chip[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);

  // Page du visiteur, sans préfixe de langue : notée avec une question restée sans réponse
  const parts = pathname.split("/").filter(Boolean);
  if (isLocale(parts[0])) parts.shift();
  const page = "/" + parts.join("/");

  const href = (url: string) => localePath(locale, url);
  const external = (url: string) => /^https?:/i.test(url);

  async function call(params: Record<string, string>): Promise<AssistantResult> {
    const qs = new URLSearchParams({ ...params, lang: locale });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`${API_URL}/api/v1/assistant?${qs.toString()}`, { headers: { Accept: "application/json", "Accept-Language": locale }, signal: ctrl.signal });
      if (res.status === 429) throw new Error("throttle");
      if (!res.ok) throw new Error("http");
      return (await res.json()) as AssistantResult;
    } finally {
      clearTimeout(timer);
    }
  }

  // Questions proposées à l'ouverture (une fois)
  useEffect(() => {
    let alive = true;
    call({})
      .then((d) => alive && setStarters(d.suggestions || []))
      .catch(() => alive && setStarters([]));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // Ouverture : le focus va au champ de saisie
  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 30);
  }, [open]);

  // Nouveau message : on fait défiler jusqu'en bas
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  async function ask(query: Query, echo = true) {
    if (busy) return;
    if (echo) setMessages((m) => [...m, { role: "user", text: "q" in query ? query.q : query.question }]);
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setMessages((m) => [...m, { role: "bot", kind: "error", text: t("Vous êtes hors connexion. Vérifiez votre connexion, puis réessayez."), retry: query }]);
      return;
    }
    setBusy(true);
    try {
      const d = await call("q" in query ? { q: query.q, page } : { id: query.id });
      const msg: Message = d.trouve && d.reponse
        ? { role: "bot", kind: "answer", answer: d.reponse, suggestions: d.suggestions || [] }
        : { role: "bot", kind: "notfound", empty: !!d.vide, suggestions: d.suggestions || [], contact: d.contact?.url || "/contact" };
      setMessages((m) => [...m, msg]);
    } catch (e) {
      const text = e instanceof Error && e.message === "throttle"
        ? t("Beaucoup de questions en peu de temps : patientez une minute, puis réessayez.")
        : t("L'assistant ne répond pas pour le moment. Vérifiez votre connexion et réessayez.");
      setMessages((m) => [...m, { role: "bot", kind: "error", text, retry: query }]);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    setText("");
    void ask({ q });
    input.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const chips = (list: Chip[], label: string) =>
    list.length > 0 && (
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p>
        <ul className="flex flex-wrap gap-2">
          {list.map((c) => (
            <li key={c.id}>
              <button type="button" className="assistant-chip" disabled={busy} onClick={() => void ask({ id: c.id, question: c.question })}>
                {c.question}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );

  const linkButton = (url: string, label: string, className: string) =>
    external(url) ? (
      <a href={url} target="_blank" rel="noopener" className={className}>
        {label}
        <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
      </a>
    ) : (
      <Link href={href(url)} className={className} onClick={onClose}>
        {label}
        <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </Link>
    );

  return (
    <div id="assistant-panel" ref={panel} role="dialog" aria-modal="true" aria-labelledby="assistant-title" hidden={!open} className="assistant-panel" onKeyDown={onKeyDown}>
      <div className="assistant-head">
        <span className="assistant-avatar" aria-hidden="true">
          <i className="fa-solid fa-comment-dots"></i>
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="assistant-title" className="no-bar text-lg leading-tight text-white">{t("Assistant ECiDé")}</h2>
          <p className="text-xs text-blue-100">{t("Réponses aux questions fréquentes, sans attente")}</p>
        </div>
        <button type="button" onClick={onClose} className="w-10 h-10 shrink-0 inline-flex items-center justify-center text-blue-100 hover:text-white hover:bg-white/10" aria-label={t("Fermer l'assistant")}>
          <i className="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
        </button>
      </div>

      <div ref={log} className="assistant-log" role="log" aria-live="polite" aria-relevant="additions" aria-busy={busy}>
        <div className="assistant-bubble assistant-bubble--bot">
          <p>{t("Bonjour ! Posez votre question sur le parti, l'adhésion, la carte de membre, les cotisations, les dons ou le site.")}</p>
        </div>
        {messages.length === 0 && (starters === null ? <p className="text-sm text-gray-500">{t("Chargement…")}</p> : chips(starters, t("Questions fréquentes")))}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="assistant-bubble assistant-bubble--user">
              <p>{m.text}</p>
            </div>
          ) : m.kind === "answer" ? (
            <div key={i} className="space-y-3">
              <div className="assistant-bubble assistant-bubble--bot">
                {paragraphs(m.answer.reponse).map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                {m.answer.lien && <div className="pt-1">{linkButton(m.answer.lien.url, m.answer.lien.libelle || t("En savoir plus"), "btn btn--dark btn--sm")}</div>}
              </div>
              {chips(m.suggestions, t("Questions proches"))}
            </div>
          ) : m.kind === "notfound" ? (
            <div key={i} className="space-y-3">
              <div className="assistant-bubble assistant-bubble--bot">
                <p>{m.empty ? t("Dites-m'en un peu plus : quelle est votre question ?") : t("Je n'ai pas trouvé de réponse à cette question. Essayez avec d'autres mots, choisissez une question ci-dessous ou écrivez-nous.")}</p>
                {!m.empty && <div className="pt-1">{linkButton(m.contact, t("Contacter le parti"), "btn btn--dark btn--sm")}</div>}
              </div>
              {chips(m.suggestions, t("Ces questions peuvent vous aider"))}
            </div>
          ) : (
            <div key={i} className="assistant-bubble assistant-bubble--error">
              <p>{m.text}</p>
              <button type="button" className="mt-2 font-bold underline" disabled={busy} onClick={() => void ask(m.retry, false)}>
                {t("Réessayer")}
              </button>
            </div>
          ),
        )}
        {busy && (
          <div className="assistant-bubble assistant-bubble--bot assistant-typing" aria-label={t("L'assistant cherche une réponse…")}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="assistant-form">
        <label htmlFor="assistant-input" className="sr-only">
          {t("Votre question")}
        </label>
        <input
          ref={input}
          id="assistant-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          autoComplete="off"
          enterKeyHint="send"
          placeholder={t("Écrivez votre question…")}
          className="assistant-input"
        />
        <button type="submit" className="assistant-send" disabled={busy || !text.trim()} aria-label={t("Envoyer la question")}>
          <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>
        </button>
      </form>
      <p className="assistant-note">{t("Assistant automatique : il ne consulte aucune donnée personnelle.")}</p>
    </div>
  );
}
