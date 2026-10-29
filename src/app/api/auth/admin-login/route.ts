import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema as s } from "@/db/client";
import { createSession, destroySession } from "@/lib/auth";
import { adminPasswordConfigured, verifyAdminPassword } from "@/lib/admin-password";
import { handle, sameOrigin, HttpError } from "@/lib/guard";
import { hit } from "@/lib/ratelimit";

export const POST = handle(async req => {
  sameOrigin(req);
  if (!adminPasswordConfigured()) throw new HttpError(503, "Admin paroli sozlanmagan. npm run admin:hash orqali hash yarating va ADMIN_PASSWORD_HASH qiymatiga kiriting.");
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (!(await hit(`admin-login:${ip}`, 10, 900))) throw new HttpError(429, "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.");
  const body = z.object({ login: z.string().min(1).max(100), password: z.string().min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!body.success || !(await verifyAdminPassword(body.data.login, body.data.password))) throw new HttpError(401, "Login yoki parol noto‘g‘ri");
  const admin = await db().transaction(async tx => {
    const [user] = await tx.insert(s.users).values({ phone: "admin:password", role: "admin" })
      .onConflictDoUpdate({ target: s.users.phone, set: { role: "admin" } }).returning();
    if (user.isBlocked) throw new HttpError(403, "Akkaunt bloklangan");
    await tx.insert(s.profiles).values({ userId: user.id, displayName: "Administrator" }).onConflictDoNothing();
    await tx.insert(s.auditLogs).values({ actorId: user.id, action: "admin.login", entityType: "user", entityId: user.id });
    return user;
  });
  await destroySession(true);
  await createSession(admin.id, true);
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async req => {
  sameOrigin(req);
  await destroySession(true);
  return NextResponse.json({ ok: true });
});
