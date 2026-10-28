import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/auth";
import { telegramEnabled } from "@/lib/telegram";
import { handleUpdate } from "@/lib/telegram-bot";

export async function POST(req: Request) {
  if (!telegramEnabled()) return NextResponse.json({ error: "Telegram sozlanmagan" }, { status: 503 });
  const got = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!safeEqual(got, process.env.TELEGRAM_WEBHOOK_SECRET!)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  try { await handleUpdate(await req.json().catch(() => null)); }
  catch (e) { console.error("telegram webhook xatosi:", e instanceof Error ? e.message : "noma'lum"); } // 200 qaytariladi: Telegram qayta yuborib yubormasin
  return NextResponse.json({ ok: true });
}
