// End-to-end tekshiruv (24-bo'lim). Production rejimida (`next start`) ishlaydi: test OTP o'chiq, kirish faqat Telegram orqali.
// Haqiqiy Telegram va Eskiz ishlatilmaydi: so'rovlarni e2e/global-setup.ts dagi soxta Bot API (4010-port) qabul qiladi,
// test esa Telegram serveri rolini o'ynab webhook'ga /start va kontakt yuboradi.
// Oldindan: Postgres + migratsiya + seed (`bash scripts/dev-setup.sh`) va `npx next build`. Keyin: `npm run e2e`.
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E = {
  base: `http://localhost:${PORT}`,
  db: process.env.DATABASE_URL ?? "postgres://ofisijara:devpass@localhost:5432/ofisijara",
  tgSecret: "e2e_secret_0123456789abcdef0123456789",
  bot: "OfisIjaraE2EBot",
  fakePort: 4010,
};

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: E2E.base, locale: "uz-UZ", actionTimeout: 15_000, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `${E2E.base}/robots.txt`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NODE_ENV: "production",
      PROMO_MODE: "false",
      ADMIN_LOGIN: "ofis",
      ADMIN_PASSWORD_HASH: "scrypt:506ea7ac8176637676a752f3002350b6:02d24b2f74c692a152ea8b6f58f3731517836fd1e28f374e6f6efc64f4c7c6bcf337aab0df42dc595b8fcdb331a57577f89927233fb9651bae530ab6ccd8bc97",
      DATABASE_URL: E2E.db,
      SESSION_SECRET: process.env.SESSION_SECRET ?? "e2e-session-secret-0123456789-abcdefghij",
      APP_URL: E2E.base,
      TELEGRAM_BOT_TOKEN: "123:E2E",
      TELEGRAM_BOT_USERNAME: E2E.bot,
      TELEGRAM_WEBHOOK_SECRET: E2E.tgSecret,
      TELEGRAM_API_BASE: `http://127.0.0.1:${E2E.fakePort}`,
      DEV_OTP_ENABLED: "true", // ataylab yoqilgan: production'da baribir ishlamasligi tekshiriladi
      SMS_PROVIDER: "eskiz",
      ESKIZ_EMAIL: "e2e@example.uz",
      ESKIZ_PASSWORD: "e2e-password",
      ESKIZ_API_BASE: `http://127.0.0.1:4010/api`, // soxta Eskiz
      STORAGE_DRIVER: "local",
      UPLOAD_DIR: "./uploads",
    },
  },
});
