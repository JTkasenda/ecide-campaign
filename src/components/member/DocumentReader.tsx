"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { safeUrl } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import { memberApi } from "@/lib/member";
import { articlesLabel, type LibraryDocument } from "./MemberLibrary";
import { Notice } from "./ui";

interface TocNode {
  id: string;
  niveau: number;
  libelle: string;
  enfants?: TocNode[];
}

interface Bloc {
  id: string;
  type: "preambule" | "titre" | "chapitre" | "section" | "paragraphe" | "article" | "texte";
  entete?: string;
  numero?: string;
  libelle?: string;
  texte?: string;
}

interface FullDocument extends LibraryDocument {
  toc: TocNode[];
  blocs: Bloc[];
}

interface Hit {
  id: string;
  label: string;
  /** Extrait : texte avant, mot trouvé, texte après */
  snippet?: [string, string, string];
}

const MAX_HITS = 20;
/** Marge haute sous l'en-tête du site, la navigation de l'espace membre et la barre de recherche. */
const ANCHOR = "scroll-mt-52 xl:scroll-mt-56";

/** Minuscules sans accents : « Étát » → « etat » (même longueur pour les lettres accentuées usuelles). */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Recherche par numéro : « 64 », « art 64 », « Article 1er », « 4 bis ». */
const NUM = /^(?:art(?:icle)?\.?\s*)?(\d+)\s*(?:er|re|e)?(?:\s+(bis|ter|quater))?$/;

/**
 * Lecture d'un document officiel dans l'espace membre : en-tête bleu nuit avec le PDF à
 * télécharger, sommaire collant (section en cours surlignée), recherche par mot ou numéro
 * d'article (le résultat choisi clignote), texte mis en page pour la lecture.
 */
