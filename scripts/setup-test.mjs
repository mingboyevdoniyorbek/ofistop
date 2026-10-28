import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createServer } from "node:net";

export async function acquireTestLock() {
  const lock = createServer();
  await new Promise((resolve, reject) => { lock.once("error", reject); lock.listen(43991, "127.0.0.1", resolve); });
  return lock;
}

export function testEnvironment(port = 3000) {
  mkdirSync(".test-data", { recursive: true });
  const secretFile = ".test-data/session-secret";
  if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(32).toString("hex"), { flag: "wx", mode: 0o600 });
  return {
    ...process.env, NODE_ENV: "development", APP_MODE: "test", TEST_DATABASE: "embedded",
    SESSION_SECRET: readFileSync(secretFile, "utf8").trim(),
    DEV_OTP_ENABLED: "false", ALLOW_GUEST_LOGIN: "false", APP_URL: `http://localhost:${port}`, STORAGE_DRIVER: "local", UPLOAD_DIR: "./.test-data/uploads",
    GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", RESEND_API_KEY: "", EMAIL_FROM: "",
    SMS_PROVIDER: "", ESKIZ_EMAIL: "", ESKIZ_PASSWORD: "", TELEGRAM_BOT_TOKEN: "", TELEGRAM_BOT_USERNAME: "", TELEGRAM_WEBHOOK_SECRET: "",
  };
}

export function prepareTest(env = testEnvironment()) {
  const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/prepare-local-test.ts"], { stdio: "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Test bazasini tayyorlab bo‘lmadi. Yuqoridagi xatoni tekshiring.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let lock;
  try { lock = await acquireTestLock(); prepareTest(); console.log("Tayyor. Ishga tushirish: npm.cmd run dev:test"); }
  catch (error) { console.error(error.code === "EADDRINUSE" ? "Test serveri ishlayapti. Sozlashdan oldin uni Ctrl+C bilan to‘xtating." : error.message); process.exitCode = 1; }
  finally { lock?.close(); }
}
