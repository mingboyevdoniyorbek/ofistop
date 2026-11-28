import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { HttpError, isUuid, managedCenterIds } from "./guard";
import { normalizePhoneUz } from "./text";
import { normalizeEmail } from "./login-challenge";
import { notify, writeAudit } from "./staff";
import { alertAdmins } from "./admin-alert";

/** Bitta markazda ko'pi bilan shuncha vakil (o'zi + yordamchilar). */
export const MAX_TEAM = 10;

/** Telefon (+998...) yoki Google email bo'yicha ro'yxatdan o'tgan foydalanuvchini topadi. */
export async function findUserByContact(raw: string) {
  const v = raw.trim(); const d = db();
  if (v.includes("@")) {
    const [idn] = await d.select({ u: s.authIdentities.userId }).from(s.authIdentities).where(and(eq(s.authIdentities.provider, "email"), eq(s.authIdentities.subject, normalizeEmail(v)))).limit(1);
    if (!idn) throw new HttpError(404, "Bu odam saytda ro'yxatdan o'tmagan. Avval u saytga kirishi kerak.");
    const [u] = await d.select().from(s.users).where(eq(s.users.id, idn.u)).limit(1);
    return u;
  }
  const phone = normalizePhoneUz(v);
  if (!phone) throw new HttpError(422, "Telefon +998 XX XXX XX XX formatida bo'lsin");
  const [u] = await d.select().from(s.users).where(eq(s.users.phone, phone)).limit(1);
  if (!u) throw new HttpError(404, "Bu odam saytda ro'yxatdan o'tmagan. Avval u saytga kirishi kerak.");
  return u;
}

async function requireMember(centerId: string, userId: string) {
  if (!isUuid(centerId) || !(await managedCenterIds(userId)).includes(centerId)) throw new HttpError(403, "Ruxsat yo'q");
  const [c] = await db().select().from(s.businessCenters).where(eq(s.businessCenters.id, centerId)).limit(1);
  if (!c) throw new HttpError(404, "Markaz topilmadi");
  return c;
}

/** Vakil yordamchi qo'shishni so'raydi: so'rov admin tasdig'iga tushadi. */
export async function requestMember(centerId: string, requesterId: string, contact: string) {
  const c = await requireMember(centerId, requesterId);
  const u = await findUserByContact(contact);
  if (u.isBlocked) throw new HttpError(403, "Akkaunt bloklangan");
  const d = db(), M = s.businessCenterMemberships, R = s.centerMemberRequests;
  if ((await d.select({ u: M.userId }).from(M).where(and(eq(M.centerId, centerId), eq(M.userId, u.id))).limit(1)).length) throw new HttpError(409, "Bu odam allaqachon markaz jamoasida");
  if ((await d.select({ id: R.id }).from(R).where(and(eq(R.centerId, centerId), eq(R.userId, u.id), eq(R.status, "pending"))).limit(1)).length) throw new HttpError(409, "Bu odam uchun so'rov allaqachon yuborilgan");
  const team = await d.select({ u: M.userId }).from(M).where(eq(M.centerId, centerId));
  const pending = await d.select({ id: R.id }).from(R).where(and(eq(R.centerId, centerId), eq(R.status, "pending")));
  if (team.length + pending.length >= MAX_TEAM) throw new HttpError(422, "Jamoada ko'pi bilan 10 kishi bo'lishi mumkin");
  const [r] = await d.insert(R).values({ centerId, userId: u.id, requestedBy: requesterId }).returning({ id: R.id });
  await writeAudit({ actorId: requesterId, action: "center.member_request", entityType: "business_center", entityId: centerId, meta: { userId: u.id } });
  await alertAdmins(`👥 Markazga yordamchi qo‘shish so‘raldi: ${c.name}\n📞 ${u.phone.startsWith("+") ? u.phone : "Google hisob"}`, "/admin/arizalar");
  return r.id;
}

