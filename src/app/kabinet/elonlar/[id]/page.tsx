import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireUserPage } from "@/lib/page-auth";
import { isUuid, managedCenterIds } from "@/lib/guard";
import { showViewCounts } from "@/lib/site-info";
import { fmtDate, labels, shortPrice } from "@/lib/format";
import { getT } from "@/lib/i18n";
import type { MsgKey } from "@/messages/uz";
import { cabState, CHIP, contactStats, primaryThumbs } from "@/lib/cabinet-listings";
import { DRAFT_TTL_HOURS, REJECTED_TTL_HOURS } from "@/lib/drafts";
import ListingActions from "@/components/ListingActions";
import DeleteDraftButton from "@/components/DeleteDraftButton";

export const dynamic = "force-dynamic";

/** Kabinetdagi bitta e'lon: to'liq ma'lumot, natijalar va barcha amallar (tahrirlash, ijaraga berildi, arxiv...). */
export default async function ManageListing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/kabinet/elonlar/${id}`);
  if (!isUuid(id)) notFound();
  const [r] = await db().select().from(s.listings).where(eq(s.listings.id, id)).limit(1);
  if (!r || (r.ownerId !== user.id && !(r.centerId && (await managedCenterIds(user.id)).includes(r.centerId)))) notFound();
  const { locale, t } = await getT(); const ru = locale === "ru"; const L = labels(locale);
  const [stat, imgs] = await Promise.all([contactStats([r.id]), primaryThumbs([r.id], true)]);
  const x = stat.get(r.id)!, img = imgs.get(r.id), st = cabState(r), sale = r.dealType === "sale";
  const rentedLabel = sale ? (ru ? "Продано" : "Sotildi") : t("cab.a.rented");
  const left = (h: number) => Math.max(1, Math.ceil((r.updatedAt.getTime() + h * 36e5 - Date.now()) / 36e5));
  const actions = r.moderationStatus === "approved" && !r.isSuspended && st !== "archived" ? [
    ...(st === "active" ? [{ label: t("cab.a.confirm"), body: { action: "confirm" } }, { label: t("cab.a.reserved"), body: { action: "set", to: "reserved" } }, { label: rentedLabel, body: { action: "set", to: "rented" }, confirm: t("cab.c.rented") }, { label: t("cab.a.pause"), body: { action: "set", to: "paused" } }] : []),
    ...(st === "reserved" ? [{ label: t("cab.a.free"), body: { action: "set", to: "available" } }, { label: rentedLabel, body: { action: "set", to: "rented" }, confirm: t("cab.c.rented") }, { label: t("cab.a.pause"), body: { action: "set", to: "paused" } }] : []),
    ...(["paused", "rented"].includes(st) ? [{ label: t("cab.a.reactivate"), body: { action: "set", to: "available" } }] : []),
    ...(st === "expired" ? [{ label: t("cab.a.expiredReactivate"), body: { action: "confirm" } }] : []),
    { label: t("cab.a.archive"), body: { action: "set", to: "archived" }, confirm: t("cab.c.archiveApproved"), tone: "danger" as const },
  ] : r.moderationStatus !== "approved" && st !== "archived" ? [{ label: t("cab.a.archive"), body: { action: "set", to: "archived" }, confirm: t("cab.c.archive"), tone: "danger" as const }] : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/kabinet" className="inline-flex items-center gap-1 text-sm font-medium text-brand">← {t("cab.nav.listings")}</Link>
      <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_10px_30px_-16px_rgba(18,48,138,.25)]">
        <div className="relative aspect-[16/10] bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-sm text-slate-400">{t("card.noImg")}</span>}
          <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow ${CHIP[st] ?? "bg-slate-100"}`}>{st === "rented" && sale ? (ru ? "Продано" : "Sotilgan") : t(`cab.st.${st}` as MsgKey)}</span>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{r.title || t("cab.untitled")}</h1>
            <p className="mt-0.5 text-lg font-bold text-brand">{shortPrice({ amount: r.priceAmountMinor, currency: r.currency, period: r.pricePeriod, basis: r.priceBasis }, r.areaM2, locale)}</p>
            <p className="text-sm text-slate-600">{L.category[r.category]}{sale ? ` · ${ru ? "Продажа" : "Sotuv"}` : ""}{r.areaM2 ? ` · ${Number(r.areaM2)} m²` : ""}</p>
          </div>
          {r.isSuspended && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{ru ? "Заблокировано модератором" : "Moderator tomonidan bloklangan"}: {r.suspensionReason}</p>}
          {st === "rejected" && <p role="status" className="rounded-xl bg-red-50 p-3 text-sm text-red-800"><strong>{t("cab.rejectReason")}</strong> {r.rejectionReason}
            <span className="mt-1 block text-xs">{ru ? `Исправьте и отправьте снова — иначе объявление удалится через ${left(REJECTED_TTL_HOURS)} ч.` : `Tuzatib qayta yuboring — aks holda e’lon ${left(REJECTED_TTL_HOURS)} soatdan keyin o‘chiriladi.`}</span></p>}
          {st === "pending" && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t("cab.pendingNote")}</p>}
          {st === "draft" && !r.publishedAt && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{ru ? `Черновик будет автоматически удалён через ${left(DRAFT_TTL_HOURS)} ч., если его не дописать и не отправить.` : `Qoralama to‘ldirilib yuborilmasa, ${left(DRAFT_TTL_HOURS)} soatdan keyin avtomatik o‘chiriladi.`}</p>}
          {st === "active" && r.availabilityConfirmedAt && Date.now() - r.availabilityConfirmedAt.getTime() > 7 * 864e5 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{ru ? "Помещение ещё свободно? Подтвердите доступность или отметьте, что оно сдано." : "Joyingiz hali ham bo‘shmi? Bo‘shligini tasdiqlang yoki ijaraga berilganini belgilang."}</p>}

          {r.moderationStatus === "approved" && <div className="grid grid-cols-3 gap-2 text-center">
            {[[ru ? "Звонки" : "Qo‘ng‘iroq", x.phone], ["Telegram", x.tg], [ru ? "В избранном" : "Saqlagan", x.fav]].map(([l, n]) =>
              <div key={String(l)} className="rounded-2xl bg-slate-50 p-3"><strong className="block text-xl text-slate-900">{n}</strong><span className="text-xs text-slate-500">{l}</span></div>)}
          </div>}
          <p className="text-xs text-slate-500">
            {r.availabilityConfirmedAt ? t("card.confirmed", { date: fmtDate(r.availabilityConfirmedAt, locale) }) : ""}
            {r.expiresAt && st === "active" ? ` · ${t("cab.expires", { date: fmtDate(r.expiresAt, locale) })}` : ""}
            {showViewCounts() && r.moderationStatus === "approved" ? ` · ${ru ? "Просмотры" : "Ko‘rishlar"}: ${r.viewCount}` : ""}
          </p>

          <div className="flex gap-2 pt-1 [&>a]:flex-1">
            {st !== "archived" && <Link href={`/kabinet/elon/${r.id}`} className="rounded-2xl bg-brand px-4 py-3 text-center text-sm font-semibold text-white hover:bg-brand-dark">✏️ {t("cab.edit")}</Link>}
            {r.moderationStatus === "approved" && <Link href={`/joylar/${r.id}-${r.slug}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-brand hover:border-brand">{t("cab.view")} ↗</Link>}
          </div>
          {actions.length > 0 && <div className="border-t border-slate-100 pt-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{ru ? "Статус объявления" : "E’lon holati"}</p><ListingActions id={r.id} actions={actions} big /></div>}
          {((st === "draft" && !r.publishedAt) || st === "archived") && <div className="border-t border-slate-100 pt-3"><DeleteDraftButton id={r.id} archived={st === "archived"} redirectTo="/kabinet" big /></div>}
        </div>
      </div>
    </div>
  );
}
