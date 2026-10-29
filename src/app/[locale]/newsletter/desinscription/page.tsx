import type { Metadata } from "next";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import NewsletterUnsubscribe from "@/components/NewsletterUnsubscribe";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  return { ...(await pageMetadata(locale, "/newsletter/desinscription", { title: t("Désabonnement") })), robots: { index: false, follow: false } };
}

/** Désabonnement des communiqués : ouvert depuis le lien personnel de chaque e-mail. */
export default async function UnsubscribePage({ params }: PageParams) {
  const locale = await pageLocale(params);
  const t = await getT(locale);

  return (
    <main id="main" className="flex-grow">
      <section className="py-16 lg:py-24 px-6">
        <div className="max-w-xl mx-auto space-y-8">
          <header className="text-center space-y-3">
            <span className="text-ecideGreen font-bold uppercase tracking-widest text-sm">{t("Recevoir les communiqués")}</span>
            <h1 className="text-4xl md:text-5xl font-black text-ecideDarkBlue">{t("Désabonnement")}</h1>
          </header>
          <NewsletterUnsubscribe />
        </div>
      </section>
    </main>
  );
}
