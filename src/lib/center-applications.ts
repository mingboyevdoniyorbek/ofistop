import { z } from "zod";
import { and, count, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { HttpError, isUuid } from "./guard";
import { normalizePhoneUz, slugify } from "./text";
import { normalizeTelegram } from "./listing-input";
import { notify, writeAudit } from "./staff";
import { alertAdmins } from "./admin-alert";

/** Bitta foydalanuvchida bir vaqtda ko'pi bilan shuncha ko'rib chiqilmagan ariza. */
export const MAX_PENDING_APPLICATIONS = 3;

const optInt = (max: number) => z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(0).max(max).optional());
export const applicationSchema = z.object({
  centerId: z.string().optional(),
  name: z.string().trim().min(3).max(120),
  regionId: z.coerce.number().int().positive(),
  districtId: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
  address: z.string().trim().min(5).max(300),
  contactName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30),
  telegramUsername: z.string().trim().max(40).optional().default(""),
  floors: optInt(200),
  freeRooms: optInt(5000),
  website: z.string().trim().max(300).optional().default(""),
  comment: z.string().trim().max(1000).optional().default(""),
});
export type ApplicationInput = z.input<typeof applicationSchema>;

/** Ariza qabul qilish: tekshiruv, cheklovlar va adminga Telegram xabari. */
export async function createApplication(userId: string, raw: unknown) {
  const b = applicationSchema.safeParse(raw);
  if (!b.success) {
    const errors: Record<string, string> = {};
    for (const i of b.error.issues) errors[String(i.path[0])] ??= "Maydonni to‘g‘ri to‘ldiring";
    throw new HttpError(422, "Maydonlarda xato bor", { errors });
  }
  const f = b.data, d = db();
  const phone = normalizePhoneUz(f.phone);
  if (!phone) throw new HttpError(422, "Maydonlarda xato bor", { errors: { phone: "Telefon +998 XX XXX XX XX formatida bo'lsin" } });
  const tg = f.telegramUsername ? normalizeTelegram(f.telegramUsername) : null;
  if (f.telegramUsername && !tg) throw new HttpError(422, "Maydonlarda xato bor", { errors: { telegramUsername: "Telegram nomi noto'g'ri" } });
  const website = f.website ? (/^https?:\/\//i.test(f.website) ? f.website : `https://${f.website}`) : null;
  if (website && !URL.canParse(website)) throw new HttpError(422, "Maydonlarda xato bor", { errors: { website: "Maydonni to‘g‘ri to‘ldiring" } });
  if (!(await d.select({ id: s.regions.id }).from(s.regions).where(eq(s.regions.id, f.regionId)).limit(1)).length) throw new HttpError(422, "Hudud topilmadi");
  if (f.districtId && !(await d.select({ id: s.districts.id }).from(s.districts).where(and(eq(s.districts.id, f.districtId), eq(s.districts.regionId, f.regionId))).limit(1)).length)
    throw new HttpError(422, "Tuman tanlangan hududga tegishli emas");

  let centerId: string | null = null;
  if (f.centerId) {
    if (!isUuid(f.centerId)) throw new HttpError(404, "Markaz topilmadi");
    const [c] = await d.select({ id: s.businessCenters.id }).from(s.businessCenters).where(eq(s.businessCenters.id, f.centerId)).limit(1);
    if (!c) throw new HttpError(404, "Markaz topilmadi");
    const [m] = await d.select().from(s.businessCenterMemberships).where(and(eq(s.businessCenterMemberships.centerId, c.id), eq(s.businessCenterMemberships.userId, userId))).limit(1);
    if (m) throw new HttpError(409, "Siz bu markazning vakilisiz");
    centerId = c.id;
  }
  const A = s.centerApplications;
  const [{ n }] = await d.select({ n: count() }).from(A).where(and(eq(A.userId, userId), eq(A.status, "pending")));
  if (n >= MAX_PENDING_APPLICATIONS) throw new HttpError(429, "Sizda ko'rib chiqilayotgan arizalar ko'p. Javobni kuting.");
  if (centerId && (await d.select({ id: A.id }).from(A).where(and(eq(A.userId, userId), eq(A.centerId, centerId), eq(A.status, "pending"))).limit(1)).length)
    throw new HttpError(409, "Bu markaz bo'yicha arizangiz allaqachon ko'rib chiqilmoqda");

  const [app] = await d.insert(A).values({
    userId, kind: centerId ? "claim" : "new", centerId, name: f.name, regionId: f.regionId, districtId: f.districtId ?? null, address: f.address,
    contactName: f.contactName, phone, telegramUsername: tg, floors: f.floors ?? null, freeRooms: f.freeRooms ?? null, website, comment: f.comment || null,
  }).returning({ id: A.id });
  await writeAudit({ actorId: userId, action: centerId ? "center_application.claim" : "center_application.create", entityType: "center_application", entityId: app.id, meta: { name: f.name } });
  await alertAdmins([
    centerId ? "🔑 Markaz boshqaruvi so‘raldi" : "🏢 Yangi markaz arizasi",
    `${f.name}`, `📍 ${f.address}`, `👤 ${f.contactName} · ${phone}${tg ? ` · @${tg}` : ""}`,
    [f.floors != null ? `${f.floors} qavat` : "", f.freeRooms != null ? `${f.freeRooms} ta bo‘sh xona` : ""].filter(Boolean).join(" · "),
  ].filter(Boolean).join("\n"), "/admin/arizalar");
  return app.id;
}

async function uniqueSlug(name: string, tx: Pick<ReturnType<typeof db>, "select">) {
  const base = slugify(name) || "markaz";
  for (let i = 0; i < 20; i++) {
    const slug = i ? `${base}-${i + 1}` : base;
    if (!(await tx.select({ id: s.businessCenters.id }).from(s.businessCenters).where(eq(s.businessCenters.slug, slug)).limit(1)).length) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Bir tugma bilan tasdiqlash: "new" — markaz yaratiladi; "claim" — mavjud markaz. Ikkalasida ham
 * ariza beruvchi vakil qilib biriktiriladi va unga bildirishnoma boradi. `verify` — "Tasdiqlangan markaz" belgisi.
 */
export async function approveApplication(id: string, actor: { id: string }, verify: boolean) {
  if (!isUuid(id)) throw new HttpError(404, "Ariza topilmadi");
  return db().transaction(async (tx) => {
    const A = s.centerApplications;
    const [app] = await tx.select().from(A).where(eq(A.id, id)).for("update");
    if (!app) throw new HttpError(404, "Ariza topilmadi");
    if (app.status !== "pending") throw new HttpError(409, "Ariza allaqachon ko'rib chiqilgan");
    const [user] = await tx.select({ blocked: s.users.isBlocked }).from(s.users).where(eq(s.users.id, app.userId));
    if (!user || user.blocked) throw new HttpError(409, "Ariza beruvchi bloklangan");
    let centerId = app.centerId;
    if (app.kind === "claim") {
      if (!centerId) throw new HttpError(409, "Markaz o'chirilgan");
      if (verify) await tx.update(s.businessCenters).set({ verifiedAt: new Date() }).where(eq(s.businessCenters.id, centerId));
    } else {
      const [c] = await tx.insert(s.businessCenters).values({
        slug: await uniqueSlug(app.name, tx), name: app.name, regionId: app.regionId, districtId: app.districtId, address: app.address,
        contactPhone: app.phone, telegramUsername: app.telegramUsername, website: app.website ?? "", verifiedAt: verify ? new Date() : null,
      }).returning({ id: s.businessCenters.id });
      centerId = c.id;
    }
    await tx.insert(s.businessCenterMemberships).values({ centerId: centerId!, userId: app.userId, role: "manager", createdBy: actor.id }).onConflictDoNothing();
    await tx.update(A).set({ status: "approved", centerId, reviewedBy: actor.id, reviewedAt: new Date() }).where(eq(A.id, id));
    await notify(app.userId, `Markazingiz tasdiqlandi: ${app.name}`, "Endi kabinetdagi «Biznes markazlarim» bo‘limidan markaz ma’lumotlari, rasmlari va bo‘sh xonalarini boshqarishingiz mumkin.", `/kabinet/markazlar/${centerId}`, tx);
    await writeAudit({ actorId: actor.id, action: "center_application.approve", entityType: "center_application", entityId: id, meta: { centerId, verify } }, tx);
    return { centerId: centerId! };
  });
}

export async function rejectApplication(id: string, actor: { id: string }, reason: string) {
  if (!isUuid(id)) throw new HttpError(404, "Ariza topilmadi");
  if (!reason.trim()) throw new HttpError(422, "Rad etish sababi majburiy");
  return db().transaction(async (tx) => {
    const A = s.centerApplications;
    const [app] = await tx.select().from(A).where(eq(A.id, id)).for("update");
    if (!app) throw new HttpError(404, "Ariza topilmadi");
    if (app.status !== "pending") throw new HttpError(409, "Ariza allaqachon ko'rib chiqilgan");
    await tx.update(A).set({ status: "rejected", rejectionReason: reason.trim().slice(0, 500), reviewedBy: actor.id, reviewedAt: new Date() }).where(eq(A.id, id));
    await notify(app.userId, `Markaz arizangiz rad etildi: ${app.name}`, reason.trim().slice(0, 500), "/markazlar/ariza", tx);
    await writeAudit({ actorId: actor.id, action: "center_application.reject", entityType: "center_application", entityId: id, meta: { reason } }, tx);
  });
}
