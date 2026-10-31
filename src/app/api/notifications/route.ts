import { NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, requireUser, HttpError } from "@/lib/guard";
import { getLocale } from "@/lib/i18n";
import { trServer } from "@/lib/server-i18n";

export const POST = handle(async (req) => {
  const u = await requireUser(req);
  await db().update(s.notifications).set({ readAt: new Date() }).where(and(eq(s.notifications.userId, u.id), isNull(s.notifications.readAt)));
  return NextResponse.json({ ok: true });
});

/** Qo'ng'iroqcha uchun: o'qilmaganlar soni va oxirgi 6 ta bildirishnoma (tanlangan tilda). */
export const GET = handle(async (req) => {
  const u = await requireUser(req);
  const N = s.notifications, locale = await getLocale();
  const [[{ unread }], items] = await Promise.all([
    db().select({ unread: sql<number>`count(*)::int` }).from(N).where(and(eq(N.userId, u.id), isNull(N.readAt))),
    db().select().from(N).where(eq(N.userId, u.id)).orderBy(desc(N.createdAt)).limit(6),
  ]);
  return NextResponse.json({ unread, items: items.map((n) => ({ id: n.id, title: trServer(n.title, locale), body: n.body ? trServer(n.body, locale) : null, href: n.href, at: n.createdAt, read: !!n.readAt })) },
    { headers: { "Cache-Control": "no-store" } });
});

/** Telegram'ga yuborishni yoqish/o'chirish. */
export const PATCH = handle(async (req) => {
  const u = await requireUser(req);
  const b = await req.json().catch(() => null) as { telegram?: unknown } | null;
  if (typeof b?.telegram !== "boolean") throw new HttpError(400, "Noto'g'ri so'rov");
  await db().update(s.users).set({ telegramNotify: b.telegram }).where(eq(s.users.id, u.id));
  return NextResponse.json({ ok: true, telegram: b.telegram });
});
