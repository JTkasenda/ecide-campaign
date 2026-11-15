import type { Metadata } from "next";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import MemberAgenda from "@/components/member/MemberAgenda";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  const meta = await pageMetadata(locale, "/espace-membre/agenda", { title: t("Agenda"), description: t("Vos convocations. Confirmez votre présence en un geste.") });
  return { ...meta, robots: { index: false, follow: false } };
}

/** Espace membre · Agenda : convocations et confirmation de présence (cadre commun : layout.tsx / MemberShell). */
export default async function Page({ params }: PageParams) {
  await pageLocale(params);
  return <MemberAgenda />;
}
