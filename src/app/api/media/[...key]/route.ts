import { KEY_RE, getObject } from "@/lib/storage";

export async function GET(_: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const key = (await ctx.params).key.join("/");
  if (!KEY_RE.test(key)) return new Response("Topilmadi", { status: 404 });
  let buf;
  try { buf = await getObject(key); }
  catch { return new Response("Rasm xotirasi vaqtincha ishlamayapti", { status: 503, headers: { "Cache-Control": "no-store" } }); }
  if (!buf) return new Response("Topilmadi", { status: 404 });
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
