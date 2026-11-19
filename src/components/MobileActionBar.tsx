"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { isLocale, localePath, type Locale } from "@/lib/locales";
import type { Site } from "@/lib/types";

/** Pages où la barre ferait doublon : on y est déjà pour adhérer ou donner. */
const HIDDEN = /^\/(adherer|don|espace-membre|verifier)(\/|$)/;

/**
 * Barre d'action mobile (< 1024 px) : « Adhérer » et « Faire un don » collés au bas de l'écran,
 * qui apparaissent une fois le premier écran passé. Sur téléphone, l'en-tête n'a la place que
 * pour le don ; adhérer reste ainsi à un geste, sans remonter.
 */
export default function MobileActionBar({ site, locale }: { site: Site; locale: Locale }) {
  const { t } = useI18n();
  const parts = usePathname().split("/").filter(Boolean);
  if (isLocale(parts[0])) parts.shift();
  const path = "/" + parts.join("/");
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const toggle = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener("scroll", toggle, { passive: true });
    toggle();
    return () => window.removeEventListener("scroll", toggle);
  }, []);
  if (HIDDEN.test(path)) return null;

  const don = site.params.don && /^https?:\/\//i.test(site.params.don) ? site.params.don : localePath(locale, "/don");
  const external = /^https?:/i.test(don);

  return (
    <div className={`mobile-actions lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 ${visible ? "is-visible" : ""}`} aria-hidden={!visible} inert={!visible}>
      <div className="max-w-xl mx-auto grid grid-cols-2 gap-3">
        <Link href={localePath(locale, site.cta.url)} className="btn btn--dark btn--sm">
          <i className="fa-solid fa-id-card" aria-hidden="true"></i>
          {site.cta.label}
        </Link>
        {external ? (
          <a href={don} target="_blank" rel="noopener" className="btn btn--primary btn--sm">
            <i className="fa-solid fa-hand-holding-heart" aria-hidden="true"></i>
            {t("Faire un don")}
          </a>
        ) : (
          <Link href={don} className="btn btn--primary btn--sm">
            <i className="fa-solid fa-hand-holding-heart" aria-hidden="true"></i>
            {t("Faire un don")}
          </Link>
        )}
      </div>
    </div>
  );
}
