import type { Metadata } from "next";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import MemberReports from "@/components/member/MemberReports";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  const meta = await pageMetadata(locale, "/espace-membre/rapports", { title: t("Mes rapports d'activités"), description: t("Rendez compte des événements que vous avez organisés : lieu, participants, incidents.") });
  return { ...meta, robots: { index: false, follow: false } };
}

/**
 * Espace membre · Mes rapports d'activités : liste et formulaire sur la même page (cadre commun :
 * layout.tsx / MemberShell). Données confidentielles : jamais gardées par le service worker.
 */
export default async function Page({ params }: PageParams) {
  await pageLocale(params);
  return <MemberReports />;
}
