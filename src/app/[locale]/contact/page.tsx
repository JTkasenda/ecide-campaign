import type { Metadata } from "next";
import Link from "next/link";
import { getContact } from "@/lib/api";
import { telHref, safeUrl } from "@/lib/format";
import { localePath } from "@/lib/locales";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import ContactForm from "@/components/ContactForm";

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
      <h1 className="sr-only">{t("Contact")}</h1>
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-7 shadow-soft space-y-3 reveal">
            <i className="fa-solid fa-location-dot text-3xl text-ecideBlue" aria-hidden="true"></i>
            <h2 className="font-bold text-lg text-gray-900">{t("Siège National")}</h2>
            <p className="text-gray-600 text-sm">{cp.siegeTexte || p.adresse || ""}</p>
          </div>
          <div className="bg-white p-7 shadow-soft space-y-3 reveal">
            <i className="fa-solid fa-envelope text-3xl text-ecideYellow-700" aria-hidden="true"></i>
            <h2 className="font-bold text-lg text-gray-900">{t("E-mail")}</h2>
            {p.email && <p className="text-gray-600 text-sm"><a href={`mailto:${p.email}`} className="hover:text-ecideBlue">{p.email}</a></p>}
            {p.presse && <p className="text-gray-600 text-sm"><a href={`mailto:${p.presse}`} className="hover:text-ecideBlue">{p.presse}</a></p>}
          </div>
          <div className="bg-white p-7 shadow-soft space-y-3 reveal">
            <i className="fa-solid fa-phone text-3xl text-ecideGreen" aria-hidden="true"></i>
            <h2 className="font-bold text-lg text-gray-900">{t("Téléphone")}</h2>
            {p.telephone && <p className="text-gray-600 text-sm"><a href={telHref(p.telephone)} className="hover:text-ecideBlue">{p.telephone}</a></p>}
            {cp.horaires && <p className="text-gray-500 text-xs">{cp.horaires}</p>}
          </div>
          <div className="bg-white p-7 shadow-soft space-y-3 reveal">
            <i className="fa-brands fa-whatsapp text-3xl text-ecideGreen" aria-hidden="true"></i>
            <h2 className="font-bold text-lg text-gray-900">WhatsApp</h2>
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
            <div className="overflow-hidden shadow-soft border border-gray-200 bg-white">
              <iframe title={t("Carte du siège")} src="https://www.openstreetmap.org/export/embed.html?bbox=15.20%2C-4.45%2C15.45%2C-4.28&layer=mapnik" className="w-full h-72 border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
              <div className="p-5">
                <p className="font-bold text-gray-900">{cp.carteTitre || t("Siège National")}</p>
                <p className="text-sm text-gray-600">{cp.carteTexte || p.carte || ""}</p>
              </div>
            </div>
            <div className="bg-ecideBlue-50 text-gray-900 p-8 space-y-4">
              <h2 className="font-black text-xl text-gray-900">{cp.presseTitre || t("Vous êtes journaliste ?")}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{cp.presseTexte || ""}</p>
              <Link href={`${localePath(locale, "/president")}#presse`} className="inline-flex items-center gap-2 font-bold text-ecideBlue hover:text-ecideDarkBlue">{t("Dossier de presse")} <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