/** Vakil kutilayotgan so'rovni bekor qiladi yoki o'zi qo'shtirgan yordamchini jamoadan chiqaradi. */
export async function removeMember(centerId: string, actorId: string, target: { requestId?: string; userId?: string }) {
  await requireMember(centerId, actorId);
  const d = db(), M = s.businessCenterMemberships, R = s.centerMemberRequests;
  if (target.requestId) {
    if (!isUuid(target.requestId)) throw new HttpError(404, "So'rov topilmadi");
    const del = await d.delete(R).where(and(eq(R.id, target.requestId), eq(R.centerId, centerId), eq(R.status, "pending"))).returning({ id: R.id });
    if (!del.length) throw new HttpError(404, "So'rov topilmadi");
    return;
  }
  if (!target.userId || !isUuid(target.userId) || target.userId === actorId) throw new HttpError(400, "So'rov noto'g'ri");
  // Faqat shu vakil so'rovi bilan qo'shilgan yordamchi (asosiy vakilni admin biriktirgan — uni faqat admin olib tashlaydi).
  const [mine] = await d.select({ id: R.id }).from(R).where(and(eq(R.centerId, centerId), eq(R.userId, target.userId), eq(R.requestedBy, actorId), eq(R.status, "approved"))).limit(1);
  if (!mine) throw new HttpError(403, "Bu odamni faqat administrator olib tashlay oladi");
  await d.delete(M).where(and(eq(M.centerId, centerId), eq(M.userId, target.userId)));
  await writeAudit({ actorId, action: "center.member_remove", entityType: "business_center", entityId: centerId, meta: { userId: target.userId } });
}

/** Admin: so'rovni tasdiqlash (yordamchi markazga biriktiriladi) yoki rad etish. */
export async function reviewMemberRequest(id: string, actor: { id: string }, approve: boolean) {
  if (!isUuid(id)) throw new HttpError(404, "So'rov topilmadi");
  return db().transaction(async (tx) => {
    const R = s.centerMemberRequests;
    const [r] = await tx.select().from(R).where(eq(R.id, id)).for("update");
    if (!r) throw new HttpError(404, "So'rov topilmadi");
    if (r.status !== "pending") throw new HttpError(409, "So'rov allaqachon ko'rib chiqilgan");
    const [c] = await tx.select({ name: s.businessCenters.name }).from(s.businessCenters).where(eq(s.businessCenters.id, r.centerId));
    await tx.update(R).set({ status: approve ? "approved" : "rejected", reviewedBy: actor.id, reviewedAt: new Date() }).where(eq(R.id, id));
    if (approve) {
      await tx.insert(s.businessCenterMemberships).values({ centerId: r.centerId, userId: r.userId, createdBy: actor.id }).onConflictDoNothing();
      await notify(r.userId, `Siz "${c?.name ?? ""}" biznes markaziga vakil qilib biriktirildingiz`, null, `/kabinet/markazlar/${r.centerId}`, tx);
    }
    await notify(r.requestedBy, approve ? `Yordamchi qo‘shildi: ${c?.name ?? ""}` : `Yordamchi qo‘shish rad etildi: ${c?.name ?? ""}`, null, `/kabinet/markazlar/${r.centerId}`, tx);
    await writeAudit({ actorId: actor.id, action: approve ? "center.member_approve" : "center.member_reject", entityType: "business_center", entityId: r.centerId, meta: { userId: r.userId } }, tx);
  });
}

const who = (u: { phone: string; name: string | null }) => u.name || (u.phone.startsWith("+") ? u.phone : "Google");

/** Kabinet: markaz jamoasi va kutilayotgan so'rovlar. */
export async function teamOf(centerId: string, viewerId: string) {
  const d = db(), M = s.businessCenterMemberships, R = s.centerMemberRequests;
  const members = await d.select({ id: s.users.id, phone: s.users.phone, name: s.profiles.displayName }).from(M).innerJoin(s.users, eq(s.users.id, M.userId))
    .leftJoin(s.profiles, eq(s.profiles.userId, M.userId)).where(eq(M.centerId, centerId)).orderBy(M.createdAt);
  const reqs = await d.select({ id: R.id, userId: R.userId, requestedBy: R.requestedBy, status: R.status, phone: s.users.phone, name: s.profiles.displayName }).from(R)
    .innerJoin(s.users, eq(s.users.id, R.userId)).leftJoin(s.profiles, eq(s.profiles.userId, R.userId))
    .where(and(eq(R.centerId, centerId), inArray(R.status, ["pending", "approved"]))).orderBy(desc(R.createdAt));
  const mine = new Set(reqs.filter((r) => r.status === "approved" && r.requestedBy === viewerId).map((r) => r.userId));
  return {
    members: members.map((m) => ({ id: m.id, label: who(m), you: m.id === viewerId, removable: mine.has(m.id) })),
    pending: reqs.filter((r) => r.status === "pending").map((r) => ({ id: r.id, label: who(r) })),
  };
}
