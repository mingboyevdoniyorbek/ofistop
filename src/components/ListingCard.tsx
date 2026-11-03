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

/** VIP belgisi: oltin tojli yorliq (rasmning chap yuqori burchagida). */
export function VipBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg bg-gradient-to-b from-[#ffe27a] to-[#f5b400] px-2 py-[3px] text-[11px] font-black tracking-wider text-[#4a3000] shadow-[0_2px_6px_rgba(180,120,0,0.35)] ring-1 ring-[#e0a400]/60 ${className}`}>
      <svg viewBox="0 0 16 12" aria-hidden="true" className="h-2.5 w-3"><path d="M1 3.5 4.5 6 8 1l3.5 5L15 3.5 13.6 11H2.4Z" fill="#4a3000" /></svg>VIP
    </span>
  );
}

/**
 * E'lon kartochkasi — bitta uslub hamma joyda (bosh sahifa, katalog, sevimlilar):
 * katta yumaloq rasm, ustida yurakcha, VIP va ishonch belgilari; ostida narx, nom va qisqa ma'lumot.
 * compact — gorizontal qatorlar uchun (qo'shimcha qatorlarsiz).
 */
export default async function ListingCard({ it, note, compact = false }: { it: Item; note?: string; compact?: boolean }) {
  const price = { amount: it.priceAmountMinor, currency: it.currency, period: it.pricePeriod, basis: it.priceBasis, negotiable: it.priceNegotiable };
  const { locale, t } = await getT(); const L = labels(locale); const ru = locale === "ru";
  const total = totalLabel(price, it.areaM2, locale);
  const fav = await favState();
  const trust = it.dealType === "sale" ? { icon: "🔑", text: ru ? "Продаётся" : "Sotiladi", cls: "bg-emerald-600/90" }
    : it.posterType === "owner" ? { icon: "✓", text: ru ? "От владельца" : "Egasidan", cls: "bg-slate-900/55" }
    : it.posterType === "business_center" ? { icon: "✓", text: ru ? "От бизнес-центра" : "Markazdan", cls: "bg-slate-900/55" } : null;
  const meta = [it.districtName ?? it.regionName, it.areaM2 ? `${Number(it.areaM2)} ${t("unit.m2")}` : null, it.floor != null ? t("card.floor", { n: it.floor }) : null].filter(Boolean).join(" · ");
  return (
    <article className="group relative">
      <div className="absolute right-2 top-2 z-10"><FavoriteButton variant="icon" listingId={it.id} initial={fav.ids.has(it.id)} loggedIn={fav.loggedIn} /></div>
      <Link href={`/joylar/${it.id}-${it.slug}`} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
        <div className="relative overflow-hidden rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_14px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5">
          <ListingPhoto thumb={mediaUrl(it.imageKey)} medium={mediaUrl(it.imageMediumKey)} full={mediaUrl(it.imageFullKey)} alt={it.title}
            className="aspect-[4/3] transition-transform duration-300 group-hover:scale-[1.03]" sizes={compact ? "(max-width: 640px) 62vw, 270px" : "(max-width: 1024px) 50vw, 25vw"}>
            {it.imageKey?.startsWith("placeholder:") ? t("card.demoImg", { cat: L.category[it.category] }) : t("card.noImg")}
          </ListingPhoto>
          {it.isTop && <VipBadge className="absolute left-2 top-2 z-10" />}
          {trust && <span className={`absolute bottom-2 left-2 z-10 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm ${trust.cls}`}>{trust.icon} {trust.text}</span>}
        </div>
        <div className="mt-2.5 space-y-0.5 px-0.5">
          {note && <span className="inline-block rounded bg-amber-100 px-1.5 text-xs text-amber-900">{note}</span>}
          <p className="truncate text-[15px] font-extrabold tracking-tight text-slate-900 sm:text-base">{primaryPrice(price, it.areaM2, locale)}</p>
          <h3 className="line-clamp-1 text-sm font-medium text-slate-800">{it.title}</h3>
          {meta && <p className="line-clamp-1 text-xs text-slate-500">{meta}</p>}
          {!compact && <>
            {total && <p className="hidden text-xs text-slate-500 sm:block">{priceLabel(price, locale)}</p>}
            <p className="hidden text-xs text-slate-500 sm:block">{it.commissionType === "none" ? (ru ? "Без комиссии" : "Komissiyasiz") : (ru ? "Есть комиссия" : "Komissiya bor")}{it.depositAmountMinor != null && ` · ${ru ? "Депозит" : "Depozit"}: ${formatMinor(it.depositAmountMinor)} ${it.depositCurrency}`}{it.centerName ? ` · ${it.centerName}` : ""}</p>
            {it.refreshedAt && <p className="hidden text-[11px] text-slate-400 sm:block">{ru ? "Обновлено" : "Yangilangan"}: {fmtDate(it.refreshedAt, locale)}</p>}
          </>}
        </div>
      </Link>
      {!compact && <div className="mt-2 hidden px-0.5 sm:block"><CompareButton id={it.id}/></div>}
    </article>
  );
}
