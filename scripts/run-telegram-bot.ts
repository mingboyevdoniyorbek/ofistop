import "./load-env";
// Optional standalone worker. Production Vercel uses the webhook instead.
async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN, secret = process.env.TELEGRAM_WEBHOOK_SECRET, app = process.env.APP_URL;
  if (!token || !secret || !app) throw new Error("Bot sozlamalari yetishmaydi");
  const origin = new URL(app);
  if (process.env.NODE_ENV === "production" && origin.protocol !== "https:") throw new Error("HTTPS kerak");
  async function telegram(method: string, body: object) {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(35000) });
    if (!response.ok) throw new Error("Telegram javob bermadi");
    const data = await response.json(); if (!data.ok) throw new Error("Telegram so'rovni rad etdi"); return data.result;
  }
  const info = await telegram("getWebhookInfo", {});
  if (info.url) throw new Error("Webhook faol. Polling va webhookni birga ishlatmang. Vercel uchun bot:webhook yetarli.");
  let stopped = false, offset = 0;
  process.once("SIGINT", () => { stopped = true; }); process.once("SIGTERM", () => { stopped = true; });
  console.log("OfisTop Telegram polling boti ishga tushdi. To'xtatish: Ctrl+C.");
  while (!stopped) {
    try {
      const updates = await telegram("getUpdates", { offset, timeout: 25, allowed_updates: ["message", "callback_query"] });
      for (const update of updates) {
        if (stopped) break;
        const response = await fetch(`${origin.origin}/api/telegram/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "X-Telegram-Bot-Api-Secret-Token": secret }, body: JSON.stringify(update), signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error("Sayt update'ni qabul qilmadi");
        offset = update.update_id + 1;
      }
    } catch { console.error("Vaqtincha aloqa xatosi. 5 soniyadan keyin qayta uriniladi."); await new Promise(resolve => setTimeout(resolve, 5000)); }
  }
}
main().catch(error => { console.error(error instanceof Error && error.message.startsWith("Webhook") ? error.message : "Bot ishga tushmadi. APP_URL va TELEGRAM_* sozlamalarini tekshiring."); process.exitCode = 1; });
