import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locales";
import { getT, pageMetadata } from "@/lib/server";
import DocumentReader from "@/components/member/DocumentReader";

type Params = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const t = await getT(locale);
  const meta = await pageMetadata(locale, `/espace-membre/documents/${id}`, { title: t("Documents officiels") });
  return { ...meta, robots: { index: false, follow: false } };
}

/** Espace membre · lecture d'un document officiel : sommaire, recherche d'article, PDF. */
export default async function Page({ params }: Params) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !/^\d{1,9}$/.test(id)) notFound();
  return <DocumentReader id={Number(id)} />;
}
