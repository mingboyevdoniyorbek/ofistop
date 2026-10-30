import type { Metadata } from "next";
import LandingPage, { landingData, landingTitle } from "@/components/LandingPage";
import { getT } from "@/lib/i18n";
import { pageAlternates } from "@/lib/seo";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ cat: string }>; searchParams: Promise<{ page?: string }> };
const pageOf = (v?: string) => Math.max(1, Math.min(500, Number.parseInt(v ?? "1", 10) || 1));

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const { cat } = await params; const d = await landingData(cat); if (!d) return {};
  const ru = (await getT()).locale === "ru"; const page = pageOf((await searchParams).page);
  const title = landingTitle(d, ru);
  return { title: page > 1 ? `${title} — ${page}` : title,
    description: ru ? `${d.cat.ru}: проверенные объявления без посредников и с ними, цены, фото, карта. Бесплатный контакт владельца на OfisTop.` : `${d.cat.uz}: tekshirilgan e’lonlar, narxlar, rasmlar va xarita. Egasining kontakti bepul — OfisTop.`,
    alternates: await pageAlternates(`/ijara/${cat}${page > 1 ? `?page=${page}` : ""}`) };
}
export default async function Page({ params, searchParams }: P) {
  return <LandingPage catSlug={(await params).cat} page={pageOf((await searchParams).page)} />;
}
