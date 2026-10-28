// Soxta tashqi servislar (4010-port): Telegram Bot API va Eskiz SMS API.
// Yuborilganlarni yig'adi; test ularni GET /__sent (Telegram) va GET /__sms (SMS) orqali o'qiydi.
import http from "http";
import { Client } from "pg";
import { E2E } from "../playwright.config";

export default async function globalSetup() {
  const sent: unknown[] = [];
  const sms: Record<string, string>[] = [];
  const server = http.createServer((req, res) => {
    let b = ""; req.on("data", (c) => (b += c));
    req.on("end", () => {
      res.setHeader("content-type", "application/json");
      if (req.method === "GET" && req.url === "/__sent") return res.end(JSON.stringify(sent));
      if (req.method === "GET" && req.url === "/__sms") return res.end(JSON.stringify(sms));
      if (req.url === "/api/auth/login") return res.end('{"message":"token_generated","data":{"token":"e2e-token"}}');
      if (req.url === "/api/message/sms/send") {
        if (req.headers.authorization !== "Bearer e2e-token") { res.statusCode = 401; return res.end('{"message":"Unauthorized"}'); }
        sms.push(Object.fromEntries(new URLSearchParams(b)));
        return res.end('{"id":"1","message":"Waiting for SMS provider","status":"waiting"}');
      }
      try { sent.push(JSON.parse(b)); } catch { /* bo'sh */ }
      res.end('{"ok":true,"result":{}}');
    });
  });
  await new Promise<void>((r) => server.listen(E2E.fakePort, "127.0.0.1", r));
  const c = new Client({ connectionString: E2E.db }); await c.connect();
  await c.query("DELETE FROM rate_limits"); // faqat test bazasi
  // Oldingi e2e yugurishlaridan qolgan test e'lonlari (bog'liq qatorlar cascade bilan o'chadi)
  await c.query("DELETE FROM listings WHERE title LIKE 'E2E ofis %' AND NOT is_demo");
  await c.end();
  return async () => { await new Promise((r) => server.close(r)); };
}
