import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, requireUser, loadEditable, listingAmenities, HttpError } from "@/lib/guard";
import { submitErrors, toForm } from "@/lib/listing-input";
import { moderationTransition } from "@/lib/status";
import { recordModeration } from "@/lib/moderation";
import { slugify } from "@/lib/text";
import { guestAccessEnabled, isGuestPhone } from "@/lib/launch-mode";

export const POST = handle(async (req, ctx) => {
  const user = await requireUser(req);
  if (isGuestPhone(user.phone) && !guestAccessEnabled()) throw new HttpError(401, "E’lon berish uchun Google, email yoki Telegram orqali kiring");
  return db().transaction(async (locked) => {
  const l = await loadEditable((await ctx.params).id, user, locked);
  if (l.isSuspended) throw new HttpError(403, "E’lon moderator tomonidan bloklangan. Administratorga murojaat qiling.");
  if (l.availabilityStatus === "archived") throw new HttpError(409, "Arxivlangan e'lonni yuborib bo'lmaydi");
  const t = moderationTransition("submit", l.moderationStatus, "owner");
  if (!t.ok) throw new HttpError(409, t.error);
  const d = locked;
  const [{ n }] = await d.select({ n: count() }).from(s.listingImages).where(eq(s.listingImages.listingId, l.id));
  const errors = submitErrors(toForm(l, await listingAmenities(l.id, locked)), n);
  if (Object.keys(errors).length) throw new HttpError(422, "E'lonni yuborish uchun maydonlarni to'ldiring", { errors });
  const to = t.to;
  const now = new Date();
  await d.transaction(async (tx) => {
    await tx.update(s.listings).set({ moderationStatus: to, rejectionReason: null, slug: `${slugify(l.title)}-${l.id.slice(0, 6)}`, updatedAt: now }).where(eq(s.listings.id, l.id));
    await recordModeration(tx, { listingId: l.id, actorId: user.id, from: l.moderationStatus, to });
  });
  return NextResponse.json({ ok: true, moderationStatus: to });
  });
});
