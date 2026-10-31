import { and, eq, sql } from "drizzle-orm";
import { db, schema as s, queryClient } from "@/db/client";
import { notify } from "./staff";
import { hit } from "./ratelimit";

export type CenterPeriodStats = { centerViews: number; roomViews: number; phone: number; telegram: number; favorites: number; rooms: number };

/** Markaz bo'yicha [from, to) oraliq statistikasi (sana: YYYY-MM-DD). Markaz xonalari = shu markazga bog'langan e'lonlar. */
export async function centerPeriodStats(centerId: string, from: string, to: string): Promise<CenterPeriodStats> {
  const { rows: [r] } = await queryClient().query(
    `SELECT
       (SELECT coalesce(sum(n),0) FROM view_days WHERE kind='center' AND entity_id=$1 AND day >= $2::date AND day < $3::date)::int AS center_views,
       (SELECT coalesce(sum(v.n),0) FROM view_days v JOIN listings l ON l.id=v.entity_id WHERE v.kind='listing' AND l.center_id=$1 AND v.day >= $2::date AND v.day < $3::date)::int AS room_views,
       (SELECT count(*) FROM contact_events e JOIN listings l ON l.id=e.listing_id WHERE l.center_id=$1 AND e.kind IN ('phone_reveal','call_click') AND e.day >= $2::date AND e.day < $3::date)::int AS phone,
       (SELECT count(*) FROM contact_events e JOIN listings l ON l.id=e.listing_id WHERE l.center_id=$1 AND e.kind='telegram_click' AND e.day >= $2::date AND e.day < $3::date)::int AS telegram,
       (SELECT count(*) FROM favorites f JOIN listings l ON l.id=f.listing_id WHERE l.center_id=$1 AND f.created_at >= $2::date AND f.created_at < $3::date)::int AS favorites,
       (SELECT count(*) FROM listings l WHERE l.center_id=$1 AND l.moderation_status='approved' AND l.availability_status='available' AND NOT l.is_suspended AND l.expires_at > now())::int AS rooms`,
    [centerId, from, to]);
  return { centerViews: r.center_views, roomViews: r.room_views, phone: r.phone, telegram: r.telegram, favorites: r.favorites, rooms: r.rooms };
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
/** Oxirgi N kun (bugun bilan) oralig'i. */
export function lastDays(n: number) {
  const to = new Date(Date.now() + 864e5), from = new Date(Date.now() - (n - 1) * 864e5);
  return { from: ymd(from), to: ymd(to) };
}

/**
 * Har oyning 1-kuni (Toshkent vaqti) har bir markaz vakiliga o'tgan oy hisobotini bildirishnoma qilib yuboradi.
 * Kunlik cron'dan chaqiriladi; bir oy uchun bir martadan ortiq yuborilmaydi.
 */
export async function sendMonthlyCenterReports(now = new Date()) {
  const tashkent = new Date(now.getTime() + 5 * 3600e3); // UTC+5
  if (tashkent.getUTCDate() !== 1) return 0;
  const y = tashkent.getUTCFullYear(), m = tashkent.getUTCMonth(); // hozirgi oy (0..11)
  const prev = new Date(Date.UTC(y, m - 1, 1)), cur = new Date(Date.UTC(y, m, 1));
  const label = `${String(prev.getUTCMonth() + 1).padStart(2, "0")}.${prev.getUTCFullYear()}`; // tilga bog'liq emas: 10.2026
  const centers = await db().selectDistinct({ id: s.businessCenters.id, name: s.businessCenters.name })
    .from(s.businessCenters).innerJoin(s.businessCenterMemberships, eq(s.businessCenterMemberships.centerId, s.businessCenters.id))
    .where(eq(s.businessCenters.isDemo, false));
  let sent = 0;
  for (const c of centers) {
    if (!(await hit(`monthly-report:${c.id}:${ymd(prev).slice(0, 7)}`, 1, 40 * 86400))) continue;
    const st = await centerPeriodStats(c.id, ymd(prev), ymd(cur));
    const members = await db().select({ userId: s.businessCenterMemberships.userId }).from(s.businessCenterMemberships)
      .innerJoin(s.users, and(eq(s.users.id, s.businessCenterMemberships.userId), sql`NOT ${s.users.isBlocked}`)).where(eq(s.businessCenterMemberships.centerId, c.id));
    for (const mbr of members) {
      await notify(mbr.userId, `Oylik hisobot: ${c.name}`,
        `${label}: markaz sahifasi ${st.centerViews} marta, xonalar ${st.roomViews} marta ko‘rildi; telefon ${st.phone}, Telegram ${st.telegram}, saqlanganlar ${st.favorites}.`,
        `/kabinet/markazlar/${c.id}`);
      sent++;
    }
  }
  return sent;
}
