import Link from "next/link";
import { and, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { publicCond } from "@/lib/search";
import { getT } from "@/lib/i18n";
import { labels, primaryPrice, priceLabel } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import { CompareButton } from "@/components/Compare";
export const metadata = { title: "Taqqoslash — OfisTop", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ ids?: string | string[] }> }) {
  const { locale } = await getT(), ru = locale === "ru", L = labels(locale);
  const rawIds = (await searchParams).ids;
  const ids = [...new Set((Array.isArray(rawIds) ? rawIds[0] : rawIds ?? "").split(",").filter(x => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x)))].slice(0, 3);
  const rows = ids.length ? await db().select().from(s.listings).where(and(publicCond(), inArray(s.listings.id, ids))) : [];
  const amenities = await db().select().from(s.amenities); const names = new Map(amenities.map(a => [a.code, ru ? a.nameRu : a.nameUz]));
  const fields: [string, (l: typeof rows[number]) => string][] = [
    [ru ? "Аренда целиком" : "Jami ijara", l => primaryPrice({ amount: l.priceAmountMinor, currency: l.currency, period: l.pricePeriod, basis: l.priceBasis, negotiable: l.priceNegotiable }, l.areaM2, locale)],
    [ru ? "Единица цены" : "Narx birligi", l => priceLabel({ amount: l.priceAmountMinor, currency: l.currency, period: l.pricePeriod, basis: l.priceBasis }, locale)],
    [ru ? "Площадь" : "Maydon", l => l.areaM2 ? `${Number(l.areaM2)} m²` : "—"],
    [ru ? "Этаж" : "Qavat", l => l.floor == null ? "—" : String(l.floor)],
    [ru ? "Депозит" : "Depozit", l => l.depositAmountMinor == null ? "—" : `${formatMinor(l.depositAmountMinor)} ${l.depositCurrency}`],
    [ru ? "Комиссия" : "Komissiya", l => l.commissionType === "none" ? (ru ? "Нет" : "Yo‘q") : l.commissionType === "fixed" ? `${formatMinor(l.commissionFixedMinor ?? 0n)} ${l.commissionCurrency}` : `${l.commissionPercent}% (${l.commissionPercentBase === "annual_rent" ? (ru ? "за год" : "yillik ijaradan") : (ru ? "за месяц" : "oylik ijaradan")})`],
    [ru ? "Коммунальные" : "Kommunal to‘lovlar", l => l.utilities === "included" ? (ru ? "Включены" : "Ichida") : l.utilities === "separate" ? (ru ? "Отдельно" : "Alohida") : l.utilities === "partly" ? (ru ? "Частично" : "Qisman ichida") : "—"],
    [ru ? "Удобства" : "Qulayliklar", l => l.amenities.map(a => names.get(a) ?? a).join(", ") || "—"],
    [ru ? "Кто сдаёт" : "E’lon beruvchi", l => L.poster[l.posterType]],
  ];
  return <div className="mx-auto max-w-6xl px-4 py-8"><Link href="/joylar" className="text-brand">← {ru ? "К поиску" : "Qidiruvga"}</Link><h1 className="my-5 text-3xl font-bold">{ru ? "Сравните помещения" : "Joylarni taqqoslang"}</h1><p className="mb-5 text-slate-600">{ru ? "До 3 вариантов. Недоступные объявления скрываются. Валюты не конвертируются." : "3 tagacha variant. Band yoki yashirilgan e’lonlar chiqarilmaydi. Valyutalar avtomatik almashtirilmaydi."}</p>
    {!rows.length ? <Link href="/joylar" className="text-brand underline">{ru ? "Выберите помещения в каталоге" : "Katalogdan joylarni tanlang"}</Link> : <div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr><th className="p-4">{ru ? "Характеристика" : "Xususiyat"}</th>{rows.map(l => <th className="min-w-48 p-4" key={l.id}><Link href={`/joylar/${l.id}-${l.slug}`} className="mb-3 block text-brand">{l.title}</Link><CompareButton id={l.id} onComparePage/></th>)}</tr></thead><tbody>{fields.map(([label, value]) => <tr className="border-t odd:bg-slate-50" key={label}><th className="p-4 font-medium">{label}</th>{rows.map(l => <td className="p-4" key={l.id}>{value(l)}</td>)}</tr>)}</tbody></table></div>}
  </div>;
}
