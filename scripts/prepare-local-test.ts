import { migrate } from "drizzle-orm/pglite/migrator";
import { drizzle } from "drizzle-orm/pglite";
import { localDatabase } from "../src/db/local";
import { bootstrap } from "../src/db/bootstrap";
import { seedDemo } from "../src/db/seed";
import { db, schema as s } from "../src/db/client";
import { testAccounts } from "../src/lib/test-mode";

async function main() {
  const client = localDatabase();
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    await bootstrap();
    // Seed once: subsequent launches preserve edits made during testing.
    const [marker] = await db().select().from(s.settings).where((await import("drizzle-orm")).eq(s.settings.key, "local_demo_seeded"));
    if (!marker) {
      await seedDemo();
      await db().insert(s.settings).values({ key: "local_demo_seeded", value: "1" });
    }
    for (const account of Object.values(testAccounts)) {
      const [user] = await db().insert(s.users).values({ phone: account.phone, role: account.role, isDemo: true, phoneVerifiedAt: new Date() })
        .onConflictDoNothing().returning();
      if (user) await db().insert(s.profiles).values({ userId: user.id, displayName: account.name }).onConflictDoNothing();
    }
    console.log("Test bazasi va admin tayyor. Ma'lumotlar .test-data papkasida saqlanadi.");
  } finally { await client.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
