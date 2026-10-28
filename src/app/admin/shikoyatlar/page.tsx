import Link from "next/link";
import { desc, eq, ne } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { fmtDate, labels } from "@/lib/format";
import { getT } from "@/lib/i18n";
import type { MsgKey } from "@/messages/uz";
import AdminAction from "@/components/AdminAction";
import { requireStaffPage } from "@/lib/staff";

export default async function Reports({ searchParams }: { searchParams: Promise<{ holat?: string }> }) {
  await requireStaffPage();
  const { locale, t } = await getT(); const lb = labels(locale);
  const holat = (await searchParams).holat === "closed" ? "closed" : "open";
  const R = s.reports;
  const data = await db().select({ r: R, title: s.listings.title, lid: s.listings.id, slug: s.listings.slug, mod: s.listings.moderationStatus, av: s.listings.availabilityStatus, who: s.profiles.displayName })
    .from(R).innerJoin(s.listings, eq(s.listings.id, R.listingId)).leftJoin(s.profiles, eq(s.profiles.userId, R.reporterId))
    .where(holat === "open" ? eq(R.status, "open") : ne(R.status, "open")).orderBy(desc(R.createdAt)).limit(100);
  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">{t("adm.nav.reports")}</h1>
      <div className="mb-4 flex gap-2">{([["open", t("adm.r.open")], ["closed", t("adm.r.closed")]] as const).map(([k, l]) => <Link key={k} href={`/admin/shikoyatlar?holat=${k}`} aria-current={holat === k} className={`rounded-full border px-3 py-1 text-sm ${holat === k ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{l}</Link>)}</div>
      {data.length === 0 && <p className="rounded border border-dashed border-slate-300 p-6 text-center text-slate-500">{t("adm.r.empty")}</p>}
      <ul className="space-y-3">{data.map(({ r, title, lid, slug, mod, av, who }) => (
        <li key={r.id} className="rounded border border-slate-200 p-3 text-sm">
          <p className="font-medium">{t(`adm.r.${r.reason}` as MsgKey)} — <Link className="underline" href={`/joylar/${lid}-${slug}`}>{title}</Link></p>
          <p className="text-slate-600">{who ?? t("adm.r.who")} · {fmtDate(r.createdAt, locale)} · {t("adm.r.state", { state: `${t(`adm.mod.${mod}` as MsgKey)} / ${lb.avail[av]}` })}</p>
          {r.comment && <p className="mt-1 whitespace-pre-line">{r.comment}</p>}
          {r.status === "open" ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <AdminAction url={`/api/admin/reports/${r.id}`} body={{ action: "resolve" }} label={t("adm.r.resolve")} tone="primary" />
              <AdminAction url={`/api/admin/reports/${r.id}`} body={{ action: "dismiss" }} label={t("adm.r.dismiss")} />
              {mod === "approved" && ["available", "reserved"].includes(av) && <AdminAction url={`/api/admin/listings/${lid}`} body={{ action: "hide" }} label={t("adm.r.hideListing")} tone="danger" askReason={t("adm.askHide")} />}
            </div>) : <p className="mt-1 text-slate-500">{t("adm.r.closedAt", { how: t(r.status === "resolved" ? "adm.r.resolved" : "adm.r.dismissed"), date: fmtDate(r.resolvedAt, locale) })}</p>}
        </li>))}
      </ul>
    </div>
  );
}
