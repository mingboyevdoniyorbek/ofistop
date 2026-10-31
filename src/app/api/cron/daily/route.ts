import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { purgeStaleDrafts } from "@/lib/drafts";
import { sendMonthlyCenterReports, remindFeaturedExpiry } from "@/lib/center-report";
import { flushTelegramNotifications } from "@/lib/telegram-notify";

/**
 * Kunlik xizmat ishi (Vercel Cron, vercel.json). Vercel `Authorization: Bearer $CRON_SECRET` yuboradi.
 * 7 kundan beri tahrirlanmagan qoralamalarni o'chiradi; oyning 1-kuni markaz vakillariga oylik hisobot yuboradi.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET sozlanmagan" }, { status: 503 });
  const got = Buffer.from(req.headers.get("authorization") ?? ""), want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  const drafts = await purgeStaleDrafts();
  const reports = await sendMonthlyCenterReports();
  const featured = await remindFeaturedExpiry();
  let tg = 0; for (let i = 0; i < 20; i++) { const n = await flushTelegramNotifications(50); tg += n; if (!n) break; } // hisobotlar Telegram'ga ham (n — ko'rib chiqilganlar)
  console.log(`[cron] Telegram: ${tg}; ${drafts} ta eskirgan qoralama o'chirildi; ${reports} ta oylik hisobot, ${featured} ta tavsiya muddati eslatmasi`);
  return NextResponse.json({ ok: true, draftsDeleted: drafts, monthlyReports: reports, featuredReminders: featured });
}
