import type { Metadata } from "next";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import MemberNews from "@/components/member/MemberNews";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  const meta = await pageMetadata(locale, "/espace-membre/actualites", { title: t("Actualités"), description: t("Annonces, communiqués et communications internes du parti.") });
  return { ...meta, robots: { index: false, follow: false } };
}

/** Espace membre · Actualités (cadre commun : layout.tsx / MemberShell). */
export default async function Page({ params }: PageParams) {
  await pageLocale(params);
  return <MemberNews />;
}
