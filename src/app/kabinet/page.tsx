import Link from "next/link";
import { showViewCounts } from "@/lib/site-info";
import { desc, eq, inArray, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireUserPage } from "@/lib/page-auth";
import { managedCenterIds } from "@/lib/guard";
import { effectiveAvailability } from "@/lib/status";
import { fmtDate, labels, priceLabel } from "@/lib/format";
import { getT } from "@/lib/i18n";
import type { MsgKey } from "@/messages/uz";
import { mediaUrl } from "@/lib/storage";
import ListingActions from "@/components/ListingActions";
import DeleteDraftButton from "@/components/DeleteDraftButton";
import { purgeStaleDrafts, DRAFT_TTL_HOURS } from "@/lib/drafts";
import NewListingButton from "@/components/NewListingButton";
import { NavIcon, type HeaderIcon } from "@/components/HeaderNav";

export const dynamic = "force-dynamic";
const TABS = ["", "draft", "pending", "rejected", "active", "reserved", "rented", "paused", "expired", "archived"] as const;

export default async function Kabinet({ searchParams }: { searchParams: Promise<{ holat?: string }> }) {
  const user = await requireUserPage("/kabinet");
  const { holat = "" } = await searchParams;
  const { locale, t } = await getT();
  const L = labels(locale);
  const d = db();
  // 24 soatdan beri tahrirlanmagan o'z qoralamalari shu yerda ham tozalanadi (kunlik cron'ni kutmasdan).
  await purgeStaleDrafts(user.id).catch(() => 0);
  const managed = await managedCenterIds(user.id);
  const rows = await d.select().from(s.listings).where(or(eq(s.listings.ownerId, user.id), managed.length ? inArray(s.listings.centerId, managed) : undefined)).orderBy(desc(s.listings.updatedAt));
  const ids = rows.map((r) => r.id);
  const stat = new Map<string, { phone: number; tg: number; fav: number }>();
  if (ids.length) {
    const ev = await d.select({ id: s.contactEvents.listingId, kind: s.contactEvents.kind, n: sql<number>`count(*)::int` }).from(s.contactEvents).where(inArray(s.contactEvents.listingId, ids)).groupBy(s.contactEvents.listingId, s.contactEvents.kind);
    const fv = await d.select({ id: s.favorites.listingId, n: sql<number>`count(*)::int` }).from(s.favorites).where(inArray(s.favorites.listingId, ids)).groupBy(s.favorites.listingId);
    for (const id of ids) stat.set(id, { phone: 0, tg: 0, fav: 0 });
    for (const e of ev) { const x = stat.get(e.id)!; if (e.kind === "phone_reveal") x.phone = e.n; if (e.kind === "telegram_click") x.tg = e.n; }
    for (const f of fv) stat.get(f.id)!.fav = f.n;
  }
  const imgs = new Map<string, string | null>();
  if (ids.length) for (const i of await d.select({ id: s.listingImages.listingId, k: sql<string>`COALESCE(${s.listingImages.thumbKey}, ${s.listingImages.storageKey})` }).from(s.listingImages).where(sql`${s.listingImages.isPrimary} AND ${inArray(s.listingImages.listingId, ids)}`)) imgs.set(i.id, mediaUrl(i.k));
  const state = (r: (typeof rows)[number]) => r.availabilityStatus === "archived" ? "archived" : r.moderationStatus !== "approved" ? r.moderationStatus : ({ available: "active", reserved: "reserved", rented: "rented", paused: "paused", expired: "expired" } as const)[effectiveAvailability(r) as "available"];
  const withState = rows.map((r) => ({ r, st: state(r) }));
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
  const chip: Record<string, string> = { active: "bg-emerald-50 text-emerald-700", pending: "bg-amber-50 text-amber-800", rejected: "bg-red-50 text-red-700", draft: "bg-slate-100 text-slate-700", reserved: "bg-blue-50 text-blue-700", rented: "bg-violet-50 text-violet-700", paused: "bg-slate-100 text-slate-600", expired: "bg-orange-50 text-orange-700", archived: "bg-slate-100 text-slate-500" };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("cab.nav.listings")}</h1><p className="text-sm text-slate-500">{ru ? "Ваши объявления и их результаты" : "E’lonlaringiz va ularning natijalari"}</p></div><NewListingButton loggedIn /></div>
      {rows.length > 0 && <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => { const body = <>
          <div className="flex items-center gap-2.5"><span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${k.g} text-white shadow-md`}><NavIcon name={k.icon} className="h-5 w-5" /></span><span className="min-w-0 text-sm font-medium leading-tight text-slate-600">{k.label}</span></div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{k.value}</p><p className="truncate text-xs text-slate-500">{k.sub}</p></>;
          const cls = "block rounded-3xl border border-slate-200/70 bg-white p-4 shadow-[0_10px_30px_-14px_rgba(18,48,138,.25)]";
          return k.href ? <Link key={k.label} href={k.href} className={`${cls} transition hover:-translate-y-0.5 hover:border-brand/40`}>{body}</Link> : <div key={k.label} className={cls}>{body}</div>; })}
      </div>}
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label={t("cab.filterAria")}>
        {TABS.map((k) => { const label = t(`cab.tab.${k || "all"}` as MsgKey); const n = k ? withState.filter((x) => x.st === k).length : withState.length; return (
          <Link key={k} href={k ? `/kabinet?holat=${k}` : "/kabinet"} aria-current={holat === k} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${holat === k ? "border-brand bg-brand font-semibold text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand"}`}>{label} <span className={holat === k ? "text-white/80" : "text-slate-400"}>{n}</span></Link>); })}
      </div>
      {shown.length === 0 ? <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">{rows.length ? t("cab.emptyState") : t("cab.emptyAll", { btn: t("nav.newListing") })}</p> : (
        <ul className="space-y-3">
          {shown.map(({ r, st }) => { const x = stat.get(r.id)!; const img = imgs.get(r.id); return (
            <li key={r.id} className="grid gap-3 rounded-3xl border border-slate-200/70 bg-white p-3 shadow-[0_10px_30px_-16px_rgba(18,48,138,.25)] sm:grid-cols-[160px_1fr] sm:p-4">
              <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100 text-sm text-slate-500 grid place-items-center">{/* eslint-disable-next-line @next/next/no-img-element */}{img ? <img src={img} alt="" className="h-full w-full object-cover" /> : t("card.noImg")}</div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{r.title || t("cab.untitled")}</h2><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip[st] ?? "bg-slate-100"}`}>{st === "rented" && r.dealType === "sale" ? (locale === "ru" ? "Продано" : "Sotilgan") : t(`cab.st.${st}` as MsgKey)}</span>{r.dealType === "sale" && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{locale === "ru" ? "Продажа" : "Sotuv"}</span>}</div>
                <p className="text-sm text-slate-600">{L.category[r.category]} · {priceLabel({ amount: r.priceAmountMinor, currency: r.currency, period: r.pricePeriod, basis: r.priceBasis, negotiable: r.priceNegotiable }, locale)}{r.availabilityConfirmedAt ? ` · ${t("card.confirmed", { date: fmtDate(r.availabilityConfirmedAt, locale) })}` : ""}{r.expiresAt && st === "active" ? ` · ${t("cab.expires", { date: fmtDate(r.expiresAt, locale) })}` : ""}</p>
                {r.isSuspended && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{locale === "ru" ? "Заблокировано модератором" : "Moderator tomonidan bloklangan"}: {r.suspensionReason}</p>}
                {st === "rejected" && <p role="status" className="rounded bg-red-50 p-2 text-sm text-red-800"><strong>{t("cab.rejectReason")}</strong> {r.rejectionReason}</p>}
                {st === "pending" && <p className="text-sm text-slate-600">{t("cab.pendingNote")}</p>}
                {st === "draft" && !r.publishedAt && (() => { const left = Math.max(1, Math.ceil((r.updatedAt.getTime() + DRAFT_TTL_HOURS * 36e5 - Date.now()) / 36e5)); return <p className="text-xs text-amber-800">{locale === "ru" ? `Черновик будет автоматически удалён через ${left} ч., если его не дописать и не отправить.` : `Qoralama to‘ldirilib yuborilmasa, ${left} soatdan keyin avtomatik o‘chiriladi.`}</p>; })()}
                {st === "active" && r.availabilityConfirmedAt && Date.now() - r.availabilityConfirmedAt.getTime() > 7*86400000 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{locale === "ru" ? "Помещение ещё свободно? Подтвердите доступность или отметьте, что оно сдано." : "Joyingiz hali ham bo‘shmi? Bo‘shligini tasdiqlang yoki ijaraga berilganini belgilang."}</p>}
                {r.moderationStatus === "approved" && <p className="text-xs text-slate-500">{showViewCounts() ? `${locale === "ru" ? "Просмотры" : "Ko‘rishlar"}: ${r.viewCount} · ` : ""}{t("cab.stats", { phone: x.phone, tg: x.tg, fav: x.fav })}</p>}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {st !== "archived" && <Link href={`/kabinet/elon/${r.id}`} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">{t("cab.edit")}</Link>}
                  {r.moderationStatus === "approved" && <Link href={`/joylar/${r.id}-${r.slug}`} className="text-sm text-brand underline">{t("cab.view")}</Link>}
                  {st === "draft" && !r.publishedAt && <DeleteDraftButton id={r.id} />}
                </div>
                {r.moderationStatus === "approved" && !r.isSuspended && st !== "archived" && <ListingActions id={r.id} actions={[
                  ...(st === "active" ? [{ label: t("cab.a.confirm"), body: { action: "confirm" } }, { label: t("cab.a.reserved"), body: { action: "set", to: "reserved" } }, { label: r.dealType === "sale" ? (locale === "ru" ? "Продано" : "Sotildi") : t("cab.a.rented"), body: { action: "set", to: "rented" }, confirm: t("cab.c.rented") }, { label: t("cab.a.pause"), body: { action: "set", to: "paused" } }] : []),
                  ...(st === "reserved" ? [{ label: t("cab.a.free"), body: { action: "set", to: "available" } }, { label: r.dealType === "sale" ? (locale === "ru" ? "Продано" : "Sotildi") : t("cab.a.rented"), body: { action: "set", to: "rented" }, confirm: t("cab.c.rented") }, { label: t("cab.a.pause"), body: { action: "set", to: "paused" } }] : []),
                  ...(["paused", "rented"].includes(st) ? [{ label: t("cab.a.reactivate"), body: { action: "set", to: "available" } }] : []),
                  ...(st === "expired" ? [{ label: t("cab.a.expiredReactivate"), body: { action: "confirm" } }] : []),
                  { label: t("cab.a.archive"), body: { action: "set", to: "archived" }, confirm: t("cab.c.archiveApproved"), tone: "danger" as const },
                ]} />}
                {r.moderationStatus !== "approved" && st !== "archived" && <ListingActions id={r.id} actions={[{ label: t("cab.a.archive"), body: { action: "set", to: "archived" }, confirm: t("cab.c.archive"), tone: "danger" }]} />}
              </div>
            </li>); })}
        </ul>)}
    </div>
  );
}
