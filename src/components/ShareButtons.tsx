"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Partage d'une publication : X, Facebook, WhatsApp et copie du lien. */
export default function ShareButtons({ title }: { title: string }) {
  const { t } = useI18n();
  const url = SITE_URL + usePathname();
  const u = encodeURIComponent(url);
  const tt = encodeURIComponent(title);
  const cls = "w-11 h-11 bg-gray-100 hover:bg-ecideBlue hover:text-white text-gray-700 flex items-center justify-center transition";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      showToast(t("Lien copié dans le presse-papiers."));
    } catch {
      showToast(t("Impossible de copier le lien."), "error");
    }
  }

  return (
    <div className="border-y border-gray-200 py-6 flex flex-wrap items-center justify-between gap-4">
      <p className="font-bold text-gray-700">{t("Partager cette publication")}</p>
      <div className="flex flex-wrap gap-3">
        <a href={`https://twitter.com/intent/tweet?text=${tt}&url=${u}`} target="_blank" rel="noopener" className={cls} aria-label={t("Partager sur X")}><i className="fa-brands fa-x-twitter" aria-hidden="true"></i></a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${u}`} target="_blank" rel="noopener" className={cls} aria-label={t("Partager sur Facebook")}><i className="fa-brands fa-facebook" aria-hidden="true"></i></a>
        <a href={`https://wa.me/?text=${encodeURIComponent(title + " " + url)}`} target="_blank" rel="noopener" className={cls} aria-label={t("Partager sur WhatsApp")}><i className="fa-brands fa-whatsapp" aria-hidden="true"></i></a>
        <button type="button" onClick={copy} className="h-11 px-4 bg-gray-100 hover:bg-ecideBlue hover:text-white text-gray-700 font-bold flex items-center gap-2 transition"><i className="fa-solid fa-link" aria-hidden="true"></i> {t("Copier le lien")}</button>
      </div>
    </div>
  );
}
