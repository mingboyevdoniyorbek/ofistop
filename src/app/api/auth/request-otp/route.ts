import { NextResponse } from "next/server";
import { handle } from "@/lib/guard";
// SMS implementation is retained in lib/sms.ts, but public SMS login is disabled.
export const POST = handle(async () => {
  return NextResponse.json({ error: "SMS orqali kirish o'chirilgan. Google, email yoki Telegram orqali kiring." }, { status: 410 });
});
