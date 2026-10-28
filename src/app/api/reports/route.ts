import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, HttpError, requireUser, isUuid } from "@/lib/guard";
import { hit } from "@/lib/ratelimit";
import { publicCond } from "@/lib/search";
import { and } from "drizzle-orm";
import { isPubliclyVisible } from "@/lib/status";
import { getT } from "@/lib/i18n";

const body = z.object({
  listingId: z.string(),
  reason: z.enum(["already_rented", "wrong_price", "false_info", "duplicate", "fraud_suspected", "other"]),
  comment: z.string().trim().max(1000).optional(),
});
export const POST = handle(async (req) => {
  const { t } = await getT();
  const u = await requireUser(req);
  const b = body.safeParse(await req.json().catch(() => null));
  if (!b.success || !isUuid(b.data.listingId)) throw new HttpError(400, t("api.rep.invalid"));
  if (b.data.reason === "other" && !b.data.comment) throw new HttpError(422, t("api.rep.otherNeedsComment"));
  if (!(await hit(`report:${u.id}`, 10, 3600))) throw new HttpError(429, t("api.rep.tooMany"));
  const [l] = await db().select().from(s.listings).where(and(eq(s.listings.id, b.data.listingId),publicCond())).limit(1);
  // Faqat ommaga ko'rinadigan e'longa shikoyat qilinadi; boshqa holatda mavjudligi oshkor bo'lmaydi.
  if (!l || !isPubliclyVisible(l)) throw new HttpError(404, t("api.rep.notFound"));
  if (l.ownerId === u.id) throw new HttpError(409, t("api.rep.own"));
  const ins = await db().insert(s.reports).values({ listingId: l.id, reporterId: u.id, reason: b.data.reason, comment: b.data.comment || null })
    .onConflictDoNothing().returning({ id: s.reports.id });
  if (!ins.length) throw new HttpError(409, t("api.rep.dup"));
  return NextResponse.json({ ok: true }, { status: 201 });
});
