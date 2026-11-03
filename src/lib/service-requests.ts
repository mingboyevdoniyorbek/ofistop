import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { HttpError, isUuid } from "./guard";
import { normalizePhoneUz } from "./text";
import { normalizeTelegram, CATEGORIES } from "./listing-input";
import { writeAudit } from "./staff";
import { alertAdmins } from "./admin-alert";

/** «Joyingizni biz ijaraga beramiz» arizasi: kirmasdan ham yuboriladi (Instagram reklamasidan kelganlar uchun oson). */
export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30),
  telegramUsername: z.string().trim().max(40).optional().default(""),
  category: z.enum(CATEGORIES).optional().or(z.literal("")).default(""),
  regionId: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
  districtId: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
  address: z.string().trim().max(300).optional().default(""),
  areaM2: z.string().trim().max(20).optional().default(""),
  desiredPrice: z.string().trim().max(60).optional().default(""),
  comment: z.string().trim().max(1000).optional().default(""),
  website: z.string().max(0).optional().default(""), // honeypot: odam ko'rmaydi, bot to'ldiradi
});

export async function createServiceRequest(userId: string | null, raw: unknown) {
  const b = serviceSchema.safeParse(raw);
  if (!b.success) {
    const errors: Record<string, string> = {};
    for (const i of b.error.issues) errors[String(i.path[0])] ??= "Maydonni to‘g‘ri to‘ldiring";
    throw new HttpError(422, "Maydonlarda xato bor", { errors });
  }
  const f = b.data;
  const phone = normalizePhoneUz(f.phone);
  if (!phone) throw new HttpError(422, "Maydonlarda xato bor", { errors: { phone: "Telefon +998 XX XXX XX XX formatida bo'lsin" } });
  const tg = f.telegramUsername ? normalizeTelegram(f.telegramUsername) : null;
  if (f.telegramUsername && !tg) throw new HttpError(422, "Maydonlarda xato bor", { errors: { telegramUsername: "Telegram nomi noto'g'ri" } });
  const R = s.serviceRequests;
  const [row] = await db().insert(R).values({
    userId, name: f.name, phone, telegramUsername: tg, category: f.category || null, regionId: f.regionId ?? null, districtId: f.districtId ?? null,
    address: f.address, areaM2: f.areaM2 || null, desiredPrice: f.desiredPrice || null, comment: f.comment || null,
  }).returning({ id: R.id });
  await writeAudit({ actorId: userId, action: "service_request.create", entityType: "service_request", entityId: row.id, meta: { name: f.name } });
  await alertAdmins(["🤝 Yangi xizmat arizasi: «Joyimni ijaraga bering»", `👤 ${f.name} · ${phone}${tg ? ` · @${tg}` : ""}`,
    [f.address, f.areaM2 ? `${f.areaM2} m²` : "", f.desiredPrice].filter(Boolean).join(" · ")].filter(Boolean).join("\n"), "/admin/xizmat");
  return row.id;
}

export async function updateServiceRequest(id: string, actor: { id: string }, status: "new" | "in_progress" | "done" | "rejected", note?: string) {
  if (!isUuid(id)) throw new HttpError(404, "Ariza topilmadi");
  const R = s.serviceRequests;
  const [row] = await db().update(R).set({ status, ...(note !== undefined ? { adminNote: note.slice(0, 1000) || null } : {}), updatedBy: actor.id, updatedAt: new Date() })
    .where(eq(R.id, id)).returning({ id: R.id });
  if (!row) throw new HttpError(404, "Ariza topilmadi");
  await writeAudit({ actorId: actor.id, action: `service_request.${status}`, entityType: "service_request", entityId: id, meta: note ? { note } : null });
}
