import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";

export function createTelegramServer(secret: string, handle: (update: any) => Promise<void>, isReady: () => boolean) {
  const server = createServer(async (req, res) => {
    const reply = (status: number, text: string) => { res.writeHead(status, { "Content-Type": "text/plain" }); res.end(text); };
    if (req.method === "GET" && req.url === "/health") return reply(isReady() ? 200 : 503, isReady() ? "ok" : "starting");
    if (req.method !== "POST" || req.url !== "/telegram/webhook") return reply(404, "not found");
    const got = Buffer.from(String(req.headers["x-telegram-bot-api-secret-token"] ?? "")), expected = Buffer.from(secret);
    if (got.length !== expected.length || !timingSafeEqual(got, expected)) return reply(403, "forbidden");
    try {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 256 * 1024) return reply(413, "too large"); chunks.push(Buffer.from(chunk)); }
      let update;
      try { update = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return reply(400, "invalid JSON"); }
      if (!update || !Number.isSafeInteger(update.update_id)) return reply(400, "invalid update");
      await handle(update);
      reply(200, "ok");
    } catch { console.error("Bot update failed; Telegram will retry"); reply(500, "retry"); }
  });
  server.requestTimeout = 30000;
  return server;
}
