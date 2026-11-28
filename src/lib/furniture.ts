import { z } from "zod";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { HttpError, isUuid } from "./guard";
import { normalizePhoneUz } from "./text";
import { normalizeTelegram } from "./listing-input";
import { notify, writeAudit } from "./staff";
import { alertAdmins } from "./admin-alert";
import { FURNITURE_PRODUCTS, KIND_LABELS } from "./furniture-labels";
import { deleteObject, mediaUrl, storeImage, storeLogo } from "./storage";
export { FURNITURE_PRODUCTS, KIND_LABELS, PRODUCT_LABELS } from "./furniture-labels";

/** Bir foydalanuvchida bir vaqtda ko'pi bilan shuncha ko'rib chiqilmagan mebel arizasi. */
const MAX_PENDING = 2;
export const firmSchema = z.object({
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["ready", "custom", "both"]),
  products: z.array(z.enum(FURNITURE_PRODUCTS)).max(FURNITURE_PRODUCTS.length).default([]),
  description: z.string().trim().max(1500).optional().default(""),
  regionId: z.coerce.number().int().positive(),
  address: z.string().trim().max(300).optional().default(""),
  contactName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30),
  telegramUsername: z.string().trim().max(40).optional().default(""),
  website: z.string().trim().max(300).optional().default(""),
});

export async function createFirmApplication(userId: string, raw: unknown) {
  const b = firmSchema.safeParse(raw);
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
  const F = s.furnitureFirms;
  const [{ n }] = await d.select({ n: count() }).from(F).where(and(eq(F.userId, userId), eq(F.status, "pending")));
  if (n >= MAX_PENDING) throw new HttpError(429, "Sizda ko'rib chiqilayotgan arizalar ko'p. Javobni kuting.");
  const [firm] = await d.insert(F).values({
    userId, name: f.name, kind: f.kind, products: [...new Set(f.products)], description: f.description, regionId: f.regionId, address: f.address,
    contactName: f.contactName, phone, telegramUsername: tg, website,
  }).returning({ id: F.id });
  await writeAudit({ actorId: userId, action: "furniture_firm.create", entityType: "furniture_firm", entityId: firm.id, meta: { name: f.name } });
  await alertAdmins([`🪑 Yangi mebel firmasi arizasi`, f.name, `${KIND_LABELS[f.kind].uz}`, `👤 ${f.contactName} · ${phone}${tg ? ` · @${tg}` : ""}`].join("\n"), "/admin/mebel");
  return firm.id;
}

export async function reviewFirm(id: string, actor: { id: string }, action: "approve" | "reject" | "remove" | "feature" | "unfeature", reason?: string, days = 30) {
  if (!isUuid(id)) throw new HttpError(404, "Ariza topilmadi");
  return db().transaction(async (tx) => {
    const F = s.furnitureFirms;
    const [firm] = await tx.select().from(F).where(eq(F.id, id)).for("update");
    if (!firm) throw new HttpError(404, "Ariza topilmadi");
    if (action === "remove") {
      await tx.delete(F).where(eq(F.id, id));
      await writeAudit({ actorId: actor.id, action: "furniture_firm.remove", entityType: "furniture_firm", entityId: id, meta: { name: firm.name } }, tx);
      // Rasmlar ham o'chiriladi (xatosi firmani o'chirishga to'sqinlik qilmaydi).
      await Promise.all([firm.logoKey, ...firm.photoKeys.flatMap(derived)].filter((k): k is string => !!k).map((k) => deleteObject(k).catch(() => {})));
      return;
    }
    // TOP (VIP) firma: /mebel'da va e'lon sahifalarida birinchi taklif qilinadi. Hozircha admin to'lovdan keyin qo'lda yoqadi.
    if (action === "feature" || action === "unfeature") {
      if (action === "feature" && firm.status !== "approved") throw new HttpError(409, "Avval firmani tasdiqlang");
      const until = action === "feature" ? new Date(Math.max(Date.now(), firm.featuredUntil?.getTime() ?? 0) + days * 864e5) : null;
      await tx.update(F).set({ featuredUntil: until }).where(eq(F.id, id));
      await writeAudit({ actorId: actor.id, action: `furniture_firm.${action}`, entityType: "furniture_firm", entityId: id, meta: until ? { days } : null }, tx);
      return;
    }
    if (firm.status !== "pending") throw new HttpError(409, "Ariza allaqachon ko'rib chiqilgan");
    if (action === "approve") {
      await tx.update(F).set({ status: "approved", rejectionReason: null, reviewedBy: actor.id, reviewedAt: new Date() }).where(eq(F.id, id));
      await notify(firm.userId, `Mebel firmangiz tasdiqlandi: ${firm.name}`, "Firmangiz «Ofis mebellari» bo‘limida ko‘rinmoqda. Birinchi oy bepul.", "/mebel", tx);
    } else {
      if (!reason?.trim()) throw new HttpError(422, "Rad etish sababi majburiy");
      await tx.update(F).set({ status: "rejected", rejectionReason: reason.trim().slice(0, 500), reviewedBy: actor.id, reviewedAt: new Date() }).where(eq(F.id, id));
      await notify(firm.userId, `Mebel arizangiz rad etildi: ${firm.name}`, reason.trim().slice(0, 500), "/mebel/ariza", tx);
    }
    await writeAudit({ actorId: actor.id, action: `furniture_firm.${action}`, entityType: "furniture_firm", entityId: id, meta: reason ? { reason } : null }, tx);
  });
}

