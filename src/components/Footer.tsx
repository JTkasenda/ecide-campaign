import Link from "next/link";
import { localePath, type Locale } from "@/lib/locales";
import { headerNav } from "@/lib/nav";
import { getT } from "@/lib/server";
import { telHref, safeUrl } from "@/lib/format";
import type { Site } from "@/lib/types";
import NewsletterForm from "./NewsletterForm";

/**
 * Pied de page façon site de campagne : bleu nuit, logo, combats et réseaux sociaux ; les liens
 * rangés comme le menu de l'en-tête (une colonne par rubrique à sous-pages, puis « Agir ») ;
 * coordonnées et inscription aux communiqués ; mentions en bas.
 * Téléphone et tablette (< 1024 px) : version centrée façon warnockforgeorgia.com (logo, liens en
 * capitales qui passent à la ligne, mentions, réseaux, copyright dans un cadre) ; mêmes contenus.
 */
export default async function Footer({ site, locale }: { site: Site; locale: Locale }) {
  const t = await getT(locale);
  const p = site.params;
  // Rubriques à sous-pages (Le Parti, Président) : une colonne chacune ; le reste dans « Agir »
  const groups = headerNav(site);
  const sections = groups.filter((g) => g.children.length && !g.children.every((c) => ["/adherer", "/don"].includes(c.url)));
  const autres = groups.filter((g) => !sections.includes(g)).flatMap((g) => [g, ...g.children]);
  const linkCls = "hover:text-ecideYellow transition";
  const copyright = p.copyright || `${p.nom || "ECiDé"} - ${t("Tous droits réservés.")}`;
  // Liens du pied de page mobile : rubriques et sous-pages, puis les pages de service (sans doublon)
  const legal = [
    { url: "/contact", libelle: t("Contact") },
    { url: "/verifier", libelle: t("Vérifier une carte de membre") },
    { url: "/mentions-legales", libelle: t("Mentions légales") },
  ];
  const mobileLinks = [...groups.flatMap((g) => [g, ...g.children]), ...legal].filter((n, i, all) => all.findIndex((m) => m.url === n.url) === i);

  return (
    <footer className="bg-ecideDarkBlue text-white text-sm diag">
      {/* Téléphone et tablette */}
      <div className="site-foot lg:hidden">
        <Link href={localePath(locale, "/")} className="site-foot__brand">
          <img src={site.assets.logo || "/assets/img/logo-160.png"} alt="" width={72} height={72} loading="lazy" className="w-[4.5rem] h-[4.5rem] rounded-full object-cover" />
          <span className="font-display font-black text-4xl block leading-none" translate="no">{p.nom || "ECiDé"}</span>
          {p.slogan && <span className="eyebrow text-[11px] block">{p.slogan}</span>}
        </Link>
        <nav aria-label={t("Plan du site")}>
          <ul className="site-foot__links">
            {mobileLinks.map((n) => (
              <li key={n.url}>
                <Link href={localePath(locale, n.url)}>{n.libelle}</Link>
              </li>
            ))}
          </ul>
        </nav>
        {p.footerTexte && <p className="site-foot__legal">{p.footerTexte}</p>}
        {(p.adresse || p.email || p.telephone) && (
          <address className="site-foot__legal not-italic">
            {p.adresse && <span className="block">{p.adresse}</span>}
            {p.email && <a href={`mailto:${p.email}`} className="site-foot__inline">{p.email}</a>}
            {p.telephone && <a href={telHref(p.telephone)} className="site-foot__inline">{p.telephone}</a>}
          </address>
        )}
        {p.footerCombats.length > 0 && (
          <ul className="site-foot__chips" aria-label={t("Nos Combats")}>
            {p.footerCombats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        )}
        {p.newsletter && (
          <div className="site-foot__news">
            <NewsletterForm
              variant="footer"
              idPrefix="footerEmailMobile"
              labels={{ title: t("Recevoir les communiqués"), placeholder: t("Votre e-mail"), phone: t("Votre numéro (SMS)"), note: t("Par e-mail, par SMS ou les deux."), submit: t("S'abonner"), success: t("Merci ! Vous recevrez nos communiqués officiels.") }}
            />
          </div>
        )}
        {site.socials.length > 0 && (
          <ul className="site-foot__socials">
            {site.socials.map((s) => (
              <li key={s.key}>
                <a href={safeUrl(s.url)} target="_blank" rel="noopener" aria-label={s.label}>
                  <i className={`fa-brands ${s.icon}`} aria-hidden="true"></i>
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="site-foot__box">&copy; {new Date().getFullYear()} {copyright}</p>
        <a href={safeUrl(site.admin)} className="site-foot__admin hidden md:inline-flex">
          <i className="fa-solid fa-lock" aria-hidden="true"></i>
          {t("Espace Admin")}
        </a>
      </div>

      <div className="hidden lg:block">
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-10">
        <div className="sm:col-span-2 lg:col-span-4 space-y-6">
          <Link href={localePath(locale, "/")} className="flex items-center gap-3">
            <img src={site.assets.logo || "/assets/img/logo-160.png"} alt="" width={56} height={56} loading="lazy" className="w-14 h-14 rounded-full object-cover" />
            <span>
              <span className="font-display font-black text-3xl block leading-none" translate="no">{p.nom || "ECiDé"}</span>
              <span className="eyebrow text-[10px] mt-1 block">{p.slogan}</span>
            </span>
          </Link>
          <p className="text-blue-100 leading-relaxed max-w-sm">{p.footerTexte || ""}</p>
          {p.footerCombats.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label={t("Nos Combats")}>
              {p.footerCombats.map((c, i) => (
                <li key={i} className="border border-white/20 px-3 py-1.5 text-xs font-sans font-semibold text-blue-100">{c}</li>
              ))}
            </ul>
          )}
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

        <nav className="sm:col-span-2 lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-10" aria-label={t("Plan du site")}>
          {sections.map((g) => (
            <div key={g.id || g.url} className="space-y-4">
              <h2 className="eyebrow text-xs">
                <Link href={localePath(locale, g.url)} className={linkCls}>{g.libelle}</Link>
              </h2>
              <ul className="space-y-3 font-sans font-semibold text-blue-100">
                {g.children.map((c) => (
                  <li key={c.id || c.url}>
                    <Link href={localePath(locale, c.url)} className={linkCls}>{c.libelle}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {autres.length > 0 && (
            <div className="space-y-4">
              <h2 className="eyebrow text-xs">{t("Agir")}</h2>
              <ul className="space-y-3 font-sans font-semibold text-blue-100">
                {autres.map((n) => (
                  <li key={n.id || n.url}>
                    <Link href={localePath(locale, n.url)} className={linkCls}>{n.libelle}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="sm:col-span-2 lg:col-span-3 space-y-4">
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
            &copy; {new Date().getFullYear()} {copyright}
          </p>
          <ul className="flex flex-wrap justify-center gap-6 uppercase font-bold tracking-widest text-[11px]">
            <li>
              <Link href={localePath(locale, "/contact")} className="hover:text-white transition">{t("Contact")}</Link>
            </li>
            <li>
              {/* Espace public des ambassades et services d'asile : vérifier une carte de membre */}
              <Link href={localePath(locale, "/verifier")} className="hover:text-white transition">{t("Vérifier une carte de membre")}</Link>
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
      </div>
    </footer>
  );
}
