import Link from "next/link";
import type { ReactNode } from "react";
import { safeUrl } from "@/lib/format";
import type { T } from "@/lib/t";
import type { PartyDocument } from "@/lib/types";

/** Boutons du bandeau d'une page-document : téléchargement du PDF, boutons libres, retour vers la page parente. */
export function DocumentButtons({ doc, t, back, children }: { doc: PartyDocument | null; t: T; back: { href: string; label: string }; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-3 shrink-0">
      {doc?.url && (
        <a href={safeUrl(doc.url)} download className="btn btn--primary">
          <i className="fa-solid fa-download" aria-hidden="true"></i>
          {t("Télécharger le PDF")}
        </a>
      )}
      {children}
      <Link href={back.href} className="btn btn--outline-white">{back.label}</Link>
    </div>
  );
}

/**
 * Document PDF publié dans l'administration : nom, taille et date de mise à jour, boutons de
 * téléchargement et d'ouverture, puis l'aperçu dans la page (lecteur PDF du navigateur ; quand il
 * n'en a pas, invitation à télécharger). Sans fichier, un encart « publication à venir ».
 * Le fichier est servi par le site lui-même (relais de /uploads vers l'API), donc l'aperçu et le
 * téléchargement direct fonctionnent sans appel au serveur Laravel depuis le navigateur.
 */
export default function PdfDocument({ doc, title, t }: { doc: PartyDocument | null; title: string; t: T }) {
  const url = doc?.url ? safeUrl(doc.url) : "";
  if (!doc || !url) {
    return (
      <section id="document" className="bg-white py-12 lg:py-16 px-6 scroll-mt-32">
        <div className="max-w-6xl mx-auto panel p-10 lg:p-14 text-center space-y-4 reveal">
          <div className="flex justify-center"><span className="icon-tile icon-tile--dark"><i className="fa-regular fa-file-pdf" aria-hidden="true"></i></span></div>
          <h2 className="text-2xl text-ecideDarkBlue no-bar">{title}</h2>
          <p className="text-gray-600">{t("Le document sera publié prochainement.")}</p>
        </div>
      </section>
    );
  }
  const download = (cls: string) => (
    <a href={url} download className={cls}>
      <i className="fa-solid fa-download" aria-hidden="true"></i>
      {t("Télécharger le PDF")}
    </a>
  );
  return (
    <section id="document" className="bg-white py-12 lg:py-16 px-6 scroll-mt-32">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 reveal">
          <div className="flex items-center gap-4 min-w-0">
            <span className="icon-tile w-12 h-12 bg-red-600 text-white shrink-0"><i className="fa-regular fa-file-pdf" aria-hidden="true"></i></span>
            <div className="min-w-0">
              <h2 className="text-2xl text-ecideDarkBlue no-bar leading-tight">{title}</h2>
              <p className="text-sm text-gray-500 font-sans">
                PDF{doc.taille ? ` · ${doc.taille}` : ""}{doc.dateLabel ? ` · ${t("mis à jour le")} ${doc.dateLabel}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            {download("btn btn--dark btn--sm")}
            <a href={url} target="_blank" rel="noopener" className="btn btn--outline btn--sm text-ecideDarkBlue">
              <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
              {t("Ouvrir dans un nouvel onglet")}
            </a>
          </div>
        </div>
        <object data={`${url}#view=FitH`} type="application/pdf" className="pdf-frame w-full bg-gray-100 border border-gray-200 reveal" aria-label={title}>
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 p-10">
            <i className="fa-regular fa-file-pdf text-5xl text-red-600" aria-hidden="true"></i>
            <p className="text-gray-600 max-w-md">{t("Votre navigateur ne peut pas afficher ce document ici : téléchargez-le pour le lire.")}</p>
            {download("btn btn--dark")}
          </div>
        </object>
      </div>
    </section>
  );
}
