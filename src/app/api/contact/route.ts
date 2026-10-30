import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { hit } from "@/lib/ratelimit";
import { publicCond } from "@/lib/search";
import { getT } from "@/lib/i18n";
import { clientIp } from "@/lib/client-ip";

export async function POST(req: Request) {
  const { t } = await getT();
  const b = z.object({ listingId: z.string().uuid(), kind: z.enum(["phone_reveal", "telegram_click", "call_click"]) }).safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: t("api.badRequest") }, { status: 400 });
  const ip = clientIp(req);
  if (!(await hit(`contact:${ip}`, 60, 3600))) return NextResponse.json({ error: t("api.tooMany") }, { status: 429 });

  const [l] = await db().select({ phone: s.listings.contactPhone, tg: s.listings.telegramUsername })
    .from(s.listings).where(and(eq(s.listings.id, b.data.listingId), publicCond())).limit(1);
  if (!l) return NextResponse.json({ error: t("api.listingGone") }, { status: 404 });

  // Xom IP saqlanmaydi, faqat hash. Bir kishi/kun/tur — bitta hisob.
  const visitorHash = createHash("sha256").update(`${process.env.SESSION_SECRET}|${ip}|${req.headers.get("user-agent") ?? ""}`).digest("hex").slice(0, 32);
  await db().insert(s.contactEvents).values({ listingId: b.data.listingId, kind: b.data.kind, visitorHash }).onConflictDoNothing();
  return NextResponse.json({ phone: l.phone, telegram: l.tg });
}
