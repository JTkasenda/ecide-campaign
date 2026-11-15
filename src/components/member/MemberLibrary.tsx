"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { safeUrl } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import { memberApi } from "@/lib/member";
import { MemberCardBox, MemberPageHeader, Notice } from "./ui";

export interface LibraryDocument {
  id: number;
  titre: string;
  sous_titre: string | null;
  articles: number;
  pdf: string | null;
  majLe: string | null;
}

/** « 1 article », « 64 articles ». */
export const articlesLabel = (n: number, t: (s: string, p?: Record<string, string | number>) => string) => (n > 1 ? t(":n articles", { n }) : t(":n article", { n }));

/**
 * Espace membre · Documents officiels : textes publiés dans l'administration (Constitution,
 * Statuts, Charte…), à lire en ligne avec leur sommaire ou à télécharger en PDF.
 */
export default function MemberLibrary() {
  const { t, locale } = useI18n();
  const [docs, setDocs] = useState<LibraryDocument[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    memberApi<{ documents: LibraryDocument[] }>("bibliotheque", locale).then((r) => {
      if (!live) return;
      if (r.ok) setDocs(r.data.documents);
      else setError(r.message || t("Les documents sont momentanément indisponibles."));
    });
    return () => {
      live = false;
    };
  }, [locale, t]);

  return (
    <div className="space-y-6">
      <MemberPageHeader title={t("Documents officiels")} subtitle={t("Les textes fondateurs du parti et de la République, à lire et à rechercher.")} />
      {error && <Notice tone="error">{error}</Notice>}
      {!docs && !error && (
        <div className="py-16 text-center text-gray-500" aria-live="polite">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-ecideBlue" aria-hidden="true"></i>
        </div>
      )}
      {docs && docs.length === 0 && <Notice>{t("Aucun document n'est encore publié.")}</Notice>}
      {docs && docs.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {docs.map((d) => {
            const href = localePath(locale as Locale, `/espace-membre/documents/${d.id}`);
            return (
              <li key={d.id}>
                <MemberCardBox className="h-full flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <span className="w-12 h-12 shrink-0 inline-flex items-center justify-center bg-ecideDarkBlue text-ecideYellow text-xl" aria-hidden="true">
                      <i className="fa-solid fa-scale-balanced"></i>
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-ecideDarkBlue leading-snug no-bar">
                        <Link href={href} className="hover:underline">{d.titre}</Link>
                      </h2>
                      {d.sous_titre && <p className="text-sm text-gray-500 mt-1">{d.sous_titre}</p>}
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-2">{d.articles > 0 ? articlesLabel(d.articles, t) : t("Texte en ligne à venir")}</p>
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link href={href} className="inline-flex items-center gap-2 px-4 py-2.5 bg-ecideBlue text-white text-sm font-bold hover:bg-ecideDarkBlue">
                      <i className="fa-solid fa-book-open" aria-hidden="true"></i>
                      {t("Lire")}
                    </Link>
                    {d.pdf && (
                      <a href={safeUrl(d.pdf)} download className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-ecideDarkBlue text-sm font-bold hover:border-ecideBlue">
                        <i className="fa-solid fa-download" aria-hidden="true"></i>
                        {t("PDF")}
                      </a>
                    )}
                  </div>
                </MemberCardBox>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
