import "./load-env";
import { backfillMediumImages } from "../src/lib/listing-images";
import { closeDb } from "../src/db/client";
// Barcha eski rasmlarga ~800px nusxa yaratadi (bir marta ishga tushirish kifoya; kunlik cron ham asta-sekin to'ldiradi).
(async () => {
  let total = 0;
  for (;;) { const n = await backfillMediumImages(200, 120_000); total += n; if (!n) break; console.log(`... ${total}`); }
  console.log(`${total} ta rasmga o'rta nusxa yaratildi.`);
})().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => closeDb());
