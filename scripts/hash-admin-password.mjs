import { randomBytes, scryptSync } from "node:crypto";
import { Writable } from "node:stream";
import { createInterface } from "node:readline/promises";

// Read from the terminal without echoing credentials or putting them in argv.
const output = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
const input = createInterface({ input: process.stdin, output, terminal: !!process.stdin.isTTY });
try {
  process.stdout.write("Yangi admin paroli (ekranda ko‘rinmaydi): ");
  const password = await input.question("");
  process.stdout.write("\nParolni takrorlang: ");
  const repeat = await input.question("");
  if (password !== repeat || password.length < 12) throw new Error("Parollar bir xil va kamida 12 belgili bo‘lsin.");
  const salt = randomBytes(16).toString("hex");
  console.log(`\nADMIN_PASSWORD_HASH=scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`);
} catch (error) { console.error(`\n${error.message}`); process.exitCode = 1; }
finally { input.close(); }
