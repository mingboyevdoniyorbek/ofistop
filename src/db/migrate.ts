import "../../scripts/load-env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { normalizeConnectionString } from "./conn-string";

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL sozlanmagan");
  const pool = new Pool({ connectionString: normalizeConnectionString(connectionString), max: 1, connectionTimeoutMillis: 15000 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    console.log("Migratsiyalar qo'llandi");
  } finally {
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
