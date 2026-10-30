import Link from "next/link";
import { localePath, type Locale } from "@/lib/locales";
import { siteNav } from "@/lib/nav";
import { getT } from "@/lib/server";
import { telHref, safeUrl } from "@/lib/format";
import type { Site } from "@/lib/types";
import NewsletterForm from "./NewsletterForm";

/**
 * Pied de page façon site de campagne : bleu nuit, logo et réseaux sociaux, colonnes de liens
 * en capitales espacées, coordonnées et inscription aux communiqués, mentions en bas.
 */
export default async function Footer({ site, locale }: { site: Site; locale: Locale }) {
  const t = await getT(locale);
  const p = site.params;
  const navLinks = siteNav(site, t).filter((n) => n.key !== "home");

  return (
    <footer className="bg-ecideDarkBlue text-white text-sm diag">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Link href={localePath(locale, "/")} className="flex items-center gap-3">
            <img src="/assets/img/logo-160.png" alt="" width={56} height={56} loading="lazy" className="w-14 h-14 rounded-full" />
            <span>
              <span className="font-display font-black text-3xl block leading-none">{p.nom || "ECiDé"}</span>
              <span className="eyebrow text-[10px] mt-1 block">{p.slogan || "C'est possible"}</span>
            </span>
          </Link>
          <p className="text-blue-100 leading-relaxed max-w-sm">{p.footerTexte || ""}</p>
          {site.socials.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {site.socials.map((s) => (
                <li key={s.key}>
                  <a href={safeUrl(s.url)} target="_blank" rel="noopener" className="w-10 h-10 bg-white/10 text-white hover:bg-ecideYellow hover:text-ecideDarkBlue transition flex items-center justify-center" aria-label={s.label}>
                    <i className={`fa-brands ${s.icon}`} aria-hidden="true"></i>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="eyebrow text-xs normal-case">{t("Navigation")}</h2>
          <ul className="space-y-2.5 font-sans font-semibold text-blue-100">
            {navLinks.map((n) => (
              <li key={n.id || n.url}>
                <Link href={localePath(locale, n.url)} className="hover:text-ecideYellow">{n.libelle}</Link>
              </li>
            ))}
            <li>
              <Link href={localePath(locale, "/adherer")} className="hover:text-ecideYellow">{t("Adhésion & Don")}</Link>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <h2 className="eyebrow text-xs">{t("Nos Combats")}</h2>
          <ul className="space-y-2.5 font-sans font-semibold text-blue-100">
            {p.footerCombats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <h2 className="eyebrow text-xs">{t("Contact")}</h2>
          <address className="not-italic space-y-1.5 font-sans text-blue-100">
            {p.adresse && <p className="font-sans">{p.adresse}</p>}
            {p.email && (
              <p className="font-sans">
                <a href={`mailto:${p.email}`} className="hover:text-ecideYellow">{p.email}</a>
              </p>
            )}
            {p.telephone && (
              <p className="font-sans">
                <a href={telHref(p.telephone)} className="hover:text-ecideYellow">{p.telephone}</a>
              </p>
            )}
          </address>
          {p.newsletter && (
            <NewsletterForm
              variant="footer"
              labels={{ title: t("Recevoir les communiqués"), placeholder: t("Votre e-mail"), phone: t("Votre numéro (SMS)"), note: t("Par e-mail, par SMS ou les deux."), submit: t("S'abonner"), success: t("Merci ! Vous recevrez nos communiqués officiels.") }}
            />
          )}
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:flex-wrap justify-between items-center gap-4 font-sans text-blue-200 text-xs tracking-wide">
          <p className="font-sans">
            &copy; {new Date().getFullYear()} {p.copyright || `${p.nom || "ECiDé"} - ${t("Tous droits réservés.")}`}
          </p>
          <ul className="flex flex-wrap justify-center gap-6 uppercase font-bold tracking-widest text-[11px]">
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
