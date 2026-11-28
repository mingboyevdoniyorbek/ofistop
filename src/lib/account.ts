import { eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { deleteOwnerListings } from "./drafts";
import { HttpError } from "./guard";

/**
 * Hisobni butunlay o'chirish (Google Play talabi: ro'yxatdan o'tish bo'lgan ilovada
 * foydalanuvchi o'z hisobini o'zi o'chira olishi shart — /hisobni-ochirish sahifasi).
 *
 * Tartib: 1) e'lonlar rasm fayllari bilan, 2) boshqa jadvallardagi havolalar bo'shatiladi
 * (moderatsiya/audit tarixi shaxsga bog'lanmagan holda qoladi), 3) o'zi yuborgan shikoyat va
 * arizalar, 4) kirish izlari (telefon/Telegram/kod), 5) hisobning o'zi — qolgan shaxsiy
 * yozuvlar (profil, sessiyalar, identifikatorlar, sevimlilar, qidiruvlar, bildirishnomalar,
 * markaz va mebel arizalari) baza cascade qoidasi bilan o'chadi.
 */
export async function deleteAccount(userId: string) {
  const [u] = await db().select().from(s.users).where(eq(s.users.id, userId)).limit(1);
  if (!u) throw new HttpError(404, "Hisob topilmadi");
  // Xodim hisobi tasodifan o'chib ketmasin: admin panelda huquqi olib tashlanganidan keyin o'chiriladi.
  if (u.role !== "user") throw new HttpError(409, "Xizmat hisobini bu sahifadan o'chirib bo'lmaydi. Administrator bilan bog'laning.");

  // 1) E'lonlar — rasm fayllari bilan (alohida tranzaksiya: fayllar baza o'zgarishidan keyin o'chiriladi).
  const listings = await deleteOwnerListings(userId);

  await db().transaction(async (tx) => {
    const subjects = (await tx.select({ subject: s.authIdentities.subject }).from(s.authIdentities).where(eq(s.authIdentities.userId, userId))).map((r) => r.subject);

    // 2) Tarixiy yozuvlardagi havolalar bo'shatiladi (yozuvning o'zi qoladi, lekin kimligi ko'rinmaydi).
    await tx.update(s.moderationEvents).set({ actorId: null }).where(eq(s.moderationEvents.actorId, userId));
    await tx.update(s.auditLogs).set({ actorId: null }).where(eq(s.auditLogs.actorId, userId));
    await tx.update(s.businessCenterMemberships).set({ createdBy: null }).where(eq(s.businessCenterMemberships.createdBy, userId));
    await tx.update(s.businessCenters).set({ pendingSubmittedBy: null }).where(eq(s.businessCenters.pendingSubmittedBy, userId));
    await tx.update(s.centerApplications).set({ reviewedBy: null }).where(eq(s.centerApplications.reviewedBy, userId));
    await tx.update(s.centerMemberRequests).set({ reviewedBy: null }).where(eq(s.centerMemberRequests.reviewedBy, userId));
    await tx.update(s.furnitureFirms).set({ reviewedBy: null }).where(eq(s.furnitureFirms.reviewedBy, userId));
    await tx.update(s.reports).set({ resolvedBy: null }).where(eq(s.reports.resolvedBy, userId));
    await tx.update(s.serviceRequests).set({ updatedBy: null }).where(eq(s.serviceRequests.updatedBy, userId));

    // 3) O'zi yuborgan shikoyatlar va xizmat arizalari (ularda ism, telefon va izoh bor).
    await tx.delete(s.reports).where(eq(s.reports.reporterId, userId));
    await tx.delete(s.serviceRequests).where(eq(s.serviceRequests.userId, userId));

    // 4) Kirish izlari: SMS kodlari, Telegram bog'lamalari va tugallanmagan kirish so'rovlari.
    await tx.delete(s.otpChallenges).where(eq(s.otpChallenges.phone, u.phone));
    await tx.delete(s.telegramLogins).where(eq(s.telegramLogins.phone, u.phone));
    await tx.delete(s.telegramLinks).where(eq(s.telegramLinks.phone, u.phone));
    const identifiers = [u.phone, ...subjects];
    await tx.delete(s.authChallenges).where(inArray(s.authChallenges.identifier, identifiers));

    // 5) Hisobning o'zi.
    await tx.delete(s.users).where(eq(s.users.id, userId));
    // Audit: kim o'chirgani emas, faqat fakt saqlanadi (shaxsiy ma'lumotsiz).
    await tx.insert(s.auditLogs).values({ action: "user.self_deleted", entityType: "user", entityId: userId, meta: { listings } });
  });

  return { listings };
}
