import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { handle, sameOrigin } from "@/lib/guard";
export const POST = handle(async (req) => { sameOrigin(req); await destroySession(); return NextResponse.json({ ok: true }); });
