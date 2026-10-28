import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, requireUser } from "@/lib/guard";

export const POST = handle(async (req) => {
  const u = await requireUser(req);
  await db().update(s.notifications).set({ readAt: new Date() }).where(and(eq(s.notifications.userId, u.id), isNull(s.notifications.readAt)));
  return NextResponse.json({ ok: true });
});
