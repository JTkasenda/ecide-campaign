import type { Metadata } from "next";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import NewsletterUnsubscribe from "@/components/NewsletterUnsubscribe";
import PageBanner from "@/components/PageBanner";

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
      <PageBanner eyebrow={t("Recevoir les communiqués")} title={t("Désabonnement")} narrow />
      <section className="py-20 lg:py-32 px-6">
        <div className="max-w-xl mx-auto space-y-10">
          <NewsletterUnsubscribe />
        </div>
      </section>
    </main>
  );
}
