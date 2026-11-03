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
import ShareButton from "@/components/ShareButton";
type Item = Awaited<ReturnType<typeof searchListings>>["items"][number];

/** Telefonda 2 ustunli ixcham karta; katta ekranda qo'shimcha ma'lumotlar ham ko'rinadi. */
/** compact — bosh sahifadagi gorizontal qatorlar uchun: ramkasiz, katta yumaloq rasm, belgilar rasm ustida, 3 qator matn. */
export default async function ListingCard({ it, note, compact = false }: { it: Item; note?: string; compact?: boolean }) {
  const price = { amount: it.priceAmountMinor, currency: it.currency, period: it.pricePeriod, basis: it.priceBasis, negotiable: it.priceNegotiable };
  const { locale, t } = await getT(); const L = labels(locale);
  const total = totalLabel(price, it.areaM2, locale);
  const fav = await favState();
  const place = [it.districtName, it.regionName].filter(Boolean).join(", ");
  if (compact) {
    const badge = it.dealType === "sale" ? (locale === "ru" ? "Продаётся" : "Sotiladi") : it.posterType === "owner" ? (locale === "ru" ? "От владельца" : "Egasidan") : it.posterType === "business_center" ? (locale === "ru" ? "От бизнес-центра" : "Markazdan") : null;
    return (
      <article className="relative">
        <div className="absolute right-2 top-2 z-10"><FavoriteButton variant="icon" listingId={it.id} initial={fav.ids.has(it.id)} loggedIn={fav.loggedIn} /></div>
        <Link href={`/joylar/${it.id}-${it.slug}`} className="block">
          <ListingPhoto thumb={mediaUrl(it.imageKey)} medium={mediaUrl(it.imageMediumKey)} full={mediaUrl(it.imageFullKey)} alt={it.title} className="aspect-[4/3] rounded-2xl" sizes="(max-width: 640px) 60vw, 260px">
            {it.imageKey?.startsWith("placeholder:") ? t("card.demoImg", { cat: L.category[it.category] }) : t("card.noImg")}
          </ListingPhoto>
          {it.isTop && <span className="absolute bottom-2 left-2 z-10 rounded-md bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-white shadow">TOP</span>}
          {badge && <span className={`absolute left-2 top-2 z-10 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${it.dealType === "sale" ? "bg-emerald-600 text-white" : "bg-white/95 text-slate-900"}`}>{it.dealType === "sale" ? "🔑 " : "✓ "}{badge}</span>}
          <div className="mt-2 space-y-0.5 px-0.5">
            <h3 className="line-clamp-1 text-sm font-semibold">{it.title}</h3>
            <p className="line-clamp-1 text-xs text-slate-600">{[it.districtName ?? it.regionName, it.areaM2 ? `${Number(it.areaM2)} ${t("unit.m2")}` : null].filter(Boolean).join(" · ")}</p>
            <p className="truncate text-sm font-bold text-brand-dark">{primaryPrice(price, it.areaM2, locale)}</p>
          </div>
        </Link>
      </article>
    );
  }
  return (
    <article className="relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-shadow hover:shadow-md">
      <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1.5"><FavoriteButton variant="icon" listingId={it.id} initial={fav.ids.has(it.id)} loggedIn={fav.loggedIn} /><ShareButton variant="icon" path={`/joylar/${it.id}-${it.slug}`} title={it.title} text={`${primaryPrice(price, it.areaM2, locale)} · ${place}`} /></div>
      <Link href={`/joylar/${it.id}-${it.slug}`} className="flex flex-1 flex-col">
        <ListingPhoto thumb={mediaUrl(it.imageKey)} medium={mediaUrl(it.imageMediumKey)} full={mediaUrl(it.imageFullKey)} alt={it.title} className="aspect-[4/3]"
          sizes="(max-width: 1024px) 50vw, 25vw">
          {it.imageKey?.startsWith("placeholder:") ? t("card.demoImg", { cat: L.category[it.category] }) : t("card.noImg")}
        </ListingPhoto>
        <div className="flex-1 space-y-1 p-2.5 sm:p-3">
          {note && <span className="inline-block rounded bg-amber-100 px-1.5 text-xs text-amber-900">{note}</span>}
          {(it.isTop || it.dealType === "sale" || it.posterType !== "agency") && <div className="flex flex-wrap gap-1">
            {it.isTop && <span className="rounded bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 py-0.5 text-xs font-extrabold text-white">TOP</span>}
            {it.dealType === "sale" && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-800">{locale === "ru" ? "Продаётся" : "Sotiladi"}</span>}
            {/* Ishonch belgisi: vositachisiz — to'g'ridan-to'g'ri egasi yoki markaz vakili */}
            {it.posterType === "owner" && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-brand">✓ {locale === "ru" ? "От владельца" : "Egasidan"}</span>}
            {it.posterType === "business_center" && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-brand">✓ {locale === "ru" ? "От бизнес-центра" : "Markazdan"}</span>}
          </div>}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{it.title}</h3>
          <p className="text-base font-bold text-brand sm:text-lg">{primaryPrice(price, it.areaM2, locale)}</p>
          {total && <p className="hidden text-xs text-slate-500 sm:block">{priceLabel(price, locale)}</p>}
          <p className="hidden text-xs text-slate-600 sm:block">{it.commissionType === "none" ? (locale === "ru" ? "Без комиссии" : "Komissiyasiz") : (locale === "ru" ? "Есть комиссия" : "Komissiya bor")}{it.depositAmountMinor != null && ` · ${locale === "ru" ? "Депозит" : "Depozit"}: ${formatMinor(it.depositAmountMinor)} ${it.depositCurrency}`}</p>
          <p className="line-clamp-2 text-xs text-slate-600 sm:text-sm">{place}</p>
          {it.refreshedAt && <p className="text-xs text-slate-500">{locale === "ru" ? "Обновлено" : "Yangilangan"}: {fmtDate(it.refreshedAt, locale)}</p>}
          {(it.areaM2 || it.floor != null) && <p className="text-xs text-slate-700 sm:text-sm">{it.areaM2 ? `${Number(it.areaM2)} ${t("unit.m2")}` : ""}{it.areaM2 && it.floor != null ? " · " : ""}{it.floor != null ? t("card.floor", { n: it.floor }) : ""}</p>}
          {it.centerName && <p className="hidden text-sm text-slate-600 sm:block">{t("card.center", { name: it.centerName })}</p>}
          <p className="hidden text-xs text-slate-500 sm:block">{L.poster[it.posterType]}</p>
        </div>
      </Link>
      <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3"><CompareButton id={it.id}/></div>
    </article>
  );
}
