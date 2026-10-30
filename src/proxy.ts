import { NextResponse, type NextRequest } from "next/server";

/**
 * /ru/... manzillari ruscha sahifalarni beradi (Google ruscha versiyani alohida indekslashi uchun).
 * So'rov /ru prefiksisiz yo'lga qayta yoziladi va tilni "x-lang" sarlavhasi orqali uzatadi.
 */
export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = url.pathname.replace(/^\/ru(?=\/|$)/, "") || "/";
  const headers = new Headers(req.headers);
  headers.set("x-lang", "ru");
  const res = NextResponse.rewrite(url, { request: { headers } });
  // Keyingi ichki havolalar (prefiksiz) ham ruscha ochilishi uchun tanlov eslab qolinadi.
  if (req.cookies.get("lang")?.value !== "ru") res.cookies.set("lang", "ru", { path: "/", maxAge: 31536000, sameSite: "lax" });
  return res;
}

export const config = { matcher: ["/ru", "/ru/:path*"] };
