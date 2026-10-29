import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/auth";
import { telegramEnabled } from "@/lib/telegram";
import { handleUpdate } from "@/lib/telegram-bot";

export async function POST(req: Request) {
  if (process.env.TELEGRAM_BOT_HOST === "render") return NextResponse.json({ error: "Bot Render orqali ishlaydi" }, { status: 410 });
  if (!telegramEnabled()) return NextResponse.json({ error: "Telegram sozlanmagan" }, { status: 503 });
  const got = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!safeEqual(got, process.env.TELEGRAM_WEBHOOK_SECRET!)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  try { await handleUpdate(await req.json().catch(() => null)); }
  catch { console.error("Telegram webhook processing failed"); return NextResponse.json({ error: "Vaqtincha xato" }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}
