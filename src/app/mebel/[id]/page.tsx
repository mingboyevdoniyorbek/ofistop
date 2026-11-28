import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n";
import { pageAlternates } from "@/lib/seo";
import { firmPhoto, getFirm, KIND_LABELS, PRODUCT_LABELS } from "@/lib/furniture";
import { mediaUrl } from "@/lib/storage";
import { telHref } from "@/lib/site-info";
import { ProductIcon } from "@/components/Stickers";
import { VipBadge } from "@/components/ListingCard";
import Gallery from "@/components/Gallery";
import FirmAvatar from "@/components/FirmAvatar";
import ShareButton from "@/components/ShareButton";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { locale } = await getT(); const r = await getFirm((await params).id, locale).catch(() => null);
  if (!r) return { title: locale === "ru" ? "Компания не найдена" : "Firma topilmadi", robots: { index: false } };
  const ru = locale === "ru";
  const desc = `${r.f.name} — ${ru ? "офисная мебель" : "ofis mebeli"}, ${KIND_LABELS[r.f.kind][ru ? "ru" : "uz"].toLowerCase()}, ${r.region}. ${r.f.description.slice(0, 120)}`;
  const logo = mediaUrl(r.f.logoKey);
  return { title: `${r.f.name} — ${ru ? "офисная мебель" : "ofis mebeli"}`, description: desc, alternates: await pageAlternates(`/mebel/${r.f.id}`), openGraph: { title: r.f.name, description: desc, ...(logo ? { images: [logo] } : {}) } };
}

/** Mebel firmasining profili: logotip, ish namunalari, to'liq izoh va to'g'ridan-to'g'ri aloqa. */
export default async function FirmProfile({ params }: { params: Promise<{ id: string }> }) {
  const { locale } = await getT(); const ru = locale === "ru"; const lang = ru ? "ru" : "uz";
  const r = await getFirm((await params).id, locale); if (!r) notFound();
  const { f, region, isTop } = r;
  const photos = f.photoKeys.map(firmPhoto).flatMap((p) => p.url ? [{ url: p.url, thumb: p.md ?? p.url }] : []);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/mebel" className="text-sm font-medium text-brand">← {ru ? "Офисная мебель" : "Ofis mebellari"}</Link>
      <div className="relative mt-4 flex items-center gap-4">
        <FirmAvatar name={f.name} url={mediaUrl(f.logoKey)} size="h-20 w-20 text-2xl" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{f.name}</h1>
          <p className="text-sm text-slate-500">{KIND_LABELS[f.kind][lang]} · {region}</p>
          {isTop && <VipBadge className="mt-1" />}
        </div>
      </div>
      {photos.length > 0 && <div className="mt-5"><Gallery images={photos} alt={f.name} fallback="" /></div>}
      {f.products.length > 0 && <ul className="mt-5 flex flex-wrap gap-2">{f.products.map((p) => { const l = PRODUCT_LABELS[p as keyof typeof PRODUCT_LABELS]; return l ? <li key={p} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm"><ProductIcon name={p} className="h-5 w-5" />{l[lang]}</li> : null; })}</ul>}
      {f.description && <section className="mt-5"><h2 className="mb-2 text-lg font-semibold">{ru ? "О компании" : "Firma haqida"}</h2><p className="whitespace-pre-line leading-relaxed text-slate-700">{f.description}</p></section>}
      {f.address && <p className="mt-4 text-sm text-slate-600">📍 {f.address}</p>}
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <a href={telHref(f.phone)} className="rounded-2xl bg-accent px-4 py-3.5 text-center font-semibold text-white">📞 {ru ? "Позвонить" : "Qo‘ng‘iroq qilish"}</a>
        {f.telegramUsername && <a href={`https://t.me/${f.telegramUsername}`} target="_blank" rel="noopener noreferrer" className="rounded-2xl border-2 border-brand px-4 py-3 text-center font-semibold text-brand">Telegram</a>}
        {f.website && <a href={f.website} target="_blank" rel="noopener noreferrer nofollow" className="text-center text-sm text-brand underline sm:col-span-2">{ru ? "Сайт / Instagram ↗" : "Sayt / Instagram ↗"}</a>}
      </div>
      <div className="mt-4 flex justify-center"><ShareButton path={`/mebel/${f.id}`} title={f.name} text={ru ? "Офисная мебель на OfisTop" : "OfisTop’dagi ofis mebeli"} /></div>
    </div>
  );
}
