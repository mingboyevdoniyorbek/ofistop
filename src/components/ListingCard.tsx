import Link from "next/link";
import { labels, shortPrice, confirmedAgo } from "@/lib/format";
import { nearestMetro } from "@/lib/metro";
import { publicPoint } from "@/lib/geo";
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
 * rasm (yurakcha, VIP, «Egasidan»), ostida faqat 3 qator: qisqa narx → sarlavha → «tuman · m² · qavat».
 * Qolgan tafsilotlar (komissiya, depozit, sana) e'lon sahifasida — kartochka ko'z uchun yengil bo'lsin.
 */
export default async function ListingCard({ it, note, compact = false }: { it: Item; note?: string; compact?: boolean }) {
  const price = { amount: it.priceAmountMinor, currency: it.currency, period: it.pricePeriod, basis: it.priceBasis, negotiable: it.priceNegotiable };
  const { locale, t } = await getT(); const L = labels(locale); const ru = locale === "ru";
  const fav = await favState();
  const trust = it.dealType === "sale" ? { icon: "🔑", text: ru ? "Продаётся" : "Sotiladi", cls: "bg-emerald-600/90" }
    : it.posterType === "owner" ? { icon: "✓", text: ru ? "От владельца" : "Egasidan", cls: "bg-slate-900/55" }
    : null; // «Markazdan» ko'rsatilmaydi: deyarli har kartochkada bo'lib, ko'z uni sezmay qo'yardi
  const meta = [it.districtName ?? it.regionName, it.areaM2 ? `${Number(it.areaM2)} ${t("unit.m2")}` : null, it.floor != null ? t("card.floor", { n: it.floor }) : null].filter(Boolean).join(" · ");
  // Metro: aniq manzil yashirilgan e'lonlarda saytda ko'rinadigan taxminiy nuqtadan hisoblanadi (egasining manzili oshkor bo'lmaydi).
  const pt = (() => { try { return publicPoint({ id: it.id, lat: it.metroLat, lng: it.metroLng, exactLocationPublic: it.metroExact }); } catch { return null; } })();
  const metro = pt ? nearestMetro(pt.lat, pt.lng) : null;
  // Bo'shligi yaqinda (7 kun ichida) tasdiqlangan bo'lsa — rasm ustida yashil belgi
  const fresh = it.availabilityConfirmedAt && Date.now() - new Date(it.availabilityConfirmedAt).getTime() < 7 * 864e5 ? confirmedAgo(it.availabilityConfirmedAt, locale) : null;
  const frame = it.isTop && it.centerName ? "both" : it.isTop ? "vip" : it.centerName ? "center" : null;
  return (
    <article className="group relative">
      <div className="absolute right-2 top-2 z-10"><FavoriteButton variant="icon" listingId={it.id} initial={fav.ids.has(it.id)} loggedIn={fav.loggedIn} /></div>
      <Link href={`/joylar/${it.id}-${it.slug}`} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
        {/* Hoshiya: VIP — oltin; biznes markaz xonasi — elektr ko'k; VIP + markaz — oltin→ko'k yorqin gradient */}
        <div className={frame === "both" ? "rounded-2xl bg-gradient-to-br from-[#ffd23f] via-[#3ee0ff] to-[#2f5bff] p-[2.5px] shadow-[0_8px_24px_-8px_rgba(47,91,255,0.6),0_4px_14px_-6px_rgba(255,190,40,0.55)]" : ""}>
        <div className={`relative overflow-hidden ${frame === "both" ? "rounded-[14px]" : "rounded-2xl"} ${frame === "vip" ? "shadow-[0_6px_20px_-6px_rgba(180,120,0,0.45)] ring-2 ring-[#f5c542]" : frame === "center" ? "shadow-[0_6px_20px_-6px_rgba(37,99,255,0.55)] ring-2 ring-[#2f7bff]" : frame === "both" ? "" : "shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_14px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5"}`}>
          <ListingPhoto thumb={mediaUrl(it.imageKey)} medium={mediaUrl(it.imageMediumKey)} full={mediaUrl(it.imageFullKey)} alt={it.title} fit="cover"
            className="aspect-square transition-transform duration-300 group-hover:scale-[1.03] sm:aspect-[4/3]" sizes={compact ? "(max-width: 640px) 62vw, 270px" : "(max-width: 1024px) 50vw, 25vw"}>
            {it.imageKey?.startsWith("placeholder:") ? t("card.demoImg", { cat: L.category[it.category] }) : t("card.noImg")}
          </ListingPhoto>
          {it.isTop && <VipBadge className="absolute left-2 top-2 z-10" />}
          {fresh && <span className="absolute bottom-2 right-2 z-10 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm" title={ru ? "Владелец подтвердил, что помещение свободно" : "Egasi joy bo‘shligini tasdiqlagan"}>✓ {fresh}</span>}
          {trust && <span className={`absolute bottom-2 left-2 z-10 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm ${trust.cls}`}>{trust.icon} {trust.text}</span>}
        </div>
        </div>
        <div className="mt-2.5 space-y-0.5 px-0.5">
          {note && <span className="inline-block rounded bg-amber-100 px-1.5 text-xs text-amber-900">{note}</span>}
          <p className="truncate text-base font-extrabold tracking-tight text-slate-900">{shortPrice(price, it.areaM2, locale)}</p>
          <h3 className="line-clamp-1 text-sm text-slate-800">{it.title}</h3>
          {meta && <p className="line-clamp-1 text-xs text-slate-500">{meta}</p>}
          {metro && <p className="flex items-center gap-1.5 truncate text-xs text-slate-600"><span aria-hidden="true" className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full text-[8px] font-black text-white" style={{ background: metro.color }}>M</span><span className="truncate">{metro.name} · {pt?.approx ? "≈" : ""}{metro.minutes} {ru ? "мин" : "daq"}</span></p>}
        </div>
      </Link>
    </article>
  );
}
