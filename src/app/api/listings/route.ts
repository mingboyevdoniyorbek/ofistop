import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, requireUser, HttpError } from "@/lib/guard";
import { hit } from "@/lib/ratelimit";
import { getOrCreateGuest } from "@/lib/guest";
import { isGuestPhone } from "@/lib/launch-mode";

// Bo'sh qoralama yaratadi. GET emas, POST: prefetch/crawler bo'sh qoralama yaratmasin.
export const POST = handle(async (req) => {
  const user = await getOrCreateGuest(req);
  if (!(await hit(`draft:${user.id}`, 20, 3600))) throw new HttpError(429, "Juda ko'p yangi qoralama. Keyinroq urinib ko'ring.");
  const d = db();
  const [region] = await d.select().from(s.regions).orderBy(asc(s.regions.id)).limit(1);
  if (!region) throw new HttpError(503, "Hududlar hali sozlanmagan. Administratorga murojaat qiling.");
  const [profile] = await d.select().from(s.profiles).where(eq(s.profiles.userId, user.id)).limit(1);
  const [l] = await d.insert(s.listings).values({
    slug: `joy-${randomBytes(4).toString("hex")}`, ownerId: user.id, posterType: profile?.posterType ?? "owner", category: "office",
    title: "", regionId: region.id, contactPhone: profile?.contactPhone ?? (isGuestPhone(user.phone) ? null : user.phone), telegramUsername: profile?.telegramUsername ?? null,
  }).returning({ id: s.listings.id });
  return NextResponse.json({ id: l.id }, { status: 201 });
});
