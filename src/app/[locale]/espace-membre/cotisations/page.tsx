import type { Metadata } from "next";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import MemberDues from "@/components/member/MemberDues";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  const meta = await pageMetadata(locale, "/espace-membre/cotisations", { title: t("Cotisations"), description: t("Votre cotisation mensuelle et les cotisations spéciales du parti.") });
  return { ...meta, robots: { index: false, follow: false } };
}

/** Espace membre · Cotisations (cadre commun : layout.tsx / MemberShell). */
export default async function Page({ params }: PageParams) {
  await pageLocale(params);
  return <MemberDues />;
}
