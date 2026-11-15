import type { Metadata } from "next";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import MemberCardPage from "@/components/member/MemberCardPage";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  const meta = await pageMetadata(locale, "/espace-membre/carte", { title: t("Ma carte de membre") });
  return { ...meta, robots: { index: false, follow: false } };
}

/** Carte de membre numérique : recto, verso, QR code, image et impression. */
export default async function CartePage({ params }: PageParams) {
  await pageLocale(params);
  return <MemberCardPage />;
}
