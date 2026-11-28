import { inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { effectiveAvailability } from "./status";
import { mediaUrl } from "./storage";

type Row = typeof s.listings.$inferSelect;
export type CabState = "draft" | "pending" | "rejected" | "active" | "reserved" | "rented" | "paused" | "expired" | "archived";

/** Kabinetdagi bitta holat: moderatsiya + mavjudlik birlashtirilgan. */
export function cabState(r: Row): CabState {
  if (r.availabilityStatus === "archived") return "archived";
  if (r.moderationStatus !== "approved") return r.moderationStatus as CabState;
  return ({ available: "active", reserved: "reserved", rented: "rented", paused: "paused", expired: "expired" } as const)[effectiveAvailability(r) as "available"];
}

export const CHIP: Record<string, string> = { active: "bg-emerald-50 text-emerald-700", pending: "bg-amber-50 text-amber-800", rejected: "bg-red-50 text-red-700", draft: "bg-slate-100 text-slate-700", reserved: "bg-blue-50 text-blue-700", rented: "bg-violet-50 text-violet-700", paused: "bg-slate-100 text-slate-600", expired: "bg-orange-50 text-orange-700", archived: "bg-slate-100 text-slate-500" };

/** E'lonlar bo'yicha qo'ng'iroq / Telegram / sevimli soni (bitta so'rov har biriga). */
export async function contactStats(ids: string[]) {
  const stat = new Map<string, { phone: number; tg: number; fav: number }>();
  for (const id of ids) stat.set(id, { phone: 0, tg: 0, fav: 0 });
  if (!ids.length) return stat;
  const d = db();
  const [ev, fv] = await Promise.all([
    d.select({ id: s.contactEvents.listingId, kind: s.contactEvents.kind, n: sql<number>`count(*)::int` }).from(s.contactEvents).where(inArray(s.contactEvents.listingId, ids)).groupBy(s.contactEvents.listingId, s.contactEvents.kind),
    d.select({ id: s.favorites.listingId, n: sql<number>`count(*)::int` }).from(s.favorites).where(inArray(s.favorites.listingId, ids)).groupBy(s.favorites.listingId),
  ]);
  for (const e of ev) { const x = stat.get(e.id)!; if (e.kind === "phone_reveal") x.phone = e.n; if (e.kind === "telegram_click") x.tg = e.n; }
  for (const f of fv) stat.get(f.id)!.fav = f.n;
  return stat;
}

/** Asosiy rasm (kichik variant) URL'lari. */
export async function primaryThumbs(ids: string[], full = false) {
  const imgs = new Map<string, string | null>();
  if (!ids.length) return imgs;
  const k = full ? sql<string>`COALESCE(${s.listingImages.mediumKey}, ${s.listingImages.storageKey})` : sql<string>`COALESCE(${s.listingImages.thumbKey}, ${s.listingImages.storageKey})`;
  for (const i of await db().select({ id: s.listingImages.listingId, k }).from(s.listingImages).where(sql`${s.listingImages.isPrimary} AND ${inArray(s.listingImages.listingId, ids)}`)) imgs.set(i.id, mediaUrl(i.k as string));
  return imgs;
}