export default function DocumentReader({ id }: { id: number }) {
  const { t, locale } = useI18n();
  const [doc, setDoc] = useState<FullDocument | null>(null);
  const [error, setError] = useState<"" | "notfound" | "error">("");
  const [errorText, setErrorText] = useState("");
  const [active, setActive] = useState("");
  const [tocOpen, setTocOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [flash, setFlash] = useState("");
  const tocRef = useRef<HTMLDivElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let live = true;
    memberApi<{ document: FullDocument }>(`bibliotheque/${id}`, locale).then((r) => {
      if (!live) return;
      if (r.ok) setDoc(r.data.document);
      else {
        setError(r.status === 404 ? "notfound" : "error");
        setErrorText(r.message);
      }
    });
    return () => {
      live = false;
    };
  }, [id, locale]);

  // Intitulés du sommaire, dans l'ordre du texte
  const headings = useMemo(() => {
    const out: string[] = [];
    const walk = (nodes: TocNode[]) => nodes.forEach((n) => (out.push(n.id), n.enfants && walk(n.enfants)));
    if (doc) walk(doc.toc);
    return out;
  }, [doc]);

  // Section en cours : dernier intitulé passé sous la barre de recherche
  useEffect(() => {
    if (!headings.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = headings[0];
      for (const h of headings) {
        const el = document.getElementById(h);
        if (el && el.getBoundingClientRect().top < 240) current = h;
        else if (el) break;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [headings]);

  // Le sommaire suit la lecture : l'intitulé en cours reste visible dans sa colonne
  useEffect(() => {
    const box = tocRef.current;
    const link = box?.querySelector<HTMLElement>(`[data-toc="${active}"]`);
    if (!box || !link || box.scrollHeight <= box.clientHeight) return;
    const top = link.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 40) box.scrollTop = top - box.clientHeight / 3;
  }, [active]);

  // Texte replié de chaque bloc, pour la recherche
  const index = useMemo(
    () => (doc ? doc.blocs.map((b) => ({ b, text: [b.entete, b.libelle, b.texte].filter(Boolean).join(" — "), label: blocLabel(b) })) : []),
    [doc],
  );

  const hits = useMemo<Hit[]>(() => {
    const q = fold(query.trim());
    if (!doc || q.length < 1) return [];
    const num = q.match(NUM);
    if (num) {
      const wanted = num[1].replace(/^0+/, "") + (num[2] ? ` ${num[2]}` : "");
      const found = doc.blocs.filter((b) => b.type === "article" && (b.numero === wanted || (!num[2] && b.numero?.startsWith(`${wanted} `))));
      if (found.length) return found.slice(0, MAX_HITS).map((b) => ({ id: b.id, label: b.libelle || "", snippet: b.texte ? ["", "", excerpt(b.texte)] : undefined }));
    }
    if (q.length < 2) return [];
    const out: Hit[] = [];
    for (const { b, text, label } of index) {
      const f = fold(text);
      const at = f.indexOf(q);
      if (at < 0) continue;
      // Positions identiques dans le texte d'origine quand le repliage garde la longueur
      const same = f.length === text.length;
      const start = Math.max(0, at - 50);
      const end = Math.min(text.length, at + q.length + 70);
      out.push({
        id: b.id,
        label,
        snippet: same ? [(start > 0 ? "…" : "") + text.slice(start, at), text.slice(at, at + q.length), text.slice(at + q.length, end) + (end < text.length ? "…" : "")] : ["", "", excerpt(text)],
      });
      if (out.length >= MAX_HITS) break;
    }
    return out;
  }, [query, doc, index]);

  const jump = useCallback((target: string) => {
    const el = document.getElementById(target);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setOpen(false);
    setTocOpen(false);
    setFlash(target);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(""), 2200);
  }, []);
  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return setOpen(false);
    if (!hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => (c + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      jump(hits[Math.min(cursor, hits.length - 1)].id);
    }
  };

  const back = (
    <Link href={localePath(locale as Locale, "/espace-membre/documents")} className="inline-flex items-center gap-2 text-sm font-semibold text-ecideBlue hover:underline py-2">
      <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>
      {t("Tous les documents")}
    </Link>
  );

  if (error) {
    return (
      <div className="space-y-4">
        {back}
        <Notice tone="error">{error === "notfound" ? t("Ce document n'est pas ou plus publié.") : errorText || t("Le document est momentanément indisponible.")}</Notice>
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="py-24 text-center text-gray-500" aria-live="polite">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-ecideBlue" aria-hidden="true"></i>
        <p className="mt-4">{t("Chargement du document…")}</p>
      </div>
    );
  }

  const pdf = doc.pdf ? safeUrl(doc.pdf) : "";
  const pdfButton = pdf && (
    <a href={pdf} download className="btn btn--outline btn--sm shrink-0">
      <i className="fa-solid fa-download" aria-hidden="true"></i>
      {t("Télécharger le PDF")}
    </a>
  );
  const empty = doc.blocs.length === 0;

  const toc = (
    <nav aria-label={t("Sommaire")}>
      <TocList nodes={doc.toc} active={active} onPick={jump} />
    </nav>
  );

  return (
    <div className="space-y-6">
      {back}
      <div className="m-page-head">
        <div className="m-page-head__text basis-60">
          <h1>{doc.titre}</h1>
          {doc.sous_titre && <p className="m-page-head__sub">{doc.sous_titre}</p>}
          {doc.articles > 0 && <p className="text-xs font-semibold text-gray-500 mt-1.5">{articlesLabel(doc.articles, t)}</p>}
        </div>
        {pdfButton}
      </div>

      {empty ? (
        <div className="member-box bg-white border border-gray-200 p-8 sm:p-10 text-center space-y-4">
          <span className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-ecideBlue-50 text-ecideBlue text-2xl" aria-hidden="true">
            <i className="fa-regular fa-file-lines"></i>
          </span>
          <p className="text-gray-700 max-w-md mx-auto">{pdf ? t("Le texte de ce document sera bientôt consultable en ligne. En attendant, téléchargez-le en PDF.") : t("Le texte de ce document sera bientôt consultable en ligne.")}</p>
          {pdf && (
            <a href={pdf} download className="inline-flex items-center gap-2 px-5 py-3 bg-ecideBlue text-white font-bold text-sm hover:bg-ecideDarkBlue">
              <i className="fa-solid fa-download" aria-hidden="true"></i>
              {t("Télécharger le PDF")}
            </a>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] items-start">
          {/* Sommaire : colonne collante sur grand écran */}
          {doc.toc.length > 0 && (
            <aside className="hidden lg:block sticky top-36 xl:top-40">
              <div ref={tocRef} className="member-box bg-white border border-gray-200 p-4 max-h-[calc(100vh-11rem)] xl:max-h-[calc(100vh-12rem)] overflow-y-auto">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{t("Sommaire")}</p>
                {toc}
              </div>
            </aside>
          )}

          <div className={`min-w-0 space-y-4 ${doc.toc.length ? "" : "lg:col-span-2"}`}>
            {/* Recherche (et sommaire repliable sur mobile) */}
            <div className="sticky top-30 xl:top-34 z-20 space-y-2 bg-ecideBlue-50 pt-3 -mt-3 pb-1">
              <div className="flex gap-2">
                {doc.toc.length > 0 && (
                  <button type="button" onClick={() => setTocOpen((o) => !o)} aria-expanded={tocOpen} aria-controls="doc-toc-mobile" className="lg:hidden shrink-0 inline-flex items-center gap-2 px-4 bg-ecideDarkBlue text-white text-sm font-bold">
                    <i className="fa-solid fa-list-ul" aria-hidden="true"></i>
                    {t("Sommaire")}
                  </button>
                )}
                <div className="relative flex-1 min-w-0">
                  <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true"></i>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => (setQuery(e.target.value), setOpen(true), setCursor(0))}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={onKey}
                    placeholder={t("Mot ou n° d'article")}
                    aria-label={t("Rechercher dans le document")}
                    role="combobox"
                    aria-expanded={open && query.trim() !== ""}
                    aria-controls="doc-search-results"
                    aria-autocomplete="list"
                    className="member-box w-full py-3.5 pl-11 pr-11 bg-white border border-gray-200 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-ecideBlue [&::-webkit-search-cancel-button]:hidden"
                  />
                  {query && (
                    <button type="button" onClick={() => (setQuery(""), setOpen(false))} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center text-gray-500 hover:text-ecideDarkBlue" aria-label={t("Effacer la recherche")}>
                      <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                  )}
                  {open && query.trim() !== "" && (
                    <ul id="doc-search-results" role="listbox" className="member-box absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-[60vh] overflow-y-auto z-30">
                      {hits.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-gray-500">{fold(query.trim()).length < 2 && !NUM.test(fold(query.trim())) ? t("Tapez au moins deux lettres.") : t("Aucun résultat.")}</li>
                      ) : (
                        hits.map((h, i) => (
                          <li key={h.id} role="option" aria-selected={i === cursor}>
                            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => jump(h.id)} onMouseEnter={() => setCursor(i)} className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 ${i === cursor ? "bg-ecideBlue-50" : ""}`}>
                              <span className="block text-sm font-bold text-ecideDarkBlue">{h.label}</span>
                              {h.snippet && (
                                <span className="block text-sm text-gray-600 mt-0.5 line-clamp-2">
                                  {h.snippet[0]}
                                  {h.snippet[1] && <mark className="bg-ecideYellow/60 text-gray-900 px-0.5">{h.snippet[1]}</mark>}
                                  {h.snippet[2]}
                                </span>
                              )}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </div>
              {tocOpen && (
                <div id="doc-toc-mobile" className="lg:hidden member-box bg-white border border-gray-200 shadow-lg p-4 max-h-[60vh] overflow-y-auto">
                  {toc}
                </div>
              )}
            </div>

            <article className="member-box bg-white border border-gray-200 px-5 py-8 sm:px-10 sm:py-10">
              {doc.blocs.map((b) => (
                <BlocView key={b.id} b={b} flash={flash === b.id} />
              ))}
            </article>
          </div>
        </div>
      )}
    </div>
  );
}

/** Libellé d'un bloc dans les résultats de recherche. */
function blocLabel(b: Bloc): string {
  if (b.type === "article") return b.libelle || "";
  if (b.type === "texte") return "";
  return [b.entete, b.libelle].filter(Boolean).join(" : ");
}

/** Début d'un texte, pour un résultat sans mot surligné. */
function excerpt(s: string): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > 120 ? `${flat.slice(0, 120)}…` : flat;
}

function TocList({ nodes, active, onPick }: { nodes: TocNode[]; active: string; onPick: (id: string) => void }) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((n) => (
        <li key={n.id}>
          <a
            href={`#${n.id}`}
            data-toc={n.id}
            onClick={(e) => (e.preventDefault(), onPick(n.id))}
            aria-current={active === n.id ? "location" : undefined}
            className={`block py-1.5 pr-2 border-l-2 text-sm leading-snug transition-colors ${n.niveau === 1 ? "font-bold text-xs tracking-wide text-ecideDarkBlue mt-2" : "text-gray-600"} ${active === n.id ? "border-ecideYellow bg-ecideYellow/15 text-ecideDarkBlue" : "border-transparent hover:text-ecideBlue"}`}
            style={{ paddingLeft: `${0.5 + (n.niveau - 1) * 0.85}rem` }}
          >
            {n.libelle}
          </a>
          {n.enfants && <TocList nodes={n.enfants} active={active} onPick={onPick} />}
        </li>
      ))}
    </ul>
  );
}

/** Paragraphes d'un texte (une ligne par paragraphe), en caractères de lecture. */
function Paragraphs({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <>
      {text.split("\n").map((p, i) => (
        <p key={i} className="font-serif text-[1.075rem] leading-[1.7] text-gray-800 max-w-[70ch] mt-3 first:mt-0">
          {p}
        </p>
      ))}
    </>
  );
}

function BlocView({ b, flash }: { b: Bloc; flash: boolean }) {
  const ring = `transition-colors duration-700 ${flash ? "bg-ecideYellow/30" : "bg-transparent"}`;
  let content: ReactNode;
  switch (b.type) {
    case "preambule":
    case "titre":
      content = (
        <h2 className="no-bar text-center pt-8 pb-2">
          <span className="inline-block border-b-4 border-ecideYellow pb-2 text-ecideDarkBlue tracking-wide">
            <span className={b.type === "titre" && b.libelle ? "block text-base sm:text-lg font-bold" : "block text-2xl sm:text-3xl font-bold"}>{b.entete}</span>
            {b.libelle && <span className="block text-xl sm:text-2xl font-bold mt-1">{b.libelle}</span>}
          </span>
        </h2>
      );
      break;
    case "chapitre":
      content = (
        <h3 className="text-center pt-6 text-ecideDarkBlue">
          <span className="block text-sm font-bold tracking-wider text-ecideBlue">{b.entete}</span>
          {b.libelle && <span className="block text-xl font-bold mt-1">{b.libelle}</span>}
        </h3>
      );
      break;
    case "section":
      content = (
        <h4 className="pt-5 text-lg font-bold text-ecideDarkBlue">
          {b.entete}
          {b.libelle && <Fragment> : {b.libelle}</Fragment>}
        </h4>
      );
      break;
    case "paragraphe":
      content = (
        <h5 className="pt-4 font-semibold italic text-ecideDarkBlue">
          {b.entete}
          {b.libelle && <Fragment> : {b.libelle}</Fragment>}
        </h5>
      );
      break;
    case "article":
      content = (
        <>
          <h4 className="font-bold text-ecideDarkBlue text-base mb-2">{b.libelle}</h4>
          <Paragraphs text={b.texte} />
        </>
      );
      break;
    default:
      content = <Paragraphs text={b.texte} />;
  }
  return (
    <section id={b.id} className={`${ANCHOR} ${ring} -mx-3 px-3 py-3 rounded-sm`}>
      {content}
    </section>
  );
}
