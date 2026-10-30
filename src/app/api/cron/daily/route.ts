import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { purgeStaleDrafts } from "@/lib/drafts";

/**
 * Kunlik xizmat ishi (Vercel Cron, vercel.json). Vercel `Authorization: Bearer $CRON_SECRET` yuboradi.
 * Hozir: 7 kundan beri tahrirlanmagan qoralamalarni rasmlari bilan o'chiradi.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET sozlanmagan" }, { status: 503 });
  const got = Buffer.from(req.headers.get("authorization") ?? ""), want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  const drafts = await purgeStaleDrafts();
  console.log(`[cron] ${drafts} ta eskirgan qoralama o'chirildi`);
  return NextResponse.json({ ok: true, draftsDeleted: drafts });
}
