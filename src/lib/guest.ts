import { randomUUID } from "node:crypto";
import { db, schema as s } from "@/db/client";
import { createSession, getCurrentUser, getSessionUser } from "./auth";
import { HttpError, sameOrigin } from "./guard";
import { promoEnabled, isGuestPhone } from "./launch-mode";
import { hit } from "./ratelimit";

export async function getOrCreateGuest(req: Request) {
  sameOrigin(req);
  const user = await getCurrentUser();
  if (user) {
    if (isGuestPhone(user.phone) && !promoEnabled()) throw new HttpError(401, "E’lon berish uchun telefoningizni tasdiqlang");
    return user;
  }
  if (!promoEnabled()) throw new HttpError(401, "Avval tizimga kiring");
  if ((await getSessionUser())?.blocked) throw new HttpError(403, "Akkaunt bloklangan");
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (!(await hit(`guest:ip:${ip}`, 10, 3600))) throw new HttpError(429, "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.");
  const guest = await db().transaction(async tx => {
    // A contact number never grants ownership of somebody else's account.
    const [created] = await tx.insert(s.users).values({ phone: `guest:${randomUUID()}` }).returning();
    await tx.insert(s.profiles).values({ userId: created.id, displayName: "Foydalanuvchi" });
    return created;
  });
  await createSession(guest.id);
  return { id: guest.id, phone: guest.phone, role: guest.role, blocked: false };
}
