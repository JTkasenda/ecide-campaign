"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { isLocale, localePath, type Locale } from "@/lib/locales";
import { headerNav } from "@/lib/nav";
import type { Site } from "@/lib/types";

/**
 * Fil d'Ariane des sous-pages rangées dans un menu déroulant (Organigramme, Charte, Cadres,
 * Diaspora sous « Le Parti » ; Biographie sous « Président ») : le visiteur voit où il se trouve
 * et remonte d'un clic. Les autres pages n'en ont pas (les articles ont le leur).
 */
export default function Breadcrumbs({ site, locale }: { site: Site; locale: Locale }) {
  const { t } = useI18n();
  const parts = usePathname().split("/").filter(Boolean);
  if (isLocale(parts[0])) parts.shift();
  const path = "/" + parts.join("/");
  const group = headerNav(site, [site.cta.url, "/adherer", "/don"]).find((g) => g.children.some((c) => c.url === path));
  const page = group?.children.find((c) => c.url === path);
  if (!group || !page) return null;

  return (
    <nav aria-label={t("Fil d'Ariane")} className="bg-white border-b border-gray-200">
      <ol className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-sans font-semibold text-gray-500">
        <li>
          <Link href={localePath(locale, "/")} className="hover:text-ecideBlue">{t("Accueil")}</Link>
        </li>
        <li aria-hidden="true" className="text-gray-300">/</li>
        <li>
          <Link href={localePath(locale, group.url)} className="hover:text-ecideBlue">{group.libelle}</Link>
        </li>
        <li aria-hidden="true" className="text-gray-300">/</li>
        <li aria-current="page" className="text-ecideDarkBlue">{page.libelle}</li>
      </ol>
    </nav>
  );
}
