import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, HttpError, isUuid } from "@/lib/guard";
import { requireStaff, writeAudit } from "@/lib/staff";

export const POST = handle(async (req, ctx) => {
  const actor = await requireStaff(req);
  const id = (await ctx.params).id;
  const b = z.object({ action: z.enum(["resolve", "dismiss"]) }).safeParse(await req.json().catch(() => null));
  if (!isUuid(id) || !b.success) throw new HttpError(400, "So'rov noto'g'ri");
  const status = b.data.action === "resolve" ? "resolved" : "dismissed";
  const done = await db().transaction(async (tx) => {
    const u = await tx.update(s.reports).set({ status, resolvedBy: actor.id, resolvedAt: new Date() })
      .where(and(eq(s.reports.id, id), eq(s.reports.status, "open"))).returning({ id: s.reports.id });
    if (u.length) await writeAudit({ actorId: actor.id, action: `report.${status}`, entityType: "report", entityId: id }, tx);
    return u.length;
  });
  if (!done) throw new HttpError(409, "Shikoyat topilmadi yoki allaqachon yopilgan");
  return NextResponse.json({ ok: true });
});
