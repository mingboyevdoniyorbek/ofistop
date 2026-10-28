// Xodimlar (moderator/admin) uchun server tomonidagi himoya. Tugmani yashirish yetarli emas — har bir endpoint shu yerdan o'tadi.
import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { getAdminUser } from "./auth";
import { HttpError, sameOrigin } from "./guard";
import { canModerate, isAdmin, type Role } from "./status";

type Actor = { id: string; role: Role };

/** API: moderator yoki admin. Oddiy foydalanuvchiga 403. */
export async function requireStaff(req: Request, adminOnly = false): Promise<Actor> {
  if (req.method !== "GET") sameOrigin(req);
  const u = await getAdminUser();
  if (!u) throw new HttpError(401, "Avval tizimga kiring");
  if (adminOnly ? !isAdmin(u.role) : !canModerate(u.role)) throw new HttpError(403, "Ruxsat yo'q");
  return u;
}

/** Sahifa: ruxsatsiz foydalanuvchiga 404 (admin panel mavjudligi oshkor bo'lmasin). */
export async function requireStaffPage(adminOnly = false): Promise<Actor> {
  const u = await getAdminUser();
  if (!u) redirect("/admin");
  if (adminOnly ? !isAdmin(u.role) : !canModerate(u.role)) notFound();
  return u;
}

export async function writeAudit(p: { actorId: string | null; action: string; entityType: string; entityId: string; meta?: object | null }, tx: { insert: ReturnType<typeof db>["insert"] } = db()) {
  await tx.insert(s.auditLogs).values({ actorId: p.actorId, action: p.action, entityType: p.entityType, entityId: p.entityId, meta: p.meta ?? null });
}

export async function notify(userId: string, title: string, body?: string | null, href?: string | null, tx: { insert: ReturnType<typeof db>["insert"] } = db()) {
  await tx.insert(s.notifications).values({ userId, title, body: body ?? null, href: href ?? null });
}
export { and, eq, isNull };
