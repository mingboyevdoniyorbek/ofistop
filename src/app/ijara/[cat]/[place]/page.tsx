import type { Metadata } from "next";
import LandingPage, { landingData, landingTitle, landingDescription, landingTotal } from "@/components/LandingPage";
import { getT } from "@/lib/i18n";
import { pageAlternates } from "@/lib/seo";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ cat: string; place: string }>; searchParams: Promise<{ page?: string }> };
const pageOf = (v?: string) => Math.max(1, Math.min(500, Number.parseInt(v ?? "1", 10) || 1));

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const { cat, place } = await params; const d = await landingData(cat, place); if (!d) return {};
  const ru = (await getT()).locale === "ru"; const page = pageOf((await searchParams).page);
  const title = landingTitle(d, ru); const total = await landingTotal(d);
  return { title: `${title}${total ? ` — ${total} ${ru ? "объявл." : "ta e’lon"}` : ""}${page > 1 ? ` · ${page}` : ""}`,
    description: landingDescription(d, ru, total),
    // Bo'sh sahifa (masalan, e'loni yo'q metro bekati) qidiruvga qo'shilmaydi
    robots: { index: total > 0, follow: true },
    alternates: await pageAlternates(`/ijara/${cat}/${place}${page > 1 ? `?page=${page}` : ""}`) };
}
export default async function Page({ params, searchParams }: P) {
  const { cat, place } = await params;
  return <LandingPage catSlug={cat} placeSlug={place} page={pageOf((await searchParams).page)} />;
}
