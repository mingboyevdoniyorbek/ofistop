import { NextResponse } from "next/server";
import { recordView } from "@/lib/views";

/** Markaz sahifasi ko'rilishi (bir tashrifchi/sutka — bitta; vakilning o'zi hisoblanmaydi). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return NextResponse.json(await recordView(req, "center", (await ctx.params).id));
}
