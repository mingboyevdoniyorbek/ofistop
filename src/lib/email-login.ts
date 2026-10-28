import { HttpError } from "./guard";

export const emailEnabled = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.APP_URL);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function loginEmail(code: string, url: string, locale: string) {
  const ru = locale === "ru";
  const title = ru ? "Подтвердите вход в OfisTop" : "OfisTop’ga kirishni tasdiqlang";
  const intro = ru ? "Нажмите кнопку, чтобы подтвердить вход. Открытая страница сайта обновится автоматически." : "Kirishni tasdiqlash uchun tugmani bosing. Saytdagi ochiq oynangiz avtomatik davom etadi.";
  const button = ru ? "Подтвердить вход" : "Kirishni tasdiqlash";
  const note = ru ? "Или введите этот код на сайте. Ссылка и код действуют 10 минут. Если вы не запрашивали вход, не подтверждайте его и никому не передавайте код." : "Yoki saytda quyidagi kodni kiriting. Havola va kod 10 daqiqa amal qiladi. Kirishni siz so‘ramagan bo‘lsangiz, tasdiqlamang va kodni hech kimga bermang.";
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="100%" style="width:100%;max-width:480px;background:#fff;border-radius:24px;border:1px solid #e2e8f0" cellpadding="32"><tr><td><div style="font-size:28px;font-weight:bold;color:#12308a">Ofis<span style="color:#16a34a">Top</span></div><h1 style="font-size:24px;margin-top:28px">${title}</h1><p style="line-height:1.7;color:#475569">${intro}</p><p style="margin:30px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:16px 24px;background:#12308a;color:white;border-radius:12px;text-decoration:none;font-weight:bold">${button}</a></p><p style="line-height:1.7;color:#475569">${note}</p><div style="background:#f1f5f9;padding:20px;border-radius:12px;font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center">${escapeHtml(code)}</div><p style="margin-top:32px;font-size:12px;color:#64748b">OfisTop · ${ru ? "Ваше пространство для бизнеса" : "Biznesingiz uchun mos joy"}</p></td></tr></table></td></tr></table></body></html>`;
  return { subject: title, html, text: `${title}\n\n${intro}\n${url}\n\n${note}\n${code}` };
}
export async function sendLoginEmail(to: string, code: string, url: string, id: string, locale: string) {
  if (!emailEnabled()) throw new HttpError(503, "Email orqali kirish hali sozlanmagan.");
  // Server-only key; no provider response (recipient/credentials) is exposed.
  const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `login-${id}` }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], ...loginEmail(code, url, locale) }), signal: AbortSignal.timeout(10000) }).catch(() => null);
  if (!res?.ok) throw new HttpError(502, "Email yuborilmadi. Birozdan keyin qayta urinib ko'ring.");
}
