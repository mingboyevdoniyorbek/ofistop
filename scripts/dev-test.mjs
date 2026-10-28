import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { acquireTestLock, prepareTest, testEnvironment } from "./setup-test.mjs";

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || !["-p", "--port"].includes(args[0]) || !/^\d+$/.test(args[1]))) {
  console.error("Foydalanish: npm.cmd run dev:test -- -p 3001"); process.exit(1);
}
const port = Number(args[1] || 3000);
if (port < 1 || port > 65535) { console.error("Port 1–65535 orasida bo‘lsin"); process.exit(1); }
// Keep a separate lock for the embedded database, including when the HTTP port changes.
let lock;
try {
  lock = await acquireTestLock();
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once("error", reject); probe.listen(port, "127.0.0.1", resolve); });
  await new Promise(resolve => probe.close(resolve));
  const env = testEnvironment(port);
  prepareTest(env);
  console.log(`Sayt: http://localhost:${port}\nAdmin: http://localhost:${port}/admin (alohida login va parol)\nReklama rejimi: SMSsiz, bepul. E'lonlar admin tasdiqlagach chiqadi.`);
  const require = createRequire(import.meta.url);
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: "inherit", env });
  child.on("error", error => { console.error(error.message); lock.close(); process.exitCode = 1; });
  child.on("exit", code => { lock.close(); process.exitCode = code ?? 0; });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
} catch (error) {
  lock?.close();
  console.error(error.code === "EADDRINUSE" ? "Test serveri yoki port allaqachon ishlayapti. Eski terminalda Ctrl+C bosing yoki ochiq saytga kiring." : error.message);
  process.exitCode = 1;
}
