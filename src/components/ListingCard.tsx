import Link from "next/link";
import { labels, priceLabel, totalLabel, primaryPrice, fmtDate } from "@/lib/format";
import { CompareButton } from "./Compare";
import { formatMinor } from "@/lib/money";
import { getT } from "@/lib/i18n";
import { mediaUrl } from "@/lib/storage";
import { favState } from "@/lib/favorites";
import FavoriteButton from "./FavoriteButton";
import ListingPhoto from "./ListingPhoto";
import type { searchListings } from "@/lib/search";
type Item = Awaited<ReturnType<typeof searchListings>>["items"][number];

/** Telefonda 2 ustunli ixcham karta; katta ekranda qo'shimcha ma'lumotlar ham ko'rinadi. */
export default async function ListingCard({ it, note }: { it: Item; note?: string }) {
  const price = { amount: it.priceAmountMinor, currency: it.currency, period: it.pricePeriod, basis: it.priceBasis, negotiable: it.priceNegotiable };
  const { locale, t } = await getT(); const L = labels(locale);
  const total = totalLabel(price, it.areaM2, locale);
  const fav = await favState();
  const place = [it.districtName, it.regionName].filter(Boolean).join(", ");
  return (
    <article className="relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-shadow hover:shadow-md">
      <div className="absolute right-2 top-2 z-10"><FavoriteButton variant="icon" listingId={it.id} initial={fav.ids.has(it.id)} loggedIn={fav.loggedIn} /></div>
      <Link href={`/joylar/${it.id}-${it.slug}`} className="flex flex-1 flex-col">
        <ListingPhoto thumb={mediaUrl(it.imageKey)} full={mediaUrl(it.imageFullKey)} alt={it.title} className="aspect-[4/3]"
          sizes="(max-width: 1024px) 50vw, 25vw">
          {it.imageKey?.startsWith("placeholder:") ? t("card.demoImg", { cat: L.category[it.category] }) : t("card.noImg")}
        </ListingPhoto>
        <div className="flex-1 space-y-1 p-2.5 sm:p-3">
          {note && <span className="inline-block rounded bg-amber-100 px-1.5 text-xs text-amber-900">{note}</span>}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{it.title}</h3>
          <p className="text-base font-bold text-brand sm:text-lg">{primaryPrice(price, it.areaM2, locale)}</p>
          {total && <p className="hidden text-xs text-slate-500 sm:block">{priceLabel(price, locale)}</p>}
          <p className="hidden text-xs text-slate-600 sm:block">{it.commissionType === "none" ? (locale === "ru" ? "Без комиссии" : "Komissiyasiz") : (locale === "ru" ? "Есть комиссия" : "Komissiya bor")}{it.depositAmountMinor != null && ` · ${locale === "ru" ? "Депозит" : "Depozit"}: ${formatMinor(it.depositAmountMinor)} ${it.depositCurrency}`}</p>
          <p className="line-clamp-2 text-xs text-slate-600 sm:text-sm">{place}</p>
          {it.publishedAt && <p className="text-xs text-slate-500 sm:hidden">{fmtDate(it.publishedAt, locale)}</p>}
          {(it.areaM2 || it.floor != null) && <p className="text-xs text-slate-700 sm:text-sm">{it.areaM2 ? `${Number(it.areaM2)} ${t("unit.m2")}` : ""}{it.areaM2 && it.floor != null ? " · " : ""}{it.floor != null ? t("card.floor", { n: it.floor }) : ""}</p>}
          {it.centerName && <p className="hidden text-sm text-slate-600 sm:block">{t("card.center", { name: it.centerName })}</p>}
          <p className="hidden text-xs text-slate-500 sm:block">{L.poster[it.posterType]}{it.availabilityConfirmedAt ? ` · ${t("card.confirmed", { date: fmtDate(it.availabilityConfirmedAt, locale) })}` : ""}</p>
        </div>
      </Link>
      <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3"><CompareButton id={it.id}/></div>
    </article>
  );
}
