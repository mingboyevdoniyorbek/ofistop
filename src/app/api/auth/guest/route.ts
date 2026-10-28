import { NextResponse } from "next/server";
import { handle } from "@/lib/guard";
import { getOrCreateGuest } from "@/lib/guest";

export const POST = handle(async req => {
  await getOrCreateGuest(req);
  return NextResponse.json({ ok: true });
});
