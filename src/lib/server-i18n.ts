// Server xabarlarini tarjima qilish (next/headers'siz — unit test qilinadi).
import { SERVER_MSGS } from "@/messages/server";
import type { Locale } from "./i18n-core";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exact = new Map<string, string>();
const templates: { re: RegExp; names: string[]; ru: string }[] = [];
for (const [uz, ru] of SERVER_MSGS) {
  const names = [...uz.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  if (!names.length) { exact.set(uz, ru); continue; }
  const re = new RegExp("^" + uz.split(/\{\w+\}/).map(esc).join("(.+?)") + "$", "s");
  templates.push({ re, names, ru });
}

/** O'zbekcha server matnini tanlangan tilga o'giradi. Lug'atda bo'lmagan (masalan, foydalanuvchi yozgan) matn o'zgarmaydi. */
export function trServer(msg: string, locale: Locale): string {
  if (locale === "uz" || !msg) return msg;
  const hit = exact.get(msg);
  if (hit !== undefined) return hit;
  for (const t of templates) {
    const m = t.re.exec(msg);
    if (!m) continue;
    const vals = Object.fromEntries(t.names.map((n, i) => [n, exact.get(m[i + 1]) ?? m[i + 1]]));
    return t.ru.replace(/\{(\w+)\}/g, (_, k) => vals[k] ?? "");
  }
  return msg;
}

/** API javob tanasidagi xabar maydonlarini tarjima qiladi: error, errors{}, warnings[], results[].error. */
export function localizeBody(body: unknown, locale: Locale): unknown {
  if (locale === "uz" || !body || typeof body !== "object" || Array.isArray(body)) return body;
  const b = { ...(body as Record<string, unknown>) };
  if (typeof b.error === "string") b.error = trServer(b.error, locale);
  if (b.errors && typeof b.errors === "object") b.errors = Object.fromEntries(Object.entries(b.errors as Record<string, unknown>).map(([k, v]) => [k, typeof v === "string" ? trServer(v, locale) : v]));
  if (Array.isArray(b.warnings)) b.warnings = b.warnings.map((w) => (typeof w === "string" ? trServer(w, locale) : w));
  if (Array.isArray(b.results)) b.results = b.results.map((r) => (r && typeof r === "object" && typeof (r as { error?: unknown }).error === "string" ? { ...r, error: trServer((r as { error: string }).error, locale) } : r));
  return b;
}
