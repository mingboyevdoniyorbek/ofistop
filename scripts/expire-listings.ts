import "./load-env";
// Muddati tugagan e'lonlarni "expired" ga o'tkazadi va egalarga xabar beradi. Cron bilan har soatda ishga tushiring:
//   0 * * * *  cd /app && npm run expire-listings
// Scheduler ishlamasa ham qidiruv expires_at orqali eskirgan e'lonni chiqarmaydi (bu skript faqat holatni tozalaydi).
import { getPool } from "../src/db/client";

async function main() {
  const pool = getPool(); const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const { rows } = await c.query(`UPDATE listings SET availability_status='expired', updated_at=now()
      WHERE moderation_status='approved' AND availability_status='available' AND expires_at <= now() RETURNING id, owner_id, title`);
    for (const r of rows) {
      await c.query(`INSERT INTO notifications (user_id, title, body, href) VALUES ($1,$2,$3,$4)`, [r.owner_id, "E'lon muddati tugadi", `"${r.title}" qidiruvdan chiqarildi. Qayta faollashtirish uchun mavjudligini tasdiqlang.`, `/kabinet/elon/${r.id}`]);
      await c.query(`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, meta) VALUES (NULL,'listing.expire','listing',$1,'{"via":"scheduler"}')`, [r.id]);
    }
    await c.query("COMMIT");
    console.log(`Muddati tugagan e'lonlar: ${rows.length}`);
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); await pool.end(); }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
