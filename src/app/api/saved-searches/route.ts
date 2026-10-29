import { NextResponse } from "next/server";
import { and, count, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, requireUser, HttpError, isUuid } from "@/lib/guard";
import { canonicalSearch, filtersFromQuery } from "@/lib/saved-searches";
export const POST = handle(async req => {
  const user = await requireUser(req), body = await req.json().catch(() => null);
  if (typeof body?.name !== "string" || !body.name.trim() || body.name.length > 80 || typeof body.query !== "string" || body.query.length > 4000) throw new HttpError(400, "Qidiruv ma’lumotlarini tekshiring");
  const query = canonicalSearch(body.query);
  if (filtersFromQuery(query).errors?.length) throw new HttpError(400, "Qidiruv ma’lumotlarini tekshiring");
  await db().transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`saved-search:${user.id}`}))`);
    const [existing] = await tx.select().from(s.savedSearches).where(and(eq(s.savedSearches.userId, user.id), eq(s.savedSearches.query, query)));
    if (existing) return;
    const [{ n }] = await tx.select({ n: count() }).from(s.savedSearches).where(eq(s.savedSearches.userId, user.id));
    if (n >= 20) throw new HttpError(400, "20 tagacha qidiruv saqlash mumkin");
    await tx.insert(s.savedSearches).values({ userId: user.id, name: body.name.trim(), query });
  });
  return NextResponse.json({ ok: true });
});
export const DELETE = handle(async req => {
  const user = await requireUser(req), id = new URL(req.url).searchParams.get("id") ?? "";
  if (!isUuid(id)) throw new HttpError(400, "Qidiruv ma’lumotlarini tekshiring");
  await db().delete(s.savedSearches).where(and(eq(s.savedSearches.id, id), eq(s.savedSearches.userId, user.id)));
  return NextResponse.json({ ok: true });
});
