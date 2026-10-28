import { expect, type APIRequestContext, type Page } from "@playwright/test";
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

/** UI orqali Telegram kirish. Telegram tomonini (foydalanuvchi botda /start bosadi va kontakt yuboradi) test o'ynaydi. */
export async function loginViaTelegram(page: Page, phone: string, uid: number, next = "/kabinet") {
  await page.goto(`/kirish?next=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: uz["login.tg.btn"] }).click();
  const link = page.getByRole("link", { name: uz["login.tg.open"] });
  const href = (await link.getAttribute("href"))!;
  expect(href).toMatch(new RegExp(`^https://t\\.me/${E2E.bot}\\?start=`));
  const token = new URL(href).searchParams.get("start")!;
  const before = (await fakeSent()).length;
  const codeAfter = async (from: number) => {
    for (let i = 0; i < 20; i++) {
      const m = (await fakeSent()).slice(from).reverse().find((x) => x.chat_id === uid);
      const c = /: (\d{6})/.exec(m?.text ?? "")?.[1];
      if (c) return c;
      if (m) return undefined; // bot javob berdi, lekin kod emas (masalan, kontakt so'radi)
      await page.waitForTimeout(150);
    }
  };
  expect((await hook(page.request, uid, { text: `/start ${token}` })).status()).toBe(200);
  // Bog'langan Telegram akkaunti: kod darhol keladi. Birinchi marta: bot kontakt so'raydi.
  let code = await codeAfter(before);
  if (!code) {
    const mid = (await fakeSent()).length;
    expect((await hook(page.request, uid, { contact: { phone_number: phone.slice(1), first_name: "E2E", user_id: uid } })).status()).toBe(200);
    code = await codeAfter(mid);
  }
  expect(code, "bot kodi yuborilmadi").toBeTruthy();
  await page.getByLabel(uz["login.code.label"]).fill(code!);
  await page.getByRole("button", { name: uz["login.submit"], exact: true }).click();
  await page.waitForURL((u) => u.pathname === next);
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
