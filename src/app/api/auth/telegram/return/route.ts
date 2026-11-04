import { NextResponse } from "next/server";
import { appOrigin, consumeTelegramReturn } from "@/lib/login-challenge";
import { hit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/client-ip";

/** Botdagi "Saytga qaytish" tugmasi: bir martalik havola orqali kirgan holda saytga qaytaradi. */
export async function GET(req: Request) {
  const origin = appOrigin();
  const url = new URL(req.url);
  if (!(await hit(`tgreturn:${clientIp(req)}`, 20, 600))) return NextResponse.redirect(new URL("/kirish?xato=telegram", origin));
  const next = await consumeTelegramReturn(url.searchParams.get("id") ?? "", url.searchParams.get("t") ?? "").catch((e) => { console.error("[telegram-return]", (e as Error).message); return null; });
  const res = NextResponse.redirect(new URL(next ?? "/kirish?xato=telegram", origin));
  res.headers.set("Cache-Control", "no-store"); res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
