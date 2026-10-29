import { NextResponse } from "next/server";
import { handle, requireUser } from "@/lib/guard";
import { hit } from "@/lib/ratelimit";
import { checkSavedSearches } from "@/lib/saved-searches";
export const POST = handle(async req => {
  const user = await requireUser(req);
  if (!await hit(`saved-check:${user.id}`, 1, 60)) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: true, notifications: await checkSavedSearches(user.id) });
});
