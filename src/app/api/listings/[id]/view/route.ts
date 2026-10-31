import { NextResponse } from "next/server";
import { recordView } from "@/lib/views";

/** E'lon ko'rilishi (bir tashrifchi/sutka — bitta; egasining o'zi hisoblanmaydi). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return NextResponse.json(await recordView(req, "listing", (await ctx.params).id));
}
