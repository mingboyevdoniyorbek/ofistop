import "./load-env";
import { purgeStaleDrafts, DRAFT_TTL_HOURS } from "../src/lib/drafts";
import { closeDb } from "../src/db/client";
// Vercel'dan tashqari hostinglar uchun: kuniga bir marta cron orqali ishga tushiring.
purgeStaleDrafts()
  .then((n) => console.log(`${DRAFT_TTL_HOURS} soatdan eski ${n} ta qoralama o'chirildi.`))
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(() => closeDb());
