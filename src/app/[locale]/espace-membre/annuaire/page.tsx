import type { Metadata } from "next";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import MemberDirectory from "@/components/member/MemberDirectory";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  const meta = await pageMetadata(locale, "/espace-membre/annuaire", { title: t("Annuaire"), description: t("Annuaire des membres du parti.") });
  return { ...meta, robots: { index: false, follow: false } };
}

/** Espace membre · Annuaire (cadre commun : layout.tsx / MemberShell). */
export default async function Page({ params }: PageParams) {
  await pageLocale(params);
  return <MemberDirectory />;
}
