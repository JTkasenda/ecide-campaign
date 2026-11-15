"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/locales";
import { memberApi } from "@/lib/member";
import { MemberCardBox, MemberPageHeader, Notice } from "./ui";

interface Internal {
  id: number;
  reference: string | null;
  titre: string;
  sousTitre: string | null;
  date: string;
  lieu: string | null;
  paragraphes: string[];
  encadre: { titre: string | null; texte: string } | null;
  signataire: string;
}
interface PublicNews {
  slug: string;
  titre: string;
  resume?: string;
  date?: string;
  image?: string;
}

/** Ligne d'un communiqué : considérants en italique, **gras**. */
function Paragraph({ text }: { text: string }) {
  const bold = /^\*\*(.+)\*\*$/.exec(text.trim());
  if (bold) return <p className="font-bold text-gray-900">{bold[1]}</p>;
  if (/^(vu|considérant|considerant|à la demande|a la demande)\b/i.test(text.trim())) return <p className="italic text-gray-700 pl-4 border-l-2 border-ecideYellow">{text}</p>;
  return <p className="text-gray-800">{text}</p>;
}

/**
 * Actualités du membre : communications internes du parti (réservées aux membres), puis les
 * dernières actualités publiques du site.
 */
export default function MemberNews() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<{ internes: Internal[]; actualites: PublicNews[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    memberApi<{ internes: Internal[]; actualites: PublicNews[] }>("actualites", locale).then((r) => (r.ok ? setData({ internes: r.data.internes || [], actualites: r.data.actualites || [] }) : setError(r.message || t("Les actualités sont momentanément indisponibles."))));
  }, [locale, t]);

  const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : "");

  return (
    <div className="space-y-8">
      <MemberPageHeader title={t("Actualités")} subtitle={t("Annonces, communiqués et communications internes du parti.")} />
      {error && <Notice tone="error">{error}</Notice>}
      {!data && !error && <p className="text-sm text-gray-500"><i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>{t("Chargement…")}</p>}
      {data && (
        <>
          <section className="space-y-4">
            <h2 className="text-2xl text-ecideDarkBlue no-bar member-title flex items-center gap-3"><i className="fa-solid fa-lock text-base text-ecideYellow-700" aria-hidden="true"></i>{t("Communications internes")}</h2>
            {data.internes.length ? (
              data.internes.map((c) => (
                <MemberCardBox key={c.id} className="space-y-4 scroll-mt-40">
                  <div id={`communique-${c.id}`} className="scroll-mt-40">
                    <p className="text-xs font-semibold text-ecideBlue">{t("Communication interne")} · {date(c.date)}{c.reference ? ` · ${c.reference}` : ""}</p>
                    <h3 className="text-2xl font-display text-ecideDarkBlue leading-tight mt-1">{c.titre}</h3>
                    {c.sousTitre && <p className="text-gray-500">{c.sousTitre}</p>}
                  </div>
                  <div className="space-y-2 font-serif leading-relaxed max-w-prose">{c.paragraphes.map((p, i) => <Paragraph key={i} text={p} />)}</div>
                  {c.encadre && (
                    <div className="border border-ecideDarkBlue/20 bg-ecideBlue-50 p-4">
                      {c.encadre.titre && <p className="font-bold text-ecideDarkBlue mb-1">{c.encadre.titre}</p>}
                      <p className="text-sm text-gray-700 whitespace-pre-line">{c.encadre.texte}</p>
                    </div>
                  )}
                  {c.signataire && <p className="text-right text-sm text-gray-600 italic">{c.lieu ? `${t("Fait à :lieu", { lieu: c.lieu })} · ` : ""}{c.signataire}</p>}
                </MemberCardBox>
              ))
            ) : (
              <p className="text-sm text-gray-500">{t("Aucune communication interne pour le moment.")}</p>
            )}
          </section>
          <section className="space-y-4">
            <h2 className="text-2xl text-ecideDarkBlue no-bar member-title">{t("Annonces et communiqués")}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {data.actualites.map((n) => (
                <Link key={n.slug} href={localePath(locale as Locale, `/actualites/${n.slug}`)} className="member-box flex gap-3 bg-white border border-gray-200 p-4 hover:border-ecideBlue transition">
                  {n.image ? <img src={n.image} alt="" className="w-20 h-20 object-cover shrink-0" /> : <span className="w-9 h-9 shrink-0 bg-ecideBlue-50 text-ecideBlue flex items-center justify-center"><i className="fa-solid fa-bullhorn text-sm" aria-hidden="true"></i></span>}
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold text-ecideBlue">{date(n.date)}</span>
                    <span className="block font-bold text-gray-900 leading-snug">{n.titre}</span>
                    {n.resume && <span className="block text-xs text-gray-500 line-clamp-2 mt-0.5">{n.resume}</span>}
                  </span>
                </Link>
              ))}
            </div>
            <Link href={localePath(locale as Locale, "/actualites")} className="inline-flex items-center gap-2 text-sm font-bold text-ecideBlue hover:text-ecideDarkBlue">{t("Toutes les actualités du site")} <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i></Link>
          </section>
        </>
      )}
    </div>
  );
}
