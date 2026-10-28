"use client";
import { safeNext } from "@/lib/validation";
import { useState } from "react";
import { useT, useLocale } from "./I18nProvider";

const inp = "w-full rounded border border-slate-300 px-3 py-2.5";
const btn = "w-full rounded bg-brand text-white py-2.5 font-medium disabled:opacity-60";
const goNext = () => { const n = new URLSearchParams(location.search).get("next"); location.href = safeNext(n, location.origin); };

export default function LoginForm({ methods }: { methods: { telegram: boolean; phone: boolean; test?: boolean; guest?: boolean } }) {
  const t = useT();
  const locale = useLocale();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function call(url: string, body?: object) {
    setBusy(true); setErr(null);
    try { const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); return { ok: r.ok, data: await r.json().catch(() => ({})) }; }
    catch { setErr(t("login.net")); return null; }
    finally { setBusy(false); }
  }
  if (methods.guest) return <div className="space-y-4">
    <p className="text-sm">{locale === "ru" ? "В период запуска можно бесплатно размещать объявления без SMS и пароля." : "Reklama davrida SMS va parolsiz bepul e’lon joylashingiz mumkin."}</p>
    <button disabled={busy} className={btn} onClick={async () => {
      const r = await call("/api/auth/guest");
      if (!r) return;
      if (!r.ok) return setErr(r.data.error ?? t("err.generic"));
      const next = new URLSearchParams(location.search).get("next");
      location.href = next ? safeNext(next, location.origin) : "/kabinet";
    }}>{locale === "ru" ? "Продолжить без SMS" : "SMSsiz davom etish"}</button>
    <p className="text-xs text-slate-500">{locale === "ru" ? "Объявления и уведомления сохраняются в вашем кабинете в этом браузере. Не очищайте данные сайта." : "E’lonlar va bildirishnomalar shu brauzerdagi kabinetingizda saqlanadi. Sayt ma’lumotlarini tozalamang."}</p>
    {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
  </div>;
  if (!methods.telegram && !methods.phone) return <p role="alert" className="rounded border border-amber-400 bg-amber-50 p-3 text-sm">{t("login.none")}</p>;
  return (
    <div className="space-y-6">
      {methods.test && <div className="space-y-3 rounded border border-amber-300 bg-amber-50 p-4">
        <p className="font-semibold">{locale === "ru" ? "Тестовые аккаунты" : "Tayyor test hisoblari"}</p>
        <p className="text-sm">{locale === "ru" ? "Вход без SMS и пароля. Изменения сохраняются." : "SMS va parolsiz kiring. O‘zgarishlar saqlanadi."}</p>
        {(["user"] as const).map(account => <button key={account} type="button" disabled={busy} className={btn} onClick={async () => {
          const r = await call("/api/auth/test-login", { account });
          if (!r) return;
          if (!r.ok) return setErr(r.data.error ?? t("err.generic"));
          const next = new URLSearchParams(location.search).get("next");
          location.href = next ? safeNext(next, location.origin) : r.data.next;
        }}>{locale === "ru" ? "Войти как пользователь" : "Foydalanuvchi sifatida kirish"}</button>)}
      </div>}
      {methods.telegram && <TelegramLogin call={call} busy={busy} err={err} setErr={setErr} />}
      {methods.telegram && methods.phone && <p className="text-center text-sm text-slate-500">{t("login.or")}</p>}
      {methods.phone && <PhoneLogin call={call} busy={busy} err={err} setErr={setErr} />}
    </div>
  );
}
type P = { call: (u: string, b?: object) => Promise<{ ok: boolean; data: any } | null>; busy: boolean; err: string | null; setErr: (e: string | null) => void };

function TelegramLogin({ call, busy, err, setErr }: P) {
  const t = useT(); const [token, setToken] = useState<string | null>(null); const [url, setUrl] = useState(""); const [code, setCode] = useState("");
  const [mine, setMine] = useState(false); // xato faqat shu blokka tegishlimi
  if (!token) return (
    <div className="space-y-3">
      <button disabled={busy} className={btn} onClick={async () => { setMine(true); const r = await call("/api/auth/telegram/start"); if (!r) return; if (!r.ok) return setErr(r.data.error ?? t("err.generic")); setToken(r.data.token); setUrl(r.data.botUrl); }}>{t("login.tg.btn")}</button>
      {mine && err && <p role="alert" className="text-sm text-red-700">{err}</p>}
    </div>
  );
  return (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await call("/api/auth/telegram/verify", { token, code }); if (!r) return; if (!r.ok) return setErr(r.data.error ?? t("err.generic")); goNext(); }}>
      <p className="text-sm text-slate-700">{t("login.tg.steps")}</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="block rounded border border-brand py-2.5 text-center font-medium text-brand">{t("login.tg.open")}</a>
      <label className="block text-sm">{t("login.code.label")}<input className={inp} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} autoComplete="one-time-code" /></label>
      <p className="text-xs text-slate-500">{t("login.tg.warn")}</p>
      {mine && err && <p role="alert" className="text-sm text-red-700">{err}</p>}
      <button disabled={busy} className={btn}>{t("login.submit")}</button>
      <button type="button" className="text-sm text-brand underline" onClick={() => { setToken(null); setCode(""); setErr(null); }}>{t("login.tg.restart")}</button>
    </form>
  );
}

function PhoneLogin({ call, busy, err, setErr }: P) {
  const t = useT(); const [step, setStep] = useState<"phone" | "code">("phone"); const [phone, setPhone] = useState("+998"); const [code, setCode] = useState(""); const [dev, setDev] = useState<string | null>(null);
  return step === "phone" ? (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await call("/api/auth/request-otp", { phone }); if (!r) return; if (!r.ok) return setErr(r.data.error ?? t("err.generic")); setDev(r.data.devMode ? r.data.devCode : null); setStep("code"); }}>
      <label className="block text-sm">{t("login.phone.label")}<input className={inp} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" /></label>
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
      <button disabled={busy} className={btn}>{t("login.phone.get")}</button>
    </form>
  ) : (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await call("/api/auth/verify-otp", { phone, code }); if (!r) return; if (!r.ok) return setErr(r.data.error ?? t("err.generic")); goNext(); }}>
      {dev && <p className="rounded bg-amber-50 border border-amber-300 p-2 text-sm">{t("login.dev", { code: dev })}</p>}
      <label className="block text-sm">{t("login.code.label")}<input className={inp} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} autoComplete="one-time-code" /></label>
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
      <button disabled={busy} className={btn}>{t("login.submit")}</button>
      <button type="button" className="text-sm text-brand underline" onClick={() => { setStep("phone"); setErr(null); }}>{t("login.change")}</button>
    </form>
  );
}
