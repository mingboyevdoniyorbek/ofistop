import { NextResponse } from "next/server";
import { recordVisit } from "@/lib/site-visits";

/** Sahifa ko'rishi (sendBeacon). Xato bo'lsa ham foydalanuvchiga ta'sir qilmaydi — doim 204. */
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const body = raw.length < 2000 ? JSON.parse(raw || "{}") : {};
    await recordVisit(req, body && typeof body === "object" ? body : {});
  } catch (e) { console.error("[visit]", (e as Error).message); }
  return new NextResponse(null, { status: 204 });
}
