import Link from "next/link";
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
import NewListingButton from "@/components/NewListingButton";

export const dynamic = "force-dynamic";
const TABS = ["", "draft", "pending", "rejected", "active", "reserved", "rented", "paused", "expired", "archived"] as const;

export default async function Kabinet({ searchParams }: { searchParams: Promise<{ holat?: string }> }) {
  const user = await requireUserPage("/kabinet");
  const { holat = "" } = await searchParams;
  const { locale, t } = await getT();
  const L = labels(locale);
  const d = db();
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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3"><h1 className="text-xl font-bold">{t("cab.nav.listings")}</h1><NewListingButton loggedIn /></div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t("cab.filterAria")}>
        {TABS.map((k) => { const label = t(`cab.tab.${k || "all"}` as MsgKey); const n = k ? withState.filter((x) => x.st === k).length : withState.length; return (
          <Link key={k} href={k ? `/kabinet?holat=${k}` : "/kabinet"} aria-current={holat === k} className={`rounded-full border px-3 py-1 text-sm ${holat === k ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{label} ({n})</Link>); })}
      </div>
      {shown.length === 0 ? <p className="rounded border border-dashed border-slate-300 p-6 text-slate-600">{rows.length ? t("cab.emptyState") : t("cab.emptyAll", { btn: t("nav.newListing") })}</p> : (
        <ul className="space-y-3">
          {shown.map(({ r, st }) => { const x = stat.get(r.id)!; const img = imgs.get(r.id); return (
            <li key={r.id} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[140px_1fr]">
              <div className="aspect-[16/10] overflow-hidden rounded bg-slate-100 text-sm text-slate-500 grid place-items-center">{/* eslint-disable-next-line @next/next/no-img-element */}{img ? <img src={img} alt="" className="h-full w-full object-cover" /> : t("card.noImg")}</div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{r.title || t("cab.untitled")}</h2><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{t(`cab.st.${st}` as MsgKey)}</span></div>
                <p className="text-sm text-slate-600">{L.category[r.category]} · {priceLabel({ amount: r.priceAmountMinor, currency: r.currency, period: r.pricePeriod, basis: r.priceBasis, negotiable: r.priceNegotiable }, locale)}{r.availabilityConfirmedAt ? ` · ${t("card.confirmed", { date: fmtDate(r.availabilityConfirmedAt, locale) })}` : ""}{r.expiresAt && st === "active" ? ` · ${t("cab.expires", { date: fmtDate(r.expiresAt, locale) })}` : ""}</p>
                {r.isSuspended && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{locale === "ru" ? "Заблокировано модератором" : "Moderator tomonidan bloklangan"}: {r.suspensionReason}</p>}
                {st === "rejected" && <p role="status" className="rounded bg-red-50 p-2 text-sm text-red-800"><strong>{t("cab.rejectReason")}</strong> {r.rejectionReason}</p>}
                {st === "pending" && <p className="text-sm text-slate-600">{t("cab.pendingNote")}</p>}
                {st === "active" && r.availabilityConfirmedAt && Date.now() - r.availabilityConfirmedAt.getTime() > 7*86400000 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{locale === "ru" ? "Помещение ещё свободно? Подтвердите доступность или отметьте, что оно сдано." : "Joyingiz hali ham bo‘shmi? Bo‘shligini tasdiqlang yoki ijaraga berilganini belgilang."}</p>}
                {r.moderationStatus === "approved" && <p className="text-xs text-slate-500">{t("cab.stats", { phone: x.phone, tg: x.tg, fav: x.fav })}</p>}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {st !== "archived" && <Link href={`/kabinet/elon/${r.id}`} className="rounded bg-brand px-3 py-1 text-sm text-white">{t("cab.edit")}</Link>}
                  {r.moderationStatus === "approved" && <Link href={`/joylar/${r.id}-${r.slug}`} className="text-sm text-brand underline">{t("cab.view")}</Link>}
                </div>
                {r.moderationStatus === "approved" && !r.isSuspended && st !== "archived" && <ListingActions id={r.id} actions={[
                  ...(st === "active" ? [{ label: t("cab.a.confirm"), body: { action: "confirm" } }, { label: t("cab.a.reserved"), body: { action: "set", to: "reserved" } }, { label: t("cab.a.rented"), body: { action: "set", to: "rented" }, confirm: t("cab.c.rented") }, { label: t("cab.a.pause"), body: { action: "set", to: "paused" } }] : []),
                  ...(st === "reserved" ? [{ label: t("cab.a.free"), body: { action: "set", to: "available" } }, { label: t("cab.a.rented"), body: { action: "set", to: "rented" }, confirm: t("cab.c.rented") }, { label: t("cab.a.pause"), body: { action: "set", to: "paused" } }] : []),
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
