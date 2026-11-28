import Link from "next/link";
import { desc, eq, inArray, or } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireUserPage } from "@/lib/page-auth";
import { managedCenterIds } from "@/lib/guard";
import { shortPrice } from "@/lib/format";
import { getT } from "@/lib/i18n";
import type { MsgKey } from "@/messages/uz";
import { purgeStaleDrafts, purgeRejected } from "@/lib/drafts";
import { cabState, CHIP, contactStats, primaryThumbs } from "@/lib/cabinet-listings";
import NewListingButton from "@/components/NewListingButton";
import { NavIcon, type HeaderIcon } from "@/components/HeaderNav";

export const dynamic = "force-dynamic";
const TABS = ["", "draft", "pending", "rejected", "active", "reserved", "rented", "paused", "expired", "archived"] as const;

export default async function Kabinet({ searchParams }: { searchParams: Promise<{ holat?: string }> }) {
  const user = await requireUserPage("/kabinet");
  const { holat = "" } = await searchParams;
  const { locale, t } = await getT();
  const d = db();
  // 24 soatdan beri tahrirlanmagan o'z qoralamalari va rad etilganiga 24 soat bo'lgan e'lonlar shu yerda ham tozalanadi.
  await Promise.all([purgeStaleDrafts(user.id).catch(() => 0), purgeRejected(user.id).catch(() => 0)]);
  const managed = await managedCenterIds(user.id);
  const rows = await d.select().from(s.listings).where(or(eq(s.listings.ownerId, user.id), managed.length ? inArray(s.listings.centerId, managed) : undefined)).orderBy(desc(s.listings.updatedAt));
  const ids = rows.map((r) => r.id);
  const [stat, imgs] = await Promise.all([contactStats(ids), primaryThumbs(ids)]);
  const withState = rows.map((r) => ({ r, st: cabState(r) }));
  const shown = holat ? withState.filter((x) => x.st === holat) : withState;
  const ru = locale === "ru";
  const sum = (k: "phone" | "tg" | "fav") => [...stat.values()].reduce((n, x) => n + x[k], 0);
  // Asosiy ko'rsatkichlar (ko'rishlar soni ataylab ko'rsatilmaydi).
  const kpis: { label: string; value: number; sub: string; icon: HeaderIcon; g: string; href?: string }[] = [
    { label: ru ? "Сейчас на сайте" : "Hozir saytda", value: withState.filter((x) => x.st === "active").length, sub: ru ? "активные объявления" : "faol e’lonlar", icon: "list", g: "from-[#2a78d6] to-[#12308a]", href: "/kabinet?holat=active" },
    { label: ru ? "На проверке" : "Tekshiruvda", value: withState.filter((x) => x.st === "pending").length, sub: ru ? "обычно до 24 ч" : "odatda 24 soatgacha", icon: "clock", g: "from-[#fbbf24] to-[#ea580c]", href: "/kabinet?holat=pending" },
    { label: ru ? "Звонки" : "Qo‘ng‘iroqlar", value: sum("phone"), sub: `Telegram: ${sum("tg")}`, icon: "phone", g: "from-[#22c55e] to-[#15803d]" },
    { label: ru ? "В избранном" : "Saqlaganlar", value: sum("fav"), sub: ru ? "добавили в избранное" : "sevimliga qo‘shgan", icon: "heart", g: "from-[#fb7185] to-[#e11d48]" },
  ];
  const stLabel = (st: string, sale: boolean) => st === "rented" && sale ? (ru ? "Продано" : "Sotilgan") : t(`cab.st.${st}` as MsgKey);
  // Diqqat talab qiladigan holatlar kartochkada qisqa belgi bilan ko'rinadi (to'liq matn — e'lon ichida).
  const hint = (r: (typeof rows)[number], st: string) => r.isSuspended ? (ru ? "Заблокировано" : "Bloklangan")
    : st === "rejected" ? (ru ? "Исправьте и отправьте" : "Tuzatib qayta yuboring")
    : st === "active" && r.availabilityConfirmedAt && Date.now() - r.availabilityConfirmedAt.getTime() > 7 * 864e5 ? (ru ? "Подтвердите, что свободно" : "Bo‘shligini tasdiqlang") : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("cab.nav.listings")}</h1><p className="text-sm text-slate-500">{ru ? "Нажмите на объявление, чтобы управлять им" : "Boshqarish uchun e’lon ustiga bosing"}</p></div><NewListingButton loggedIn /></div>
      {/* Telefonda ixcham: 4 ta ko'rsatkich bitta qatorda (e'lonlar ekranning yuqorisida ko'rinsin) */}
      {rows.length > 0 && <div className="mb-4 grid grid-cols-4 gap-2 sm:gap-3">
        {kpis.map((k) => { const body = <>
          <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-2.5 sm:text-left"><span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${k.g} text-white shadow-md sm:h-10 sm:w-10 sm:rounded-2xl`}><NavIcon name={k.icon} className="h-4 w-4 sm:h-5 sm:w-5" /></span><span className="min-w-0 text-[11px] font-medium leading-tight text-slate-600 sm:text-sm">{k.label}</span></div>
          <p className="mt-1 text-center text-xl font-bold tracking-tight text-slate-900 sm:mt-3 sm:text-left sm:text-3xl">{k.value}</p><p className="hidden truncate text-xs text-slate-500 sm:block">{k.sub}</p></>;
          const cls = "block rounded-2xl border border-slate-200/70 bg-white p-2 shadow-[0_10px_30px_-14px_rgba(18,48,138,.25)] sm:rounded-3xl sm:p-4";
          return k.href ? <Link key={k.label} href={k.href} className={`${cls} transition hover:-translate-y-0.5 hover:border-brand/40`}>{body}</Link> : <div key={k.label} className={cls}>{body}</div>; })}
      </div>}
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label={t("cab.filterAria")}>
        {TABS.map((k) => { const label = t(`cab.tab.${k || "all"}` as MsgKey); const n = k ? withState.filter((x) => x.st === k).length : withState.length; return (
          <Link key={k} href={k ? `/kabinet?holat=${k}` : "/kabinet"} aria-current={holat === k} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${holat === k ? "border-brand bg-brand font-semibold text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand"}`}>{label} <span className={holat === k ? "text-white/80" : "text-slate-400"}>{n}</span></Link>); })}
      </div>
      {shown.length === 0 ? <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">{rows.length ? t("cab.emptyState") : t("cab.emptyAll", { btn: t("nav.newListing") })}</p> : (
        // Ixcham 2 ustunli to'r (bosh sahifadagi kabi). Bosilganda — to'liq boshqaruv sahifasi.
        <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5 lg:grid-cols-4">
          {shown.map(({ r, st }) => { const img = imgs.get(r.id); const h = hint(r, st); const x = stat.get(r.id)!; return (
            <li key={r.id}>
              <Link href={`/kabinet/elonlar/${r.id}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {img ? <img src={img} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition group-hover:scale-[1.03]" /> : <span className="grid h-full place-items-center text-xs text-slate-400">{t("card.noImg")}</span>}
                  <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm ${CHIP[st] ?? "bg-slate-100"}`}>{stLabel(st, r.dealType === "sale")}</span>
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-900">{r.title || t("cab.untitled")}</p>
                <p className="text-sm font-bold text-slate-900">{shortPrice({ amount: r.priceAmountMinor, currency: r.currency, period: r.pricePeriod, basis: r.priceBasis }, r.areaM2, locale)}</p>
                {h ? <p className="mt-0.5 text-xs font-medium text-amber-700">⚠ {h}</p>
                  : r.moderationStatus === "approved" && <p className="mt-0.5 text-xs text-slate-500">📞 {x.phone} · ♡ {x.fav}</p>}
              </Link>
            </li>); })}
        </ul>)}
    </div>
  );
}
