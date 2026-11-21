import type { Metadata } from "next";
import Link from "next/link";
import { getContact, getHome } from "@/lib/api";
import { telHref, safeUrl } from "@/lib/format";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import ContactForm from "@/components/ContactForm";
import JumpSelect from "@/components/JumpSelect";
import PageBanner from "@/components/PageBanner";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  return pageMetadata(locale, "/contact", { title: t("Contact"), description: t("Contactez-nous : siège national, e-mail, téléphone, WhatsApp et formulaire.") });
}

export default async function ContactPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t, home] = await Promise.all([getContact(locale), getT(locale), getHome(locale).catch(() => null)]);
  const { page: cp, params: p, whatsapp, destinataires } = data;
  // Contacts locaux : la province ou le pays ouvre directement l'annuaire au bon endroit (mêmes listes que l'accueil)
  const proximite = home?.proximite;

  return (
    <main id="main" className="flex-grow">
      <PageBanner eyebrow={t("Nous écrire")} title={t("Contact")} text={cp.intro || t("Contactez-nous : siège national, e-mail, téléphone, WhatsApp et formulaire.")} />
      {/* Téléphone et tablette : aucun contenant sur la page Contact (fond blanc, blocs posés sur la page) */}
      <section className="mob-band mob-white py-20 px-6 max-w-7xl mx-auto">
        <div className="mob-plain grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 cols-rule">
          <div className="p-2 space-y-3 reveal">
            <span className="icon-tile icon-tile--dark" aria-hidden="true"><i className="fa-solid fa-location-dot"></i></span>
            <h2 className="text-2xl text-gray-900">{t("Siège National")}</h2>
            <p className="text-gray-600 text-sm">{cp.siegeTexte || p.adresse || ""}</p>
          </div>
          <div className="p-2 space-y-3 reveal">
            <span className="icon-tile icon-tile--yellow" aria-hidden="true"><i className="fa-solid fa-envelope"></i></span>
            <h2 className="text-2xl text-gray-900">{t("E-mail")}</h2>
            {p.email && <p className="text-gray-600 text-sm"><a href={`mailto:${p.email}`} className="hover:text-ecideBlue">{p.email}</a></p>}
            {p.presse && <p className="text-gray-600 text-sm"><a href={`mailto:${p.presse}`} className="hover:text-ecideBlue">{p.presse}</a></p>}
          </div>
          <div className="p-2 space-y-3 reveal">
            <span className="icon-tile icon-tile--green" aria-hidden="true"><i className="fa-solid fa-phone"></i></span>
            <h2 className="text-2xl text-gray-900">{t("Téléphone")}</h2>
            {p.telephone && <p className="text-gray-600 text-sm"><a href={telHref(p.telephone)} className="hover:text-ecideBlue">{p.telephone}</a></p>}
            {cp.horaires && <p className="text-gray-500 text-xs">{cp.horaires}</p>}
          </div>
          <div className="p-2 space-y-3 reveal">
            <span className="icon-tile icon-tile--green" aria-hidden="true"><i className="fa-brands fa-whatsapp"></i></span>
            <h2 className="text-2xl text-gray-900">{t("WhatsApp")}</h2>
            <p className="text-gray-600 text-sm">
              {whatsapp ? <a href={safeUrl(whatsapp)} target="_blank" rel="noopener" className="hover:text-ecideBlue">{cp.whatsappLibelle || t("Rejoindre la chaîne officielle")}</a> : <span className="text-gray-400">{t("Chaîne à venir")}</span>}
            </p>
          </div>
        </div>
      </section>

      {proximite && (proximite.provinces.length > 0 || proximite.pays.length > 0) && (
        <section className="mob-band mob-white px-6 pb-20 max-w-7xl mx-auto" aria-labelledby="contactLocal">
          <div className="mob-plain bg-ecideBlue-50 p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div>
              <h2 id="contactLocal" className="text-2xl text-ecideDarkBlue no-bar">{t("Un contact près de chez vous")}</h2>
              <p className="mob-hide text-sm text-gray-600 mt-1">{t("Choisissez votre province ou votre pays : les responsables locaux et leurs coordonnées s'affichent.")}</p>
            </div>
            <label className="block">
              <span className="flex items-center gap-2 eyebrow eyebrow--dark text-xs mb-2"><i className="fa-solid fa-map text-ecideBlue" aria-hidden="true"></i>{t("En RDC · ma province")}</span>
              <JumpSelect label={t("Choisir une province")} placeholder={t("Choisir une province…")} options={proximite.provinces.map((prov) => ({ value: `${localePath(locale, "/cadres")}#niveau=provincial&province=${encodeURIComponent(prov)}`, label: prov }))} />
            </label>
            <label className="block">
              <span className="flex items-center gap-2 eyebrow eyebrow--dark text-xs mb-2"><i className="fa-solid fa-earth-africa text-ecideGreen" aria-hidden="true"></i>{t("À l'étranger · mon pays")}</span>
              <JumpSelect
                label={t("Choisir un pays")}
                placeholder={t("Choisir un pays…")}
                options={[
                  ...proximite.pays.map((c) => ({ value: `${localePath(locale, "/diaspora")}#continent=${c.continent}&pays=${encodeURIComponent(c.nom)}`, label: c.nom })),
                  { value: `${localePath(locale, "/diaspora")}#rejoindre`, label: t("Mon pays n'est pas dans la liste") },
                ]}
              />
            </label>
          </div>
        </section>
      )}

      <section className="mob-band mob-white pb-32 px-6 max-w-7xl mx-auto">
        <div className="mob-plain grid grid-cols-1 lg:grid-cols-5 gap-16 items-start">
          <ContactForm
            destinataires={destinataires}
            confirmation={cp.confirmation}
            labels={{ title: t("Envoyer un message"), name: t("Nom & Prénom"), email: t("E-mail"), recipient: t("Destinataire"), message: t("Message"), submit: t("Envoyer") }}
          />
          <div className="lg:col-span-2 space-y-6 reveal">
            {/* Téléphone et tablette : pas de carte intégrée, l'adresse du siège figure plus haut */}
            <div className="mob-hide overflow-hidden panel panel--white border border-gray-200">
              <iframe title={t("Carte du siège")} src="https://www.openstreetmap.org/export/embed.html?bbox=15.20%2C-4.45%2C15.45%2C-4.28&layer=mapnik" className="w-full h-72 border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
              <div className="p-5">
                <p className="font-bold text-gray-900">{cp.carteTitre || t("Siège National")}</p>
                <p className="text-sm text-gray-600">{cp.carteTexte || p.carte || ""}</p>
              </div>
            </div>
            <div className="mob-plain mob-ink bg-ecideDarkBlue text-white p-8 space-y-4 diag">
              <h2 className="text-2xl">{cp.presseTitre || t("Vous êtes journaliste ?")}</h2>
              <p className="mob-hide text-blue-100 text-sm leading-relaxed">{cp.presseTexte || ""}</p>
              <Link href={`${localePath(locale, "/president")}#presse`} className="arrow-link arrow-link--light">{t("Dossier de presse")}</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
