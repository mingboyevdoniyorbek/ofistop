import "./load-env";
// Xavfsiz admin yaratish: parol YO'Q. Admin odatdagidek Telegram bot orqali (+998 raqam bilan) kiradi; bu skript faqat rol beradi.
// Foydalanish:  npm run create-admin -- +998901234567 [moderator|admin]
// Skript serverga (DATABASE_URL) kirish huquqi bor odam tomonidan ishga tushiriladi; amal audit logga yoziladi.
import { eq } from "drizzle-orm";
import { db, getPool, schema as s } from "../src/db/client";
import { normalizePhoneUz } from "../src/lib/text";

async function main() {
  const phone = normalizePhoneUz(process.argv[2] ?? "");
  const role = (process.argv[3] ?? "admin") as "admin" | "moderator";
  if (!phone || !["admin", "moderator"].includes(role)) { console.error("Foydalanish: npm run create-admin -- +998XXXXXXXXX [admin|moderator]"); process.exit(1); }
  const d = db();
  const [u] = await d.insert(s.users).values({ phone, role, phoneVerifiedAt: null }).onConflictDoUpdate({ target: s.users.phone, set: { role } }).returning();
  await d.insert(s.profiles).values({ userId: u.id, displayName: role === "admin" ? "Administrator" : "Moderator" }).onConflictDoNothing();
  await d.insert(s.auditLogs).values({ actorId: null, action: "user.role", entityType: "user", entityId: u.id, meta: { to: role, via: "cli" } });
  console.log(`Tayyor: ${phone} endi "${role}". Shu raqam bilan saytga kiring (Telegram, SMS yoki development test kodi; parol yo'q). Kirgan bo'lsangiz sahifani yangilang.`);
  await getPool().end();
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
