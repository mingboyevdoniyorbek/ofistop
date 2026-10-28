import "./load-env";
// Eskiz sozlamasini qadam-baqadam tekshirish. Sayt kodidan mustaqil: Eskiz'ning XOM javobini ko'rsatadi.
// Foydalanish (.env.local dagi ESKIZ_EMAIL / ESKIZ_PASSWORD o'qiladi):
//   npm run sms-check -- login
//   npm run sms-check -- test +998901234567      (Eskiz test matni: "Bu Eskiz dan test")
//   npm run sms-check -- otp  +998901234567      (saytdagi haqiqiy OTP matni, SMS_OTP_TEMPLATE)
// Parol/token ekranga chiqarilmaydi.
import { otpText } from "../src/lib/sms";

const BASE = (process.env.ESKIZ_API_BASE || "https://notify.eskiz.uz/api").replace(/\/$/, "");
const [cmd, phoneArg] = process.argv.slice(2);

async function login() {
  const email = process.env.ESKIZ_EMAIL, password = process.env.ESKIZ_PASSWORD;
  if (!email || !password) { console.error("XATO: .env.local da ESKIZ_EMAIL va ESKIZ_PASSWORD yo'q."); process.exit(1); }
  const r = await fetch(`${BASE}/auth/login`, { method: "POST", body: new URLSearchParams({ email, password }) });
  const d = await r.json().catch(() => null) as { data?: { token?: string } } | null;
  if (!r.ok || !d?.data?.token) { console.error(`LOGIN RAD ETILDI: HTTP ${r.status}`, JSON.stringify(d)); process.exit(1); }
  console.log(`LOGIN OK (HTTP ${r.status}). Token olindi.`);
  return d.data.token;
}

async function main() {
  if (!["login", "test", "otp"].includes(cmd ?? "")) { console.log("Buyruq: login | test <telefon> | otp <telefon>"); process.exit(1); }
  const token = await login();
  const me = await fetch(`${BASE}/auth/user`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => null);
  if (me) console.log("Hisob ma'lumoti:", JSON.stringify(me?.data ?? me).replace(/"password":"[^"]*"/, '"password":"***"').slice(0, 400));
  const lim = await fetch(`${BASE}/user/get-limit`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => null);
  if (lim) console.log("Balans/limit:", JSON.stringify(lim).slice(0, 200));
  if (cmd === "login") return;

  const digits = (phoneArg ?? "").replace(/\D/g, "");
  if (!/^998\d{9}$/.test(digits)) { console.error("XATO: telefonni +998XXXXXXXXX ko'rinishida yozing."); process.exit(1); }
  const message = cmd === "test" ? "Bu Eskiz dan test" : otpText("123456");
  console.log(`Yuborilmoqda -> ${digits.slice(0, 5)}*******, matn: "${message}", from: ${process.env.ESKIZ_FROM || "4546"}`);
  const r = await fetch(`${BASE}/message/sms/send`, {
    method: "POST", headers: { Authorization: `Bearer ${token}` },
    body: new URLSearchParams({ mobile_phone: digits, message, from: process.env.ESKIZ_FROM || "4546" }),
  });
  const text = await r.text();
  console.log(`Eskiz javobi: HTTP ${r.status} ${text.slice(0, 400)}`);
  console.log(r.ok ? "Qabul qilindi. Telefoningizga SMS kelganini tekshiring (1–2 daqiqa)." : "RAD ETILDI. Yuqoridagi sababni menga yuboring.");
}
main().catch((e) => { console.error("Tarmoq xatosi:", e instanceof Error ? e.message : e); process.exit(1); });
