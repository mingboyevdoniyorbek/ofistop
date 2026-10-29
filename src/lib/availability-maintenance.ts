import { and, eq, lte, gt, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";

/** Safe to run repeatedly, including from overlapping scheduler invocations. */
export async function maintainAvailability(now = new Date()) {
  return db().transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7201042)`);
    const expired = await tx.update(s.listings).set({ availabilityStatus: "expired", updatedAt: now })
      .where(and(eq(s.listings.moderationStatus,"approved"),eq(s.listings.availabilityStatus,"available"),lte(s.listings.expiresAt,now)))
      .returning({id:s.listings.id, ownerId:s.listings.ownerId, title:s.listings.title});
    for (const r of expired) {
      await tx.insert(s.notifications).values({userId:r.ownerId,title:"E'lon muddati tugadi",body:`"${r.title}" qidiruvdan chiqarildi. Qayta faollashtirish uchun mavjudligini tasdiqlang.`,href:`/kabinet/elon/${r.id}`});
      await tx.insert(s.auditLogs).values({action:"listing.expire",entityType:"listing",entityId:r.id,meta:{via:"scheduler"}});
    }
    const reminderTitle = "Joyingiz hali ham bo‘shmi?";
    const due = await tx.select().from(s.listings).where(and(
      eq(s.listings.moderationStatus,"approved"), eq(s.listings.availabilityStatus,"available"), eq(s.listings.isSuspended,false),
      gt(s.listings.expiresAt,now), lte(s.listings.availabilityConfirmedAt,new Date(now.getTime()-7*86400000)),
      sql`NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = ${s.listings.ownerId} AND n.title = ${reminderTitle} AND n.href = '/kabinet/elon/' || ${s.listings.id}::text AND n.created_at >= ${s.listings.availabilityConfirmedAt})`
    )).for("update");
    for (const r of due) await tx.insert(s.notifications).values({userId:r.ownerId,title:reminderTitle,body:`${r.title}: mavjudligini tasdiqlang yoki ijaraga berilganini belgilang.`,href:`/kabinet/elon/${r.id}`});
    return {expired:expired.length, reminded:due.length};
  });
}
