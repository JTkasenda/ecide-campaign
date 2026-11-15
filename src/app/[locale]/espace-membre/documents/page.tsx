import type { Metadata } from "next";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import MemberLibrary from "@/components/member/MemberLibrary";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  const meta = await pageMetadata(locale, "/espace-membre/documents", { title: t("Documents officiels"), description: t("Les textes fondateurs du parti et de la République, à lire et à rechercher.") });
  return { ...meta, robots: { index: false, follow: false } };
}

/** Espace membre · Documents officiels : Constitution, Statuts, Charte… (cadre commun : layout.tsx / MemberShell). */
export default async function Page({ params }: PageParams) {
  await pageLocale(params);
  return <MemberLibrary />;
}
