import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { getCurrentUser } from "./auth";

/** So'rov davomida bir marta: foydalanuvchi va uning sevimlilari. */
export const favState = cache(async () => {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { loggedIn: false, ids: new Set<string>() };
  const rows = await db().select({ id: s.favorites.listingId }).from(s.favorites).where(eq(s.favorites.userId, user.id));
  return { loggedIn: true, ids: new Set(rows.map((r) => r.id)) };
});
