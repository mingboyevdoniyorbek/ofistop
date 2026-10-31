import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";
import { execFileSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { uz } from "../src/messages/uz";
import { ru } from "../src/messages/ru";
import { E2E } from "../playwright.config";

export { uz, ru, E2E };
export const RUN = String(Date.now() % 1_000_000).padStart(6, "0");
/** Test raqamlari: +998 99 9xx xx xx (haqiqiy odamga tegishli emasligi kafolatlanmaydi — faqat test bazasida ishlating). */
export const phoneFor = (n: number) => `+99899${n}${RUN}`.slice(0, 13);
export const SHOTS = join(__dirname, "screenshots");
mkdirSync(SHOTS, { recursive: true });

type Sent = { chat_id: number; text: string };
const fakeSent = async (): Promise<Sent[]> => (await fetch(`http://127.0.0.1:${E2E.fakePort}/__sent`)).json();
const hook = (req: APIRequestContext, uid: number, extra: object) => req.post("/api/telegram/webhook", {
  headers: { "x-telegram-bot-api-secret-token": E2E.tgSecret },
  data: { update_id: Math.floor(Math.random() * 1e9), message: { message_id: 1, from: { id: uid, is_bot: false, first_name: "E2E" }, chat: { id: uid, type: "private" }, date: 0, ...extra } },
});

const callback = (req: APIRequestContext, uid: number, data: string) => req.post("/api/telegram/webhook", {
  headers: { "x-telegram-bot-api-secret-token": E2E.tgSecret },
  data: { update_id: Math.floor(Math.random() * 1e9), callback_query: { id: String(Math.random()), from: { id: uid, is_bot: false, first_name: "E2E" }, data, message: { message_id: 1, chat: { id: uid, type: "private" }, date: 0 } } },
});

/**
 * UI orqali Telegram kirish (hozirgi jarayon): usul tanlash → "Telegram orqali kirish" → bot havolasi.
 * Telegram tomonini test o'ynaydi: /start <token>, keyin birinchi marta kontakt, bog'langan hisobda "Ha, kirish" tugmasi.
 * Sahifa holatni o'zi so'rab turadi va tasdiqlangach `next` ga o'tadi.
 */
export async function loginViaTelegram(page: Page, phone: string, uid: number, next = "/kabinet") {
  await page.route("https://t.me/**", (r) => r.fulfill({ status: 204 })); // t.me ga o'tish sahifani tark ettirmasin
  await page.goto(`/kirish?next=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: uz["login.tg.btn"] }).first().click();
  const [resp] = await Promise.all([
    page.waitForResponse("**/api/auth/telegram/start"),
    page.getByRole("button", { name: uz["login.tg.btn"] }).first().click(),
  ]);
  const start = await resp.json() as { id: string; botUrl: string };
  expect(start.botUrl).toMatch(new RegExp(`^https://t\\.me/${E2E.bot}\\?start=`));
  const token = new URL(start.botUrl).searchParams.get("start")!;
  const before = (await fakeSent()).length;
  expect((await hook(page.request, uid, { text: `/start ${token}` })).status()).toBe(200);
  let reply: Sent | undefined;
  for (let i = 0; i < 30 && !reply; i++) { reply = (await fakeSent()).slice(before).find((x) => x.chat_id === uid); if (!reply) await page.waitForTimeout(100); }
  expect(reply, "bot javob bermadi").toBeTruthy();
  if (/tasdiqlaysizmi/i.test(reply!.text)) expect((await callback(page.request, uid, `confirm:${start.id}`)).status()).toBe(200);
  else expect((await hook(page.request, uid, { contact: { phone_number: phone.slice(1), first_name: "E2E", user_id: uid } })).status()).toBe(200);
  await page.waitForURL((u) => u.pathname === next, { timeout: 20_000 });
}

export function promote(phone: string, role: "moderator" | "admin") {
  execFileSync("npx", ["tsx", "scripts/create-admin.ts", phone, role], { env: { ...process.env, DATABASE_URL: E2E.db }, stdio: "pipe" });
}

export async function fixtures() {
  const dir = join(__dirname, ".fixtures"); mkdirSync(dir, { recursive: true });
  const mk = async (name: string, color: string) => { const p = join(dir, name); writeFileSync(p, await sharp({ create: { width: 800, height: 600, channels: 3, background: color } }).jpeg().toBuffer()); return p; };
  const bad = join(dir, "not-an-image.jpg"); writeFileSync(bad, "bu rasm emas");
  return { a: await mk("office-a.jpg", "#2b6cb0"), b: await mk("office-b.jpg", "#2f855a"), bad };
}

/** Sahifada gorizontal skroll yo'qligini tekshiradi (mobil moslashuv). */
export async function noHorizontalScroll(page: Page) {
  // Mobil brauzer kontent kengayganda layout viewport'ni ham kengaytiradi, shuning uchun sozlangan kenglik bilan solishtiriladi.
  const vw = page.viewportSize()!.width;
  const sw = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
  expect(sw, `gorizontal skroll: ${page.url()}`).toBeLessThanOrEqual(vw + 1);
}

/** Saytdagi ochiladigan ro'yxat (Radix, role=combobox): ochib, variantni matni yoki tartib raqami bo'yicha tanlaydi. */
export async function pick(page: Page, combo: Locator, option: string | RegExp | { index: number }) {
  await combo.click();
  if (typeof option === "object" && "index" in option) await page.getByRole("option").nth(option.index).click();
  else await page.getByRole("option", { name: option, exact: typeof option === "string" }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
}
