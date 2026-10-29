import Link from "next/link";
import { localePath, type Locale } from "@/lib/locales";
import { siteNav } from "@/lib/nav";
import { getT } from "@/lib/server";
import { telHref, safeUrl } from "@/lib/format";
import type { Site } from "@/lib/types";
import NewsletterForm from "./NewsletterForm";

/**
 * Pied de page façon site de campagne : fond clair, colonnes de liens, coordonnées et
 * inscription aux communiqués ; barre de bas de page bleu nuit.
 */
export default async function Footer({ site, locale }: { site: Site; locale: Locale }) {
  const t = await getT(locale);
  const p = site.params;
  const navLinks = siteNav(site).filter((n) => n.key !== "home");

  return (
    <footer className="bg-white border-t border-gray-200 text-sm">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
        <div className="lg:col-span-4 space-y-5">
          <Link href={localePath(locale, "/")} className="flex items-center gap-3">
            <img src="/assets/img/logo-160.png" alt="" width={48} height={48} loading="lazy" className="w-12 h-12 rounded-full" />
            <span>
              <span className="font-black text-2xl text-ecideBlue block leading-none tracking-tight">{p.nom || "ECiDé"}</span>
              <span className="text-xs text-gray-600 font-semibold">{p.slogan || "C'est possible"}</span>
            </span>
          </Link>
          <p className="text-gray-600 leading-relaxed max-w-sm">{p.footerTexte || ""}</p>
          <address className="not-italic space-y-1.5 text-gray-600">
            {p.nomLong && <p className="font-semibold text-gray-900">{p.nomLong}</p>}
            {p.adresse && <p>{p.adresse}</p>}
            {p.email && (
              <p>
                <a href={`mailto:${p.email}`} className="hover:text-ecideBlue">{p.email}</a>
              </p>
            )}
            {p.telephone && (
              <p>
                <a href={telHref(p.telephone)} className="hover:text-ecideBlue">{p.telephone}</a>
              </p>
            )}
          </address>
          {site.socials.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {site.socials.map((s) => (
                <li key={s.key}>
                  <a href={safeUrl(s.url)} target="_blank" rel="noopener" className="w-10 h-10 rounded-full bg-gray-100 text-gray-800 hover:bg-ecideBlue hover:text-white transition flex items-center justify-center" aria-label={s.label}>
                    <i className={`fa-brands ${s.icon}`} aria-hidden="true"></i>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-gray-900 text-base normal-case tracking-normal">{t("Navigation")}</h2>
          <ul className="space-y-2.5 text-gray-600">
            {navLinks.map((n) => (
              <li key={n.id || n.url}>
                <Link href={localePath(locale, n.url)} className="hover:text-ecideBlue">{n.libelle}</Link>
              </li>
            ))}
            <li>
              <Link href={localePath(locale, "/adherer")} className="hover:text-ecideBlue">{t("Adhésion & Don")}</Link>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <h2 className="font-bold text-gray-900 text-base normal-case tracking-normal">{t("Nos Combats")}</h2>
          <ul className="space-y-2.5 text-gray-600">
            {p.footerCombats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <h2 className="font-bold text-gray-900 text-base normal-case tracking-normal">{t("Agir")}</h2>
          <div className="flex flex-wrap gap-3">
            <Link href={localePath(locale, site.cta.url)} className="btn btn--dark btn--sm">
              {site.cta.label} <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
            </Link>
            <Link href={`${localePath(locale, "/adherer")}#don`} className="btn btn--primary btn--sm">
              {t("Faire un don")} <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
            </Link>
          </div>
          {p.newsletter && (
            <NewsletterForm
              variant="footer"
              labels={{ title: t("Recevoir les communiqués"), placeholder: t("Votre e-mail"), submit: t("S'abonner"), success: t("Merci ! Vous recevrez nos communiqués officiels.") }}
            />
          )}
        </div>
      </div>

      <div className="bg-ecideDarkBlue text-blue-100">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:flex-wrap justify-between items-center gap-4 font-medium">
          <p>
            &copy; {new Date().getFullYear()} {p.copyright || `${p.nom || "ECiDé"} - ${t("Tous droits réservés.")}`}
          </p>
          <ul className="flex flex-wrap justify-center gap-6">
            <li>
              <Link href={localePath(locale, "/contact")} className="hover:text-white transition">{t("Contact")}</Link>
            </li>
            <li>
              <Link href={localePath(locale, "/mentions-legales")} className="hover:text-white transition">{t("Mentions légales")}</Link>
            </li>
            <li className="hidden md:block">
              <a href={safeUrl(site.admin)} className="hover:text-white transition">
                <i className="fa-solid fa-lock mr-1" aria-hidden="true"></i>
                {t("Espace Admin")}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
