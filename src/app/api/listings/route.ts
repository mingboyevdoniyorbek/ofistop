import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, requireUser, HttpError, managedCenterIds, isUuid } from "@/lib/guard";
import { hit } from "@/lib/ratelimit";
import { getOrCreateGuest } from "@/lib/guest";
import { isGuestPhone } from "@/lib/launch-mode";

// Bo'sh qoralama yaratadi. GET emas, POST: prefetch/crawler bo'sh qoralama yaratmasin.
export const POST = handle(async (req) => {
  const user = await getOrCreateGuest(req);
  if (!(await hit(`draft:${user.id}`, 20, 3600))) throw new HttpError(429, "Juda ko'p yangi qoralama. Keyinroq urinib ko'ring.");
  const d = db();
  const body = await req.json().catch(() => ({}));
  let center: typeof s.businessCenters.$inferSelect | undefined;
  if (body?.centerId) {
    if (typeof body.centerId !== "string" || !isUuid(body.centerId) || !(await managedCenterIds(user.id)).includes(body.centerId)) throw new HttpError(403, "Ruxsat yo'q");
    [center] = await d.select().from(s.businessCenters).where(eq(s.businessCenters.id, body.centerId));
    if (!center) throw new HttpError(404, "Markaz topilmadi");
  }
  const [region] = await d.select().from(s.regions).orderBy(asc(s.regions.id)).limit(1);
  if (!region) throw new HttpError(503, "Hududlar hali sozlanmagan. Administratorga murojaat qiling.");
  const [profile] = await d.select().from(s.profiles).where(eq(s.profiles.userId, user.id)).limit(1);
  const [l] = await d.insert(s.listings).values({
    slug: `joy-${randomBytes(4).toString("hex")}`, ownerId: user.id, posterType: profile?.posterType ?? "owner", category: "office",
    title: "", regionId: region.id, contactPhone: profile?.contactPhone ?? (user.phone.startsWith("+") ? user.phone : null), telegramUsername: profile?.telegramUsername ?? null,
    ...(center ? { centerId: center.id, category: "bc_room" as const, posterType: "business_center" as const, regionId: center.regionId, districtId: center.districtId, address: center.address, lat: center.lat, lng: center.lng, exactLocationPublic: true, contactPhone: center.contactPhone ?? profile?.contactPhone ?? null, telegramUsername: center.telegramUsername ?? profile?.telegramUsername ?? null } : {}),
  }).returning({ id: s.listings.id });
  return NextResponse.json({ id: l.id }, { status: 201 });
});
