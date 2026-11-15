import type { Metadata } from "next";
import { pageLocale, type PageParams } from "@/lib/page";
import { getT, pageMetadata } from "@/lib/server";
import CardPrint from "@/components/member/CardPrint";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getT(locale);
  const meta = await pageMetadata(locale, "/espace-membre/carte/imprimer", { title: t("Carte de membre") });
  return { ...meta, robots: { index: false, follow: false } };
}

/** Carte de membre à imprimer ou enregistrer en PDF : recto et verso au format carte bancaire. */
export default async function CartePrintPage({ params }: PageParams) {
  await pageLocale(params);
  return <CardPrint />;
}
