import "./load-env";
import { getPool } from "../src/db/client";
import { promises as fs } from "node:fs";
import path from "node:path";
async function main() {
 const pool = getPool();
 await pool.query("DELETE FROM auth_challenges WHERE expires_at < now() - interval '1 day'");
 for (const query of ["DELETE FROM sessions WHERE expires_at < now()", "DELETE FROM otp_challenges WHERE expires_at < now() - interval '1 day'", "DELETE FROM telegram_logins WHERE expires_at < now() - interval '1 day'", "DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day'"]) await pool.query(query);
 const {rows} = await pool.query("SELECT storage_key AS key FROM listing_images UNION SELECT thumb_key FROM listing_images WHERE thumb_key IS NOT NULL UNION SELECT storage_key FROM business_center_images");
 const live = new Set(rows.flatMap(r => [r.key, r.key?.replace(".webp", ".thumb.webp")]));
 const dir = path.resolve(process.env.UPLOAD_DIR || "./uploads", "img");
 let removed = 0;
 for (const name of await fs.readdir(dir).catch(() => [] as string[])) {
   if (!/^[0-9a-f-]+(\.thumb)?\.webp$/.test(name) || live.has(`img/${name}`)) continue;
   const file = path.join(dir,name); const stat = await fs.stat(file);
   if (stat.isFile() && stat.mtimeMs < Date.now()-86400000) { await fs.unlink(file); removed++; }
 }
 console.log(`Eskirgan yozuvlar tozalandi; ${removed} ta bog‘lanmagan rasm o‘chirildi.`);
}
main().catch(e => {console.error(e.message);process.exitCode=1;}).finally(()=>getPool().end());
