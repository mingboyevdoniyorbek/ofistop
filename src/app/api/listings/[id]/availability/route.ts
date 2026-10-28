import { validDate } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db/client";
import { handle, requireUser, loadEditable, ttlDays, HttpError } from "@/lib/guard";
import { canChangeAvailability, effectiveAvailability } from "@/lib/status";

const body = z.object({ action: z.enum(["confirm", "set"]), to: z.enum(["available", "reserved", "rented", "paused", "archived"]).optional(), availableFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional() });

export const POST = handle(async (req, ctx) => {
  const user = await requireUser(req);
  return db().transaction(async (locked) => {
  const l = await loadEditable((await ctx.params).id, user, locked);
  const b = body.safeParse(await req.json().catch(() => null));
  if (!b.success || (b.data.action === "set" && !b.data.to)) throw new HttpError(400, "Noto'g'ri so'rov");
  if (b.data.availableFrom && !validDate(b.data.availableFrom)) throw new HttpError(422, "Sana noto‘g‘ri");
  const from = effectiveAvailability(l);
  const to = b.data.action === "confirm" ? "available" : b.data.to!;
  if (l.isSuspended && to !== "archived") throw new HttpError(403, "E’lon moderator tomonidan bloklangan. Administratorga murojaat qiling.");
  if (to !== "archived" && l.moderationStatus !== "approved") throw new HttpError(409, "Mavjudlik faqat tasdiqlangan e'londa o'zgartiriladi");
  if (b.data.action === "confirm" ? !(from === "available" || from === "expired") : !(canChangeAvailability(from, to))) throw new HttpError(409, "Bu holatdan bunday o'zgartirish mumkin emas");
  const now = new Date();
  const set: Partial<typeof s.listings.$inferInsert> = { availabilityStatus: to, updatedAt: now };
  if (to === "available") { set.availabilityConfirmedAt = now; set.expiresAt = new Date(now.getTime() + (await ttlDays(locked)) * 864e5); }
  if (b.data.availableFrom !== undefined && (to === "available" || to === "reserved")) set.availableFrom = b.data.availableFrom;
  try { await locked.update(s.listings).set(set).where(eq(s.listings.id, l.id)); }
  catch (e: any) { if ((e?.code ?? e?.cause?.code) === "23505") throw new HttpError(409, "Bu xona uchun boshqa faol e’lon mavjud"); throw e; } // "ijaraga berildi" darhol kuchga kiradi: qidiruv availability_status'ni tekshiradi
  return NextResponse.json({ ok: true, availability: to });
  });
});
