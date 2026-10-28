import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema as s } from "@/db/client";
import { handle, HttpError } from "@/lib/guard";
import { requireStaff, writeAudit } from "@/lib/staff";

export const POST = handle(async (req) => {
  const actor = await requireStaff(req, true);
  const b = z.object({ listing_ttl_days: z.coerce.number().int().min(1).max(365) }).safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(422, "E'lon muddati 1 dan 365 kungacha butun son bo'lsin");
  await db().insert(s.settings).values({ key: "listing_ttl_days", value: String(b.data.listing_ttl_days) }).onConflictDoUpdate({ target: s.settings.key, set: { value: String(b.data.listing_ttl_days) } });
  await writeAudit({ actorId: actor.id, action: "settings.listing_ttl_days", entityType: "setting", entityId: "listing_ttl_days", meta: { value: b.data.listing_ttl_days } });
  return NextResponse.json({ ok: true });
});
