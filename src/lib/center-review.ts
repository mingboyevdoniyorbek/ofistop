import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { HttpError } from "./guard";
import { notify, writeAudit } from "./staff";
import { validateCenterForm } from "./center-management";

type Action = { action: "approve_changes" } | { action: "reject_changes"; reason: string } | { action: "verify" } | { action: "unverify" } | { action: "feature"; days: number } | { action: "unfeature" };

/** Admin: markaz bo'yicha qaror (vakil o'zgarishlari, ishonch belgisi, tavsiya etilgan muddat). */
export async function reviewCenter(id: string, actor: { id: string }, a: Action) {
  await db().transaction(async (tx) => {
    const C = s.businessCenters;
    const [c] = await tx.select().from(C).where(eq(C.id, id)).for("update");
    if (!c) throw new HttpError(404, "Markaz topilmadi");
    const clearPending = { pendingChanges: null, pendingSubmittedAt: null, pendingSubmittedBy: null };
    if (a.action === "approve_changes" || a.action === "reject_changes") {
      if (!c.pendingChanges) throw new HttpError(409, "Kutilayotgan o'zgarish yo'q");
      if (a.action === "approve_changes") {
        // Saqlangan qiymatlar allaqachon normallashtirilgan; forma ko'rinishiga qaytarib qayta tekshiramiz (qoidalar o'zgargan bo'lsa ham).
        const p = c.pendingChanges as Record<string, unknown>;
        const values = await validateCenterForm({ ...p, lat: p.lat ?? "", lng: p.lng ?? "", contactPhone: p.contactPhone ?? "", telegramUsername: p.telegramUsername ?? "", description: p.description ?? "" }, tx);
        await tx.update(C).set({ ...values, ...clearPending }).where(eq(C.id, id));
        if (c.pendingSubmittedBy) await notify(c.pendingSubmittedBy, `Markaz o‘zgarishlari tasdiqlandi: ${c.name}`, null, `/markazlar/${c.id}-${c.slug}`, tx);
      } else {
        await tx.update(C).set(clearPending).where(eq(C.id, id));
        if (c.pendingSubmittedBy) await notify(c.pendingSubmittedBy, `Markaz o‘zgarishlari rad etildi: ${c.name}`, a.reason, `/kabinet/markazlar/${c.id}`, tx);
      }
    } else if (a.action === "verify" || a.action === "unverify") {
      await tx.update(C).set({ verifiedAt: a.action === "verify" ? new Date() : null }).where(eq(C.id, id));
    } else {
      await tx.update(C).set({ featuredUntil: a.action === "feature" ? new Date(Date.now() + a.days * 864e5) : null }).where(eq(C.id, id));
    }
    await writeAudit({ actorId: actor.id, action: `center.${a.action}`, entityType: "business_center", entityId: id, meta: "reason" in a ? { reason: a.reason } : "days" in a ? { days: a.days } : null }, tx);
  });
}