/** Ommaviy ro'yxat: faqat tasdiqlangan va bloklanmagan foydalanuvchilarning firmalari. */
export async function listFirms(locale: "uz" | "ru", filter: { product?: string; kind?: string } = {}) {
  const F = s.furnitureFirms;
  const rows = await db().select({ f: F, region: locale === "ru" ? s.regions.nameRu : s.regions.nameUz }).from(F)
    .innerJoin(s.regions, eq(s.regions.id, F.regionId)).innerJoin(s.users, eq(s.users.id, F.userId))
    .where(and(eq(F.status, "approved"), eq(s.users.isBlocked, false)))
    .orderBy(sql`(${F.featuredUntil} IS NOT NULL AND ${F.featuredUntil} > now()) DESC`, desc(F.reviewedAt)).limit(200);
  return rows.map((r) => ({ ...r, isTop: !!r.f.featuredUntil && r.f.featuredUntil > new Date() })).filter(({ f }) => (!filter.product || f.products.includes(filter.product)) && (!filter.kind || f.kind === filter.kind || (filter.kind !== "both" && f.kind === "both")));
}

/** E'lon sahifasidagi "Ofisingizga mebel" taklifi: faqat TOP (pullik) firmalar, ko'pi bilan 2 ta. */
export async function topFirms(locale: "uz" | "ru", limit = 2) {
  return (await listFirms(locale)).filter((x) => x.isTop).slice(0, limit);
}

/** Ishlaridan namuna rasmlar soni (logotipdan tashqari). */
export const MAX_FIRM_PHOTOS = 2;
const derived = (key: string) => [key, key.replace(/\.webp$/, ".thumb.webp"), key.replace(/\.webp$/, ".md.webp")];

/** Firma egasi logotip yoki ish namunasini yuklaydi (ariza ko'rib chiqilayotganda ham, keyin ham). */
export async function addFirmImage(firmId: string, userId: string, slot: "logo" | "work", buf: Buffer) {
  if (!isUuid(firmId)) throw new HttpError(404, "Firma topilmadi");
  const F = s.furnitureFirms;
  const [firm] = await db().select().from(F).where(and(eq(F.id, firmId), eq(F.userId, userId))).limit(1);
  if (!firm) throw new HttpError(404, "Firma topilmadi");
  if (slot === "logo") {
    const key = await storeLogo(buf);
    await db().update(F).set({ logoKey: key }).where(eq(F.id, firmId));
    if (firm.logoKey) await deleteObject(firm.logoKey).catch(() => {});
    return key;
  }
  if (firm.photoKeys.length >= MAX_FIRM_PHOTOS) throw new HttpError(422, "Ko'pi bilan 2 ta namuna rasm");
  const st = await storeImage(buf);
  // Parallel yuklashda chegaradan oshmaslik uchun shart bazaning o'zida tekshiriladi.
  const upd = await db().update(F).set({ photoKeys: sql`array_append(${F.photoKeys}, ${st.key})` })
    .where(and(eq(F.id, firmId), sql`coalesce(array_length(${F.photoKeys}, 1), 0) < ${MAX_FIRM_PHOTOS}`)).returning({ id: F.id });
  if (!upd.length) { await Promise.all(derived(st.key).map((k) => deleteObject(k).catch(() => {}))); throw new HttpError(422, "Ko'pi bilan 2 ta namuna rasm"); }
  return st.key;
}

export async function removeFirmImage(firmId: string, userId: string, target: { slot: "logo" } | { key: string }) {
  if (!isUuid(firmId)) throw new HttpError(404, "Firma topilmadi");
  const F = s.furnitureFirms;
  const [firm] = await db().select().from(F).where(and(eq(F.id, firmId), eq(F.userId, userId))).limit(1);
  if (!firm) throw new HttpError(404, "Firma topilmadi");
  if ("slot" in target) {
    if (!firm.logoKey) return;
    await db().update(F).set({ logoKey: null }).where(eq(F.id, firmId));
    await deleteObject(firm.logoKey).catch(() => {});
    return;
  }
  if (!firm.photoKeys.includes(target.key)) throw new HttpError(404, "Rasm topilmadi");
  await db().update(F).set({ photoKeys: firm.photoKeys.filter((k) => k !== target.key) }).where(eq(F.id, firmId));
  await Promise.all(derived(target.key).map((k) => deleteObject(k).catch(() => {})));
}

