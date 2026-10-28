import { NextResponse } from "next/server";
import { handle, sameOrigin } from "@/lib/guard";
import { randomBytes } from "crypto";
import { db, schema as s } from "@/db/client";
import { hit } from "@/lib/ratelimit";
import { botUsername, telegramEnabled, tokenHash } from "@/lib/telegram";

export const POST = handle(async (req) => {
  sameOrigin(req);
  if (!telegramEnabled()) return NextResponse.json({ error: "Telegram orqali kirish hozircha sozlanmagan." }, { status: 503 });
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (!(await hit(`tgstart:ip:${ip}`, 20, 3600))) return NextResponse.json({ error: "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring." }, { status: 429 });
  const token = randomBytes(18).toString("base64url");
  await db().insert(s.telegramLogins).values({ tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 10 * 60_000) });
  return NextResponse.json({ token, botUrl: `https://t.me/${botUsername()}?start=${token}` });
});
