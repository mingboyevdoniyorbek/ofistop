import "../../scripts/load-env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getPool } from "./client";
import { drizzle } from "drizzle-orm/node-postgres";

async function main() {
  await migrate(drizzle(getPool()), { migrationsFolder: "./drizzle" });
  console.log("Migratsiyalar qo'llandi");
  await getPool().end();
}
main().catch((e) => { console.error(e); process.exit(1); });
