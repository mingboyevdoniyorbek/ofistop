import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { purgeRejected, purgeStaleDrafts } from "@/lib/drafts";
import { sendMonthlyCenterReports, remindFeaturedExpiry } from "@/lib/center-report";
import { flushTelegramNotifications } from "@/lib/telegram-notify";
import { backfillMediumImages } from "@/lib/listing-images";
import { sendVacancyChecks } from "@/lib/vacancy-check";

/**
 * Kunlik xizmat ishi (Vercel Cron, vercel.json). Vercel `Authorization: Bearer $CRON_SECRET` yuboradi.
 * 24 soatdan beri tahrirlanmagan qoralamalarni o'chiradi; oyning 1-kuni markaz vakillariga oylik hisobot yuboradi.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET sozlanmagan" }, { status: 503 });
  const got = Buffer.from(req.headers.get("authorization") ?? ""), want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  const drafts = await purgeStaleDrafts();
  const rejected = await purgeRejected(); // rad etilganiga 24 soat bo'lgan e'lonlar
  const reports = await sendMonthlyCenterReports();
  const featured = await remindFeaturedExpiry();
  const media = await backfillMediumImages(150, 25_000).catch((e) => { console.error("[cron] images:medium", e.message); return 0; }); // eski rasmlarga 800px nusxa
  const vacancy = await sendVacancyChecks().catch((e) => { console.error("[cron] vacancy", e.message); return 0; }); // «hali bo'shmi?» haftalik so'rov
  let tg = 0; for (let i = 0; i < 20; i++) { const n = await flushTelegramNotifications(50); tg += n; if (!n) break; } // hisobotlar Telegram'ga ham (n — ko'rib chiqilganlar)
  console.log(`[cron] Telegram: ${tg}; ${drafts} ta eskirgan qoralama va ${rejected} ta rad etilgan e'lon o'chirildi; ${reports} ta oylik hisobot, ${featured} ta tavsiya muddati eslatmasi; ${media} ta rasmga o'rta nusxa`);
  return NextResponse.json({ ok: true, draftsDeleted: drafts, rejectedDeleted: rejected, monthlyReports: reports, featuredReminders: featured, mediumImages: media, vacancyChecks: vacancy });
}
