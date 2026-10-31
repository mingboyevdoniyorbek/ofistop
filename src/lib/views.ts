import { createHash } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { hit } from "./ratelimit";
import { publicCond } from "./search";
import { getCurrentUser } from "./auth";
import { clientIp } from "./client-ip";
import { isUuid } from "./guard";

/**
 * Ko'rishni hisoblash: bir tashrifchi (IP+brauzer hash'i) sutkada bir marta, botlar va egasining/vakilning o'zi hisoblanmaydi.
 * Jami hisob (view_count) va kunlik jadval (view_days — oylik hisobot uchun) yangilanadi.
 */
export async function recordView(req: Request, kind: "listing" | "center", id: string) {
  if (!isUuid(id)) return { ok: false };
  const ip = clientIp(req), ua = req.headers.get("user-agent") ?? "";
  if (/bot|crawl|spider|preview/i.test(ua)) return { ok: true, counted: false };
  if (!(await hit(`viewip:${ip}`, 300, 3600))) return { ok: true, counted: false };
  const visitor = createHash("sha256").update(`${process.env.SESSION_SECRET}|${ip}|${ua}`).digest("hex").slice(0, 24);
  if (!(await hit(`view:${id}:${visitor}`, 1, 86400))) return { ok: true, counted: false };
  const user = await getCurrentUser().catch(() => null);
  let updated: { id: string }[];
  if (kind === "listing") {
    const L = s.listings;
    updated = await db().update(L).set({ viewCount: sql`${L.viewCount} + 1` })
      .where(and(eq(L.id, id), publicCond(), user ? sql`${L.ownerId} <> ${user.id}` : undefined)).returning({ id: L.id });
  } else {
    const C = s.businessCenters;
    updated = await db().update(C).set({ viewCount: sql`${C.viewCount} + 1` })
      .where(and(eq(C.id, id), user ? sql`NOT EXISTS (SELECT 1 FROM business_center_memberships m WHERE m.center_id = ${C.id} AND m.user_id = ${user.id})` : undefined)).returning({ id: C.id });
  }
  if (!updated.length) return { ok: true, counted: false };
  await db().insert(s.viewDays).values({ kind, entityId: id, n: 1 })
    .onConflictDoUpdate({ target: [s.viewDays.kind, s.viewDays.entityId, s.viewDays.day], set: { n: sql`${s.viewDays.n} + 1` } });
  return { ok: true, counted: true };
}
