import { desc, eq, sql } from "drizzle-orm";
import { db, schema as s, queryClient } from "@/db/client";

/** Admin bosh sahifasi (dashboard) uchun barcha ko'rsatkichlar bitta joyda. */
export async function adminDashboard(locale: "uz" | "ru") {
  const { rows: [k] } = await queryClient().query(`SELECT
    (SELECT count(*) FROM listings WHERE moderation_status='approved' AND availability_status='available' AND NOT is_suspended AND expires_at > now())::int AS active,
    (SELECT count(*) FROM listings WHERE moderation_status='pending')::int AS pending,
    (SELECT count(*) FROM listings WHERE moderation_status IN ('draft','rejected'))::int AS drafts,
    (SELECT count(*) FROM listings WHERE moderation_status='approved' AND NOT (availability_status='available' AND NOT is_suspended AND expires_at > now()))::int AS inactive,
    (SELECT count(*) FROM listings WHERE created_at > now() - interval '1 day')::int AS new_today,
    (SELECT count(*) FROM users WHERE NOT is_demo)::int AS users,
    (SELECT count(*) FROM users WHERE NOT is_demo AND created_at > now() - interval '30 days')::int AS users_30,
    (SELECT count(*) FROM business_centers)::int AS centers,
    (SELECT count(*) FROM center_applications WHERE status='pending')::int AS apps,
    (SELECT count(*) FROM reports WHERE status='open')::int AS reports,
    (SELECT count(*) FROM business_centers WHERE pending_changes IS NOT NULL OR EXISTS (SELECT 1 FROM business_center_images i WHERE i.center_id = business_centers.id AND i.pending))::int AS center_edits,
    (SELECT count(*) FROM contact_events WHERE kind IN ('phone_reveal','call_click') AND day > current_date - 30)::int AS calls_30,
    (SELECT count(*) FROM contact_events WHERE kind='telegram_click' AND day > current_date - 30)::int AS tg_30,
    (SELECT count(*) FROM favorites WHERE created_at > now() - interval '30 days')::int AS favs_30`);
  // So'nggi 30 kun: kunlik e'lon ko'rishlari va yangi e'lonlar (bo'sh kunlar 0 bilan).
  const { rows: days } = await queryClient().query(`SELECT d::date AS day,
      coalesce((SELECT sum(n) FROM view_days v WHERE v.kind='listing' AND v.day = d::date), 0)::int AS views,
      (SELECT count(*) FROM listings l WHERE l.created_at::date = d::date)::int AS created
    FROM generate_series(current_date - 29, current_date, interval '1 day') d ORDER BY d`);
  const recent = await db().select({ a: s.auditLogs, phone: s.users.phone }).from(s.auditLogs).leftJoin(s.users, eq(s.users.id, s.auditLogs.actorId))
    .orderBy(desc(s.auditLogs.createdAt)).limit(7);
  const L = s.listings;
  const pendingRows = await db().select({ id: L.id, title: L.title, updatedAt: L.updatedAt, amount: L.priceAmountMinor, currency: L.currency, period: L.pricePeriod, basis: L.priceBasis, negotiable: L.priceNegotiable, area: L.areaM2,
    region: locale === "ru" ? s.regions.nameRu : s.regions.nameUz, district: locale === "ru" ? s.districts.nameRu : s.districts.nameUz })
    .from(L).innerJoin(s.regions, eq(s.regions.id, L.regionId)).leftJoin(s.districts, eq(s.districts.id, L.districtId))
    .where(eq(L.moderationStatus, "pending")).orderBy(sql`${L.updatedAt} ASC`).limit(6);
  return {
    k: k as Record<string, number>,
    days: (days as { day: Date | string; views: number; created: number }[]).map((d) => ({ day: new Date(d.day).toISOString().slice(0, 10), views: d.views, created: d.created })),
    recent, pendingRows,
  };
}
