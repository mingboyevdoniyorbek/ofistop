import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { createSession } from "@/lib/auth";
import { handle, sameOrigin } from "@/lib/guard";
import { localTestEnabled, testAccounts } from "@/lib/test-mode";

export const POST = handle(async req => {
  if (!localTestEnabled()) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  sameOrigin(req);
  const body = await req.json().catch(() => null);
  if (body?.account !== "admin" && body?.account !== "user") return NextResponse.json({ error: "Hisobni tanlang" }, { status: 400 });
  const account = testAccounts[body.account as keyof typeof testAccounts];
  const [user] = await db().select().from(s.users).where(eq(s.users.phone, account.phone));
  if (!user || !user.isDemo || user.isBlocked) return NextResponse.json({ error: "Test hisobi mavjud emas yoki bloklangan" }, { status: 403 });
  await createSession(user.id);
  return NextResponse.json({ ok: true, next: user.role === "admin" ? "/admin" : "/kabinet" });
});
