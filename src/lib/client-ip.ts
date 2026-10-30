/**
 * Mijoz IP manzili (rate limit uchun). `x-forwarded-for`ning birinchi qiymatini mijozning o'zi yozib yuborishi mumkin,
 * shuning uchun ishonchli proksi qo'ygan qiymat olinadi:
 *  - Vercel: `x-real-ip` / `x-vercel-forwarded-for` (Vercel o'zi yozadi, mijoz qiymati almashtiriladi);
 *  - Cloudflare: `cf-connecting-ip`;
 *  - boshqa (nginx, Render, Fly): `x-real-ip`, bo'lmasa `x-forwarded-for`ning OXIRGI qiymati (eng yaqin proksi qo'shgan).
 * TRUSTED_PROXY_HOPS=N — oldinda N ta ishonchli proksi bo'lsa, oxiridan N-chi qiymat olinadi.
 */
export function clientIp(req: Request): string {
  const h = req.headers;
  if (process.env.VERCEL === "1") {
    const v = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip");
    if (v) return v.split(",")[0].trim();
  }
  const cf = h.get("cf-connecting-ip"); if (cf && process.env.BEHIND_CLOUDFLARE === "true") return cf.trim();
  const real = h.get("x-real-ip"); if (real) return real.trim();
  const xff = (h.get("x-forwarded-for") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!xff.length) return "unknown";
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? 1) || 1);
  return xff[Math.max(0, xff.length - hops)];
}
