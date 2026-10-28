import { queryClient } from "@/db/client";
/** Atomik hisoblagich. true = ruxsat, false = limit oshdi. */
export async function hit(key: string, max: number, windowSec: number): Promise<boolean> {
  const { rows } = await queryClient().query(
    `INSERT INTO rate_limits (key, count, reset_at) VALUES ($1, 1, now() + ($2 || ' seconds')::interval)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at < now() THEN now() + ($2 || ' seconds')::interval ELSE rate_limits.reset_at END
     RETURNING count`, [key, String(windowSec)]);
  return rows[0].count <= max;
}
