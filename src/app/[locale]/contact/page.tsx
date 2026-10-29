import type { Metadata } from "next";
import Link from "next/link";
import { getContact } from "@/lib/api";
import { telHref, safeUrl } from "@/lib/format";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import ContactForm from "@/components/ContactForm";
import PageBanner from "@/components/PageBanner";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  return pageMetadata(locale, "/contact", { title: t("Contact"), description: t("Contactez-nous : siège national, e-mail, téléphone, WhatsApp et formulaire.") });
}

export default async function ContactPage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const [data, t] = await Promise.all([getContact(locale), getT(locale)]);
  const { page: cp, params: p, whatsapp, destinataires } = data;

  return (
    <main id="main" className="flex-grow">
      <PageBanner eyebrow={t("Nous écrire")} title={t("Contact")} text={cp.intro || t("Contactez-nous : siège national, e-mail, téléphone, WhatsApp et formulaire.")} />
      <section className="py-14 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 cols-rule">
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
            <h2 className="text-2xl text-gray-900">WhatsApp</h2>
            <p className="text-gray-600 text-sm">
              {whatsapp ? <a href={safeUrl(whatsapp)} target="_blank" rel="noopener" className="hover:text-ecideBlue">{cp.whatsappLibelle || t("Rejoindre la chaîne officielle")}</a> : <span className="text-gray-400">{t("Chaîne à venir")}</span>}
            </p>
          </div>
        </div>
      </section>

      <section className="pb-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
          <ContactForm
            destinataires={destinataires}
            confirmation={cp.confirmation}
            labels={{ title: t("Envoyer un message"), name: t("Nom & Prénom"), email: t("E-mail"), recipient: t("Destinataire"), message: t("Message"), submit: t("Envoyer") }}
          />
          <div className="lg:col-span-2 space-y-6 reveal">
            <div className="overflow-hidden panel panel--white border border-gray-200">
              <iframe title={t("Carte du siège")} src="https://www.openstreetmap.org/export/embed.html?bbox=15.20%2C-4.45%2C15.45%2C-4.28&layer=mapnik" className="w-full h-72 border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
              <div className="p-5">
                <p className="font-bold text-gray-900">{cp.carteTitre || t("Siège National")}</p>
                <p className="text-sm text-gray-600">{cp.carteTexte || p.carte || ""}</p>
              </div>
            </div>
            <div className="bg-ecideDarkBlue text-white p-8 space-y-4 diag">
              <h2 className="text-2xl">{cp.presseTitre || t("Vous êtes journaliste ?")}</h2>
              <p className="text-blue-100 text-sm leading-relaxed">{cp.presseTexte || ""}</p>
              <Link href={`${localePath(locale, "/president")}#presse`} className="arrow-link arrow-link--light">{t("Dossier de presse")}</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
