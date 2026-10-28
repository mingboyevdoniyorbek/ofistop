import Link from "next/link";
import { labels, priceLabel, totalLabel, fmtDate } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { mediaUrl } from "@/lib/storage";
import { favState } from "@/lib/favorites";
import FavoriteButton from "./FavoriteButton";
import type { searchListings } from "@/lib/search";
type Item = Awaited<ReturnType<typeof searchListings>>["items"][number];

export default async function ListingCard({ it }: { it: Item }) {
  const price = { amount: it.priceAmountMinor, currency: it.currency, period: it.pricePeriod, basis: it.priceBasis, negotiable: it.priceNegotiable };
  const { locale, t } = await getT(); const L = labels(locale);
  const total = totalLabel(price, it.areaM2, locale);
  const img = mediaUrl(it.imageKey); const fav = await favState();
  return (
    <article className="relative rounded-lg border border-slate-200 overflow-hidden bg-white hover:shadow-md transition-shadow">
      <div className="absolute right-2 top-2 z-10"><FavoriteButton listingId={it.id} initial={fav.ids.has(it.id)} loggedIn={fav.loggedIn} /></div>
      <Link href={`/joylar/${it.id}-${it.slug}`} className="block">
        <div className="aspect-[16/10] bg-slate-100 grid place-items-center text-slate-500 text-sm overflow-hidden">
          {img ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={img} alt={it.title} loading="lazy" className="h-full w-full object-cover" />
            : it.imageKey?.startsWith("placeholder:") ? <span>{t("card.demoImg", { cat: L.category[it.category] })}</span> : <span>{t("card.noImg")}</span>}
        </div>
        <div className="p-3 space-y-1">
          <h3 className="font-semibold leading-snug line-clamp-2">{it.title}</h3>
          <p className="text-brand font-bold">{priceLabel(price, locale)}</p>
          {total && <p className="text-sm text-slate-600">{total}</p>}
          <p className="text-sm text-slate-600">{it.areaM2 ? `${Number(it.areaM2)} ${t("unit.m2")}` : ""}{it.floor != null ? ` · ${t("card.floor", { n: it.floor })}` : ""}</p>
          <p className="text-sm text-slate-600">{[it.districtName, it.regionName].filter(Boolean).join(", ")}</p>
          {it.centerName && <p className="text-sm text-slate-600">{t("card.center", { name: it.centerName })}</p>}
          <p className="text-xs text-slate-500">{L.poster[it.posterType]}{it.availabilityConfirmedAt ? ` · ${t("card.confirmed", { date: fmtDate(it.availabilityConfirmedAt, locale) })}` : ""}</p>
        </div>
      </Link>
    </article>
  );
}
