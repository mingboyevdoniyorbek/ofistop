import { createHash } from "crypto";
import { sql } from "drizzle-orm";
import { db, schema as s, queryClient } from "@/db/client";
import { hit } from "./ratelimit";
import { clientIp } from "./client-ip";

/** Sahifa yo'li → bo'lim (aniq URL saqlanmaydi). */
export function sectionOf(path: string) {
  const p = path.split("?")[0].replace(/\/+$/, "").replace(/^\/ru(?=\/|$)/, "") || "/";
  if (p === "/") return "home";
  if (p === "/joylar") return "catalog";
  if (p.startsWith("/joylar/")) return "listing";
  if (p.startsWith("/ijara/")) return "landing";
  if (p === "/markazlar") return "centers";
  if (p.startsWith("/markazlar/")) return "center";
  if (p.startsWith("/mebel")) return "furniture";
  if (p.startsWith("/kabinet")) return "cabinet";
  return "other";
}
/** Kirish manbasi: utm_source yoki referrer domeni bo'yicha. */
export function sourceOf(ref: string, utm: string, ownHost: string) {
  const u = utm.toLowerCase();
  const host = (() => { try { return ref ? new URL(ref).hostname.toLowerCase() : ""; } catch { return ""; } })();
  const probe = `${u} ${host}`;
  if (/instagram|\big\b/.test(probe)) return "instagram";
  if (/telegram|t\.me|\btg\b/.test(probe)) return "telegram";
  if (/facebook|fb\.com|\bfb\b/.test(probe)) return "facebook";
  if (/google/.test(probe)) return "google";
  if (/yandex|ya\.ru/.test(probe)) return "yandex";
  if (/olx/.test(probe)) return "olx";
  if (!u && (!host || host === ownHost || host.endsWith(`.${ownHost}`))) return "direct";
  return "other";
}
/** Kunlar Toshkent vaqti bo'yicha (UTC+5) — "bugun" yarim tunda boshlanadi. */
const TODAY = "(now() AT TIME ZONE 'Asia/Tashkent')::date";
const BOT = /bot|crawl|spider|preview|slurp|headless|lighthouse|facebookexternalhit|telegrambot|whatsapp/i;

/** Bitta sahifa ko'rishini yozadi: kunlik noyob tashrifchi + bo'lim hisoblagichi. Admin sahifalari va botlar hisoblanmaydi. */
export async function recordVisit(req: Request, body: { path?: unknown; vid?: unknown; ref?: unknown; utm?: unknown; w?: unknown }) {
  const path = typeof body.path === "string" ? body.path.slice(0, 300) : "";
  const vid = typeof body.vid === "string" && /^[a-z0-9-]{8,64}$/i.test(body.vid) ? body.vid : "";
  if (!path.startsWith("/") || path.startsWith("/admin") || !vid) return false;
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return false;
  if (!(await hit(`visit:${clientIp(req)}`, 600, 3600))) return false;
  const visitor = createHash("sha256").update(`${process.env.SESSION_SECRET ?? ""}|visit|${vid}`).digest("hex").slice(0, 24);
  const ownHost = (() => { try { return new URL(req.url).hostname; } catch { return ""; } })();
  const source = sourceOf(typeof body.ref === "string" ? body.ref.slice(0, 300) : "", typeof body.utm === "string" ? body.utm.slice(0, 60) : "", ownHost);
  const device = /Mobi|Android|iPhone|iPad/i.test(ua) || (typeof body.w === "number" && body.w < 768) ? "mobile" : "desktop";
  await db().insert(s.siteVisitors).values({ day: sql.raw(TODAY) as unknown as string, visitor, source, device }).onConflictDoNothing();
  await db().insert(s.sitePageviews).values({ day: sql.raw(TODAY) as unknown as string, section: sectionOf(path), n: 1 })
    .onConflictDoUpdate({ target: [s.sitePageviews.day, s.sitePageviews.section], set: { n: sql`${s.sitePageviews.n} + 1` } });
  return true;
}

/** Admin analitikasi: 30 kunlik tashriflar, bo'limlar, manbalar va qurilmalar. */
export async function visitStats() {
  const q = queryClient();
  const { rows: days } = await q.query(`SELECT d::date AS day,
      (SELECT count(*) FROM site_visitors v WHERE v.day = d::date)::int AS visitors,
      coalesce((SELECT sum(n) FROM site_pageviews p WHERE p.day = d::date), 0)::int AS views
    FROM generate_series(${TODAY} - 29, ${TODAY}, interval '1 day') d ORDER BY d`);
  const { rows: [t] } = await q.query(`SELECT
      (SELECT count(*) FROM site_visitors WHERE day = ${TODAY})::int AS today,
      (SELECT count(*) FROM site_visitors WHERE day = ${TODAY} - 1)::int AS yesterday,
      (SELECT count(DISTINCT visitor) FROM site_visitors WHERE day > ${TODAY} - 7)::int AS week,
      (SELECT count(DISTINCT visitor) FROM site_visitors WHERE day > ${TODAY} - 30)::int AS month,
      (SELECT count(*) FROM (SELECT visitor FROM site_visitors WHERE day > ${TODAY} - 30 GROUP BY visitor HAVING count(*) > 1) r)::int AS returning,
      (SELECT coalesce(sum(n),0) FROM site_pageviews WHERE day > ${TODAY} - 30)::int AS views`);
  const { rows: sections } = await q.query(`SELECT section AS key, sum(n)::int AS n FROM site_pageviews WHERE day > ${TODAY} - 30 GROUP BY section ORDER BY n DESC`);
  const { rows: sources } = await q.query(`SELECT source AS key, count(*)::int AS n FROM site_visitors WHERE day > ${TODAY} - 30 GROUP BY source ORDER BY n DESC`);
  const { rows: devices } = await q.query(`SELECT device AS key, count(*)::int AS n FROM site_visitors WHERE day > ${TODAY} - 30 GROUP BY device ORDER BY n DESC`);
  type KV = { key: string; n: number };
  return {
    days: (days as { day: Date | string; visitors: number; views: number }[]).map((d) => ({ day: new Date(d.day).toISOString().slice(0, 10), visitors: d.visitors, views: d.views })),
    totals: t as { today: number; yesterday: number; week: number; month: number; returning: number; views: number },
    sections: sections as KV[], sources: sources as KV[], devices: devices as KV[],
  };
}
