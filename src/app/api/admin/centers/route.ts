import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, HttpError } from "@/lib/guard";
import { requireStaff, writeAudit } from "@/lib/staff";
import { normalizePhoneUz, slugify } from "@/lib/text";
import { normalizeTelegram } from "@/lib/listing-input";

const body = z.object({
  name: z.string().trim().min(3).max(120), description: z.string().trim().max(3000).optional(),
  regionId: z.coerce.number().int(), districtId: z.preprocess(v => v === "" ? undefined : v, z.coerce.number().int().positive().optional()),
  address: z.string().trim().min(5).max(300), contactPhone: z.string().max(30).optional(), telegramUsername: z.string().max(40).optional(),
});
export const POST = handle(async (req) => {
  const actor = await requireStaff(req, true);
  const b = body.safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(422, "Maydonlarni to'g'ri to'ldiring (nom, hudud, manzil majburiy)");
  const d = db();
  const [reg] = await d.select().from(s.regions).where(eq(s.regions.id, b.data.regionId)).limit(1);
  if (!reg) throw new HttpError(422, "Hudud topilmadi");
  if (b.data.districtId) {
    const [di] = await d.select().from(s.districts).where(eq(s.districts.id, b.data.districtId)).limit(1);
    if (!di || di.regionId !== reg.id) throw new HttpError(422, "Tuman tanlangan hududga tegishli emas");
  }
  const phone = b.data.contactPhone?.trim() ? normalizePhoneUz(b.data.contactPhone) : null;
  if (b.data.contactPhone?.trim() && !phone) throw new HttpError(422, "Telefon +998 XX XXX XX XX formatida bo'lsin");
  const tg = b.data.telegramUsername?.trim() ? normalizeTelegram(b.data.telegramUsername) : null;
  if (b.data.telegramUsername?.trim() && !tg) throw new HttpError(422, "Telegram nomi noto'g'ri");
  let slug = slugify(b.data.name);
  if ((await d.select({ id: s.businessCenters.id }).from(s.businessCenters).where(eq(s.businessCenters.slug, slug)).limit(1)).length) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const [c] = await d.insert(s.businessCenters).values({ slug, name: b.data.name, description: b.data.description || null, regionId: reg.id, districtId: b.data.districtId ?? null, address: b.data.address, contactPhone: phone, telegramUsername: tg }).returning({ id: s.businessCenters.id });
  await writeAudit({ actorId: actor.id, action: "center.create", entityType: "business_center", entityId: c.id, meta: { name: b.data.name } });
  return NextResponse.json({ ok: true, id: c.id }, { status: 201 });
});
