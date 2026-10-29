import "./load-env";
import { db, schema as s, closeDb } from "../src/db/client";
import { checkSavedSearches } from "../src/lib/saved-searches";
async function main() {
  const users = await db().selectDistinct({ id: s.savedSearches.userId }).from(s.savedSearches);
  let n = 0; for (const user of users) n += await checkSavedSearches(user.id);
  console.log(`Yangi qidiruv bildirishnomalari: ${n}`);
}
main().catch(() => { console.error("Qidiruv tekshiruvi bajarilmadi"); process.exitCode = 1; }).finally(closeDb);
