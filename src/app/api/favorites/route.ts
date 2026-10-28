import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db/client";
import { handle, requireUser, HttpError } from "@/lib/guard";
import { publicCond } from "@/lib/search";
import { hit } from "@/lib/ratelimit";

const parse = async (req: Request) => { const b = z.object({ listingId: z.string().uuid() }).safeParse(await req.json().catch(() => null)); if (!b.success) throw new HttpError(400, "Noto'g'ri so'rov"); return b.data.listingId; };

export const POST = handle(async (req) => {
  const user = await requireUser(req);
  if (!(await hit(`fav:${user.id}`, 200, 3600))) throw new HttpError(429, "Juda ko'p so'rov");
  const listingId = await parse(req);
  const [l] = await db().select({ m: s.listings.moderationStatus }).from(s.listings).where(and(eq(s.listings.id, listingId),publicCond())).limit(1);
  if (!l || l.m !== "approved") throw new HttpError(404, "E'lon topilmadi");
  await db().insert(s.favorites).values({ userId: user.id, listingId }).onConflictDoNothing();
  return NextResponse.json({ ok: true, favorite: true });
});
export const DELETE = handle(async (req) => {
  const user = await requireUser(req);
  const listingId = await parse(req);
  await db().delete(s.favorites).where(and(eq(s.favorites.userId, user.id), eq(s.favorites.listingId, listingId)));
  return NextResponse.json({ ok: true, favorite: false });
});
