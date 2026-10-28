import Link from "next/link";
import { and, desc, eq, gt, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { publicCond } from "@/lib/search";
import { labels, fmtDate, priceLabel, totalLabel } from "@/lib/format";
import { getT } from "@/lib/i18n";
import type { MsgKey } from "@/messages/uz";
import { mediaUrl } from "@/lib/storage";
import AdminAction from "@/components/AdminAction";
import { requireStaffPage } from "@/lib/staff";

const TABS = ["pending", "active", "expired", "rejected", "all"] as const;
const PAGE = 20;

export default async function AdminListings({ searchParams }: { searchParams: Promise<{ holat?: string; sahifa?: string }> }) {
  await requireStaffPage();
  const sp = await searchParams; const { locale, t } = await getT(); const lb = labels(locale);
  const holat = TABS.find((k) => k === sp.holat) ?? "pending";
  const page = Math.max(1, Number(sp.sahifa) || 1);
  const now = new Date(); const d = db(); const L = s.listings;
  const where: Record<string, SQL | undefined> = {
    pending: eq(L.moderationStatus, "pending"),
    active: publicCond(),
    expired: and(eq(L.moderationStatus, "approved"), or(eq(L.availabilityStatus, "expired"), and(eq(L.availabilityStatus, "available"), lte(L.expiresAt, now)))),
    rejected: eq(L.moderationStatus, "rejected"),
    all: sql`${L.moderationStatus} <> 'draft'`,
  };
  const rows = await d.select({ l: L, owner: s.profiles.displayName, ownerType: s.profiles.posterType, region: locale === "ru" ? s.regions.nameRu : s.regions.nameUz, center: s.businessCenters.name })
    .from(L).leftJoin(s.profiles, eq(s.profiles.userId, L.ownerId)).leftJoin(s.regions, eq(s.regions.id, L.regionId)).leftJoin(s.businessCenters, eq(s.businessCenters.id, L.centerId))
    .where(where[holat]).orderBy(holat === "pending" ? L.updatedAt : desc(L.updatedAt)).limit(PAGE + 1).offset((page - 1) * PAGE);
  const more = rows.length > PAGE; const shown = rows.slice(0, PAGE);
  const ids = shown.map((r) => r.l.id);
  const imgs = ids.length ? await d.select().from(s.listingImages).where(inArray(s.listingImages.listingId, ids)).orderBy(s.listingImages.position) : [];
  const q = (p: number) => `/admin/elonlar?holat=${holat}&sahifa=${p}`;
  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">{t("adm.nav.listings")}</h1>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t("adm.l.status")}>
        {TABS.map((k) => <Link key={k} href={`/admin/elonlar?holat=${k}`} aria-current={holat === k} className={`rounded-full border px-3 py-1 text-sm ${holat === k ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{t(`adm.l.tab.${k}` as MsgKey)}</Link>)}
      </div>
      {shown.length === 0 && <p className="rounded border border-dashed border-slate-300 p-6 text-center text-slate-500">{t("adm.l.empty")}</p>}
      <ul className="space-y-3">
        {shown.map(({ l, owner, ownerType, region, center }) => {
          const my = imgs.filter((i) => i.listingId === l.id);
          const p = { amount: l.priceAmountMinor, currency: l.currency, period: l.pricePeriod, basis: l.priceBasis };
          const total = totalLabel(p, l.areaM2, locale);
          return (
            <li key={l.id} className="rounded border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{l.title} {l.isDemo && <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">DEMO</span>}</p>
                  <p className="text-sm text-slate-600">{lb.category[l.category]} · {region}{center ? ` · ${center}` : ""} · {priceLabel({ ...p, negotiable: l.priceNegotiable }, locale)}{total ? ` · ${total}` : ""}</p>
                  <p className="text-xs text-slate-500">{t("adm.l.meta", { mod: t(`adm.mod.${l.moderationStatus}` as MsgKey), avail: lb.avail[l.availabilityStatus], exp: fmtDate(l.expiresAt, locale) || "—", owner: owner ?? "", type: lb.poster[ownerType ?? "owner"] })}</p>
                  {l.isSuspended && <p className="text-sm text-red-700">{l.suspensionReason}</p>}
                  {l.rejectionReason && <p className="text-xs text-red-700">{t("adm.l.rejReason", { reason: l.rejectionReason })}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {l.availabilityStatus !== "archived" && <AdminAction url={`/api/admin/listings/${l.id}`} body={{ action: "remove", expectedUpdatedAt: l.updatedAt.toISOString() }} label={locale === "ru" ? "Удалить с сайта" : "Saytdan o‘chirish"} tone="danger" askReason={locale === "ru" ? "Причина удаления (будет отправлена владельцу)" : "O‘chirish sababi (e’lon egasiga yuboriladi)"} />}
                  {l.isSuspended && <AdminAction url={`/api/admin/listings/${l.id}`} body={{ action: "unhide" }} label={locale === "ru" ? "Снять блокировку" : "Blokni olib tashlash"} />}
                  {l.moderationStatus === "pending" && <><AdminAction url={`/api/admin/listings/${l.id}`} body={{ action: "approve", expectedUpdatedAt: l.updatedAt.toISOString() }} label={t("adm.approve")} tone="primary" /><AdminAction url={`/api/admin/listings/${l.id}`} body={{ action: "reject" }} label={t("adm.reject")} tone="danger" askReason={t("adm.askReject")} /></>}
                  {!l.isSuspended && l.moderationStatus === "approved" && ["available", "reserved"].includes(l.availabilityStatus) && <AdminAction url={`/api/admin/listings/${l.id}`} body={{ action: "hide" }} label={t("adm.hide")} tone="danger" askReason={t("adm.askHide")} />}
                </div>
              </div>
              <details className="mt-2 text-sm"><summary className="cursor-pointer text-brand">{t("adm.details")}</summary>
                <p className="mt-2 whitespace-pre-line">{l.description}</p>
                <p className="mt-1 text-slate-600">{t("adm.l.addr", { addr: l.address ?? "—", area: l.areaM2 ?? "—", phone: l.contactPhone ?? "—" })}{l.telegramUsername ? ` · @${l.telegramUsername}` : ""}</p>
                <div className="mt-2 flex flex-wrap gap-2">{my.map((i) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={i.id} src={mediaUrl(i.thumbKey ?? i.storageKey) ?? undefined} alt="" loading="lazy" className="h-20 w-28 rounded object-cover" />)}</div>
                {l.moderationStatus === "approved" && <p className="mt-2"><Link className="underline" href={`/joylar/${l.id}-${l.slug}`}>{t("adm.l.public")}</Link></p>}
              </details>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex gap-3 text-sm">{page > 1 && <Link href={q(page - 1)} className="underline">{t("adm.prev")}</Link>}{more && <Link href={q(page + 1)} className="underline">{t("adm.next")}</Link>}</div>
    </div>
  );
}
