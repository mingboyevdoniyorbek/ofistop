import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, HttpError, isUuid, ttlDays } from "@/lib/guard";
import { requireStaff, writeAudit, notify } from "@/lib/staff";
import { moderate } from "@/lib/moderation";
import { canChangeAvailability } from "@/lib/status";

const body = z.object({ action: z.enum(["approve", "reject", "hide", "unhide", "remove", "feature", "unfeature"]), days: z.number().int().min(1).max(365).optional(), reason: z.string().max(1000).optional(), expectedUpdatedAt: z.string().optional() });

export const POST = handle(async (req, ctx) => {
  const actor = await requireStaff(req);
  const id = (await ctx.params).id;
  if (!isUuid(id)) throw new HttpError(404, "E'lon topilmadi");
  const b = body.safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(400, "So'rov noto'g'ri");
  const d = db();
  const [l] = await d.select().from(s.listings).where(eq(s.listings.id, id)).limit(1);
  if (!l) throw new HttpError(404, "E'lon topilmadi");

  if (b.data.action === "remove") {
    const reason = b.data.reason?.trim();
    if (!reason) throw new HttpError(422, "O‘chirish sababi majburiy");
    await d.transaction(async tx => {
      const [current] = await tx.select().from(s.listings).where(eq(s.listings.id, id)).for("update");
      if (!current) throw new HttpError(404, "E'lon topilmadi");
      if (b.data.expectedUpdatedAt && current.updatedAt.toISOString() !== b.data.expectedUpdatedAt) throw new HttpError(409, "E’lon o‘zgargan. Sahifani yangilab qayta tekshiring.");
      if (current.availabilityStatus === "archived" && current.isSuspended) return;
      await tx.update(s.listings).set({ availabilityStatus: "archived", isSuspended: true, suspensionReason: reason, updatedAt: new Date() }).where(eq(s.listings.id, id));
      await writeAudit({ actorId: actor.id, action: "listing.remove", entityType: "listing", entityId: id, meta: { reason } }, tx);
      await notify(current.ownerId, "E’loningiz saytdan olib tashlandi", reason, `/kabinet/elon/${id}`, tx);
    });
    return NextResponse.json({ ok: true });
  }

  // TOP (VIP): hozircha admin to'lovdan keyin qo'lda yoqadi; to'lov tizimi ulanganda shu amal avtomatik chaqiriladi.
  if (b.data.action === "feature" || b.data.action === "unfeature") {
    const on = b.data.action === "feature";
    if (on && (l.moderationStatus !== "approved" || l.isSuspended)) throw new HttpError(409, "Faqat tasdiqlangan e'lon TOP bo'ladi");
    const until = on ? new Date(Math.max(Date.now(), l.featuredUntil?.getTime() ?? 0) + (b.data.days ?? 7) * 864e5) : null;
    await d.update(s.listings).set({ featuredUntil: until }).where(eq(s.listings.id, id));
    await writeAudit({ actorId: actor.id, action: on ? "listing.feature" : "listing.unfeature", entityType: "listing", entityId: id, meta: on ? { days: b.data.days ?? 7 } : null });
    if (on) await notify(l.ownerId, "E’loningiz TOP’ga chiqarildi", `${until!.toISOString().slice(0, 10)} gacha bosh sahifada va qidiruvda birinchi ko‘rinadi.`, `/joylar/${l.id}-${l.slug}`);
    return NextResponse.json({ ok: true, featuredUntil: until });
  }

  if (b.data.action === "hide" || b.data.action === "unhide") {
    const hide = b.data.action === "hide";
    if (hide && !b.data.reason?.trim()) throw new HttpError(422, "Yashirish sababi majburiy");
    await d.transaction(async tx => {
      const [current] = await tx.select().from(s.listings).where(eq(s.listings.id, id)).for("update");
      if (!current) throw new HttpError(404, "E’lon topilmadi");
      await tx.update(s.listings).set({ isSuspended: hide, suspensionReason: hide ? b.data.reason!.trim() : null, updatedAt: new Date() }).where(eq(s.listings.id, id));
      await writeAudit({ actorId: actor.id, action: hide ? "listing.hide" : "listing.unhide", entityType: "listing", entityId: id, meta: { reason: b.data.reason } }, tx);
      await notify(current.ownerId, hide ? "E’lon moderator tomonidan bloklandi" : "E’lon bloki olib tashlandi", b.data.reason, `/kabinet/elon/${id}`, tx);
    });
    return NextResponse.json({ ok: true });
  }

  const r = await moderate(id, actor, b.data.action, b.data.reason, await ttlDays(), b.data.expectedUpdatedAt);
  if (!r.ok) throw new HttpError(r.error === "Ruxsat yo'q" ? 403 : 409, r.error);
  await notify(l.ownerId,
    b.data.action === "approve" ? "E'loningiz tasdiqlandi" : "E'loningiz rad etildi",
    b.data.action === "reject" ? b.data.reason!.trim() : null, b.data.action === "approve" ? `/joylar/${l.id}-${l.slug ?? "x"}` : `/kabinet/elon/${id}`);
  return NextResponse.json({ ok: true, to: r.to });
});
