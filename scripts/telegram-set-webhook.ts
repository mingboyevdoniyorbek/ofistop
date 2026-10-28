// Webhook'ni Telegram'ga bir marta o'rnatadi (deploy'dan keyin, domen HTTPS'da ishlab turganda):
//   set -a; . ./.env.production; set +a; npx tsx scripts/telegram-set-webhook.ts
const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secret, APP_URL } = process.env;
if (!token || !secret || !APP_URL?.startsWith("https://")) { console.error("TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET va https:// bilan boshlanuvchi APP_URL kerak"); process.exit(1); }
const url = `${APP_URL.replace(/\/$/, "")}/api/telegram/webhook`;
fetch(`https://api.telegram.org/bot${token}/setWebhook`, { method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url, secret_token: secret, allowed_updates: ["message"], drop_pending_updates: true }) })
  .then(async (r) => { const j = await r.json().catch(() => ({})); console.log(r.ok && j.ok ? `Webhook o'rnatildi: ${url}` : `Xato: ${j.description ?? "HTTP " + r.status}`); process.exit(r.ok && j.ok ? 0 : 1); })
  .catch((e) => { console.error("Tarmoq xatosi:", e instanceof Error ? e.message : e); process.exit(1); });
