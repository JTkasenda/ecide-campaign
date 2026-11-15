import type { Metadata } from "next";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import MemberProfile from "@/components/member/MemberProfile";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  const meta = await pageMetadata(locale, "/espace-membre/profil", { title: t("Mon profil"), description: t("Vos informations de membre.") });
  return { ...meta, robots: { index: false, follow: false } };
}

/** Espace membre · Mon profil (cadre commun : layout.tsx / MemberShell). */
export default async function Page({ params }: PageParams) {
  await pageLocale(params);
  return <MemberProfile />;
}
