import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { hit } from "@/lib/ratelimit";
import { publicCond } from "@/lib/search";
import { getCurrentUser } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** E'lon ko'rilishini hisoblaydi: bir tashrifchi (IP+brauzer hash'i) sutkada bir marta; egasining o'zi hisoblanmaydi. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
  const ip = clientIp(req), ua = req.headers.get("user-agent") ?? "";
  if (/bot|crawl|spider|preview/i.test(ua)) return NextResponse.json({ ok: true, counted: false });
  if (!(await hit(`viewip:${ip}`, 300, 3600))) return NextResponse.json({ ok: true, counted: false });
  const visitor = createHash("sha256").update(`${process.env.SESSION_SECRET}|${ip}|${ua}`).digest("hex").slice(0, 24);
  if (!(await hit(`view:${id}:${visitor}`, 1, 86400))) return NextResponse.json({ ok: true, counted: false });
  const user = await getCurrentUser().catch(() => null);
  const L = s.listings;
  await db().update(L).set({ viewCount: sql`${L.viewCount} + 1` })
    .where(and(eq(L.id, id), publicCond(), user ? sql`${L.ownerId} <> ${user.id}` : undefined));
  return NextResponse.json({ ok: true, counted: true });
}
