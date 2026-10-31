import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { purgeStaleDrafts } from "@/lib/drafts";
import { sendMonthlyCenterReports } from "@/lib/center-report";

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
  console.log(`[cron] ${drafts} ta eskirgan qoralama o'chirildi; ${reports} ta oylik hisobot yuborildi`);
  return NextResponse.json({ ok: true, draftsDeleted: drafts, monthlyReports: reports });
}