/** Firma profili (ommaviy): faqat tasdiqlangan va egasi bloklanmagan. */
export async function getFirm(id: string, locale: "uz" | "ru") {
  if (!isUuid(id)) return null;
  const F = s.furnitureFirms;
  const [r] = await db().select({ f: F, region: locale === "ru" ? s.regions.nameRu : s.regions.nameUz }).from(F)
    .innerJoin(s.regions, eq(s.regions.id, F.regionId)).innerJoin(s.users, eq(s.users.id, F.userId))
    .where(and(eq(F.id, id), eq(F.status, "approved"), eq(s.users.isBlocked, false))).limit(1);
  return r ? { ...r, isTop: !!r.f.featuredUntil && r.f.featuredUntil > new Date() } : null;
}

/** Ish namunasining rasm manzillari (kartochkaga o'rta, to'liq ekranga asl). */
export const firmPhoto = (key: string) => ({ url: mediaUrl(key), md: mediaUrl(key.replace(/\.webp$/, ".md.webp")), thumb: mediaUrl(key.replace(/\.webp$/, ".thumb.webp")) });

/** Firma egasi ma'lumotlarini tahrirlaydi. Tasdiqlangan firma darhol yangilanadi, admin xabardor qilinadi; rad etilgani qayta ko'rib chiqishga yuboriladi. */
export async function updateFirm(firmId: string, userId: string, raw: unknown) {
  if (!isUuid(firmId)) throw new HttpError(404, "Firma topilmadi");
  const b = firmSchema.safeParse(raw);
  if (!b.success) {
    const errors: Record<string, string> = {};
    for (const i of b.error.issues) errors[String(i.path[0])] ??= "Maydonni to‘g‘ri to‘ldiring";
    throw new HttpError(422, "Maydonlarda xato bor", { errors });
  }
  const f = b.data, d = db(), F = s.furnitureFirms;
  const [firm] = await d.select().from(F).where(and(eq(F.id, firmId), eq(F.userId, userId))).limit(1);
  if (!firm) throw new HttpError(404, "Firma topilmadi");
  const phone = normalizePhoneUz(f.phone);
  if (!phone) throw new HttpError(422, "Maydonlarda xato bor", { errors: { phone: "Telefon +998 XX XXX XX XX formatida bo'lsin" } });
  const tg = f.telegramUsername ? normalizeTelegram(f.telegramUsername) : null;
  if (f.telegramUsername && !tg) throw new HttpError(422, "Maydonlarda xato bor", { errors: { telegramUsername: "Telegram nomi noto'g'ri" } });
  const website = f.website ? (/^https?:\/\//i.test(f.website) ? f.website : `https://${f.website}`) : null;
  if (website && !URL.canParse(website)) throw new HttpError(422, "Maydonlarda xato bor", { errors: { website: "Maydonni to‘g‘ri to‘ldiring" } });
  if (!(await d.select({ id: s.regions.id }).from(s.regions).where(eq(s.regions.id, f.regionId)).limit(1)).length) throw new HttpError(422, "Hudud topilmadi");
  await d.update(F).set({
    name: f.name, kind: f.kind, products: [...new Set(f.products)], description: f.description, regionId: f.regionId, address: f.address,
    contactName: f.contactName, phone, telegramUsername: tg, website, ...(firm.status === "rejected" ? { status: "pending" as const, rejectionReason: null } : {}),
  }).where(eq(F.id, firmId));
  await writeAudit({ actorId: userId, action: "furniture_firm.update", entityType: "furniture_firm", entityId: firmId, meta: { name: f.name } });
  await alertAdmins(`✏️ Mebel firmasi ma’lumotini o‘zgartirdi: ${f.name}`, "/admin/mebel");
}

/** Firma egasi o'z firmasini butunlay o'chiradi (rasmlari bilan). */
export async function deleteOwnFirm(firmId: string, userId: string) {
  if (!isUuid(firmId)) throw new HttpError(404, "Firma topilmadi");
  const F = s.furnitureFirms;
  const [firm] = await db().delete(F).where(and(eq(F.id, firmId), eq(F.userId, userId))).returning();
  if (!firm) throw new HttpError(404, "Firma topilmadi");
  await writeAudit({ actorId: userId, action: "furniture_firm.delete", entityType: "furniture_firm", entityId: firmId, meta: { name: firm.name } });
  await Promise.all([firm.logoKey, ...firm.photoKeys.flatMap(derived)].filter((k): k is string => !!k).map((k) => deleteObject(k).catch(() => {})));
}
