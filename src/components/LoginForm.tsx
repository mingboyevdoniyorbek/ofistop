"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "./I18nProvider";
import { safeNext } from "@/lib/validation";

type Methods = { google: boolean; telegram: boolean; test?: boolean };
type View = "choose" | "telegram" | "phone";
type Pending = { id: string; mode: "telegram" | "telegram_code"; expiresAt: string; botUrl?: string };
const input = "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-brand focus:bg-white";
const primary = "flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-brand px-5 py-4 font-semibold text-white shadow-lg shadow-blue-900/10 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 font-semibold text-slate-800 transition hover:border-brand hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
function Icon({ kind }: { kind: "google" | "telegram" }) {
  if (kind === "google") return <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-2xl font-bold text-blue-600">G</span>;
  return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{<><path d="m21 3-7 18-4-7-7-4 18-7Z"/><path d="m10 14 6-6"/></>}</svg>;
}
const storageKey = "ofistop-login";
function nextPath() { return safeNext(new URLSearchParams(location.search).get("next") ?? "/kabinet", location.origin); }

export default function LoginForm({ methods }: { methods: Methods }) {
  const locale = useLocale(); const ru = locale === "ru";
  const tr = (uz: string, russian: string) => ru ? russian : uz;
  const [view, setView] = useState<View>("choose");
  const [pending, setPending] = useState<Pending | null>(null);
  const [phone, setPhone] = useState("+998"); const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [seconds, setSeconds] = useState(600);
  const completed = useRef(false); const busyRef = useRef(false);
  const remember = (value: Pending | null) => { setPending(value); try { if (value) sessionStorage.setItem(storageKey, JSON.stringify(value)); else sessionStorage.removeItem(storageKey); } catch {} };
  useEffect(() => {
    if (new URLSearchParams(location.search).has("error")) setError(ru ? "Не удалось войти через Google. Попробуйте ещё раз." : "Google orqali kirib bo‘lmadi. Qayta urinib ko‘ring.");
    try { const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null"); if (saved && /^[0-9a-f-]{36}$/.test(saved.id) && ["telegram", "telegram_code"].includes(saved.mode) && Date.parse(saved.expiresAt) > Date.now()) { setPending(saved); } } catch {}
  }, []);
  const finish = (path: string) => { completed.current = true; remember(null); location.assign(safeNext(path, location.origin)); };

  useEffect(() => {
    if (!pending) return;
    let stopped = false; let timer: ReturnType<typeof setTimeout>;
    const tick = () => setSeconds(Math.max(0, Math.ceil((Date.parse(pending.expiresAt) - Date.now()) / 1000)));
    tick(); const interval = setInterval(tick, 1000);
    async function poll() {
      if (stopped || completed.current) return;
      if (Date.parse(pending!.expiresAt) <= Date.now()) { setError(ru ? "Время истекло. Начните заново." : "Tasdiqlash muddati tugadi. Qaytadan boshlang."); return; }
      if (pending!.mode !== "telegram_code" && !busyRef.current && document.visibilityState !== "hidden") {
        try {
          const res = await fetch("/api/auth/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pending!.id }) });
          const data = await res.json();
          if (stopped || completed.current) return;
          if (res.ok && data.status === "complete") { finish(data.next); return; }
          if ([403, 410, 429].includes(res.status)) { setError(data.error); return; }
        } catch { /* Retry transient network failures without losing entered text. */ }
      }
      timer = setTimeout(poll, 3000);
    }
    timer = setTimeout(poll, 1500);
    return () => { stopped = true; clearTimeout(timer); clearInterval(interval); };
  }, [pending, ru]);

  async function call(url: string, body: object) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { if (!completed.current) setError(data.error ?? tr("Amal bajarilmadi", "Не удалось выполнить действие")); return; }
      return data;
    } catch { setError(tr("Internet aloqasini tekshirib, qayta urinib ko‘ring.", "Проверьте интернет и попробуйте снова.")); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function start(mode: Pending["mode"]) {
    const data = await call("/api/auth/telegram/start", { next: nextPath(), ...(mode === "telegram_code" ? { phone } : {}) });
    if (data) {
      setCode(""); remember({ id: data.id, mode, expiresAt: data.expiresAt, botUrl: data.botUrl });
      if (mode === "telegram" && /^https:\/\/t\.me\//.test(data.botUrl)) location.assign(data.botUrl);
    }
  }
  async function startGoogle() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError("");
    try {
      const res = await fetch(`/api/auth/google/start?next=${encodeURIComponent(nextPath())}`, { headers: { Accept: "application/json" }, cache: "no-store" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? tr("Kirish vaqtincha ishlamayapti. Qayta urinib ko‘ring.", "Вход временно недоступен. Попробуйте снова.")); return; }
      const url = new URL(data.url);
      if (url.origin !== "https://accounts.google.com") throw new Error("Invalid provider URL");
      location.assign(url.href);
    } catch { setError(tr("Google bilan ulanish amalga oshmadi. Qayta urinib ko‘ring.", "Не удалось подключиться к Google. Попробуйте снова.")); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function back() { remember(null); setView("choose"); setError(""); setCode(""); }
  const title = pending ? pending.mode === "telegram_code" ? tr("Kodni kiriting", "Введите код") : tr("Telegram’da tasdiqlang", "Подтвердите в Telegram") : view === "phone" ? tr("Telegram’dan kod olish", "Код в Telegram") : view === "telegram" ? tr("Telegram orqali kirish", "Вход через Telegram") : tr("OfisTop platformasiga xush kelibsiz", "Добро пожаловать в OfisTop");
  return <section className="relative mx-auto w-full max-w-md rounded-3xl bg-white px-5 py-8 sm:border sm:border-slate-100 sm:px-9 sm:py-10 sm:shadow-xl sm:shadow-slate-200/40">
    {(view !== "choose" || pending) && <button type="button" onClick={back} disabled={busy} aria-label={tr("Orqaga", "Назад")} className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-600 hover:bg-slate-100">←</button>}
    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand text-3xl font-bold text-white shadow-lg shadow-blue-900/15" aria-hidden="true">O<span className="text-green-300">T</span></div>
    <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
    {!pending && view === "choose" && <p className="mt-3 text-center leading-relaxed text-slate-500">{tr("Joyingizni toping yoki e’lon joylang. Kirish usulini tanlang.", "Найдите помещение или разместите объявление. Выберите способ входа.")}</p>}
    <div className="mt-8 space-y-4">
      {!pending && view === "choose" && <>
        <button className={primary} disabled={!methods.google || busy} onClick={() => void startGoogle()}><Icon kind="google"/>{tr("Google orqali kirish", "Войти через Google")}</button>
        <button className={secondary} disabled={!methods.telegram || busy} onClick={() => { setView("telegram"); setError(""); }}><span className="text-sky-500"><Icon kind="telegram"/></span>{tr("Telegram orqali kirish", "Войти через Telegram")}</button>
        {(!methods.google || !methods.telegram) && <p className="text-center text-xs leading-relaxed text-slate-500">{tr("Xira tugmalar hali sozlanmoqda. Faol usul orqali kirishingiz mumkin.", "Неактивные способы пока настраиваются. Выберите доступный способ.")}</p>}
      </>}
      {!pending && view === "telegram" && <>
        <p className="text-center text-sm leading-relaxed text-slate-500">{tr("Botni ochib Start bosing. Kontaktingizni ulashing yoki “Ha, kirish” bilan tasdiqlang — sayt avtomatik davom etadi.", "Откройте бота и нажмите Start. Поделитесь контактом или нажмите «Да, войти» — сайт продолжит автоматически.")}</p>
        <button className={primary} disabled={busy} onClick={() => void start("telegram")}><Icon kind="telegram"/>{busy ? tr("Tayyorlanmoqda…", "Подготовка…") : tr("Telegram orqali kirish", "Войти через Telegram")}</button>
        <button className={secondary} disabled={busy} onClick={() => setView("phone")}>{tr("yoki kod bilan", "или по коду")}</button>
      </>}
      {!pending && view === "phone" && <form className="space-y-5" onSubmit={e => { e.preventDefault(); void start("telegram_code"); }}>
        <p className="text-center text-sm leading-relaxed text-slate-500">{tr("Botda kontaktingizni ulashgan raqamni kiriting. Kod SMSga emas, Telegram botga boradi.", "Введите номер, которым поделились с ботом. Код придёт в Telegram, не по SMS.")}</p>
        <label className="block text-sm font-medium">{tr("Telefon raqami", "Номер телефона")}<input type="tel" required maxLength={30} autoComplete="tel" autoFocus value={phone} onChange={e => setPhone(e.target.value)} className={input} placeholder="+998 90 123 45 67" disabled={busy}/></label>
        <button className={primary} disabled={busy}>{busy ? tr("Yuborilmoqda…", "Отправляем…") : tr("Kodni yuborish", "Отправить код")}</button>
      </form>}
      {pending && <>
        <p className="text-center text-sm leading-relaxed text-slate-500">{pending.mode === "telegram_code" ? tr("Raqam botga ulangan bo‘lsa, kod yuborildi. Birinchi marta bo‘lsa botni oching, Start bosing va kontaktni ulashing. Keyin yangi kod so‘rang.", "Если номер подключён к боту, код отправлен. Впервые? Откройте бота, нажмите Start, поделитесь контактом и запросите новый код.") : tr("Botni oching va kirishni tasdiqlang. So‘ng shu oynaga qayting.", "Откройте бота и подтвердите вход. Затем вернитесь в это окно.")}</p>
        {pending.botUrl && /^https:\/\/t\.me\//.test(pending.botUrl) && <a href={pending.botUrl} target="_blank" rel="noopener noreferrer" className={primary}><Icon kind="telegram"/>{tr("Telegram botni ochish", "Открыть бота")}</a>}
        {pending.mode !== "telegram" && <form className="space-y-4" onSubmit={async e => { e.preventDefault(); const data = await call("/api/auth/status", { id: pending.id, code }); if (data?.status === "complete") finish(data.next); }}>
          <label className="block text-sm font-medium">{tr("Tasdiqlash kodi", "Код подтверждения")}<input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required maxLength={6} className={`${input} text-center text-2xl tracking-[0.4em]`} placeholder="000000" disabled={busy}/></label>
          <button className={primary} disabled={busy || seconds <= 0}>{busy ? tr("Tekshirilmoqda…", "Проверяем…") : tr("Tasdiqlash va kirish", "Подтвердить и войти")}</button>
        </form>}
        <p role="status" className="text-center text-xs text-slate-500">{tr("Tasdiqlash uchun qolgan vaqt", "Осталось времени")}: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>
        <button type="button" className="block w-full text-center text-sm font-medium text-brand underline underline-offset-4" disabled={busy} onClick={() => { const mode = pending.mode; remember(null); setError(""); setView(mode === "telegram_code" ? "phone" : "telegram"); }}>{tr("Qayta yuborish yoki o‘zgartirish", "Отправить снова или изменить")}</button>
      </>}
      {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
    <p className="mt-8 text-center text-xs leading-6 text-slate-500">{tr("Davom etish orqali siz", "Продолжая, вы принимаете")} <Link href="/shartlar" className="text-brand underline">{tr("Foydalanish shartlari", "Условия использования")}</Link> {tr("va", "и")} <Link href="/maxfiylik" className="text-brand underline">{tr("Maxfiylik siyosati", "Политику конфиденциальности")}</Link>{tr("ga rozilik bildirasiz.", ".")}</p>
    {methods.test && <details className="mt-6 border-t border-slate-100 pt-4 text-sm text-slate-500"><summary className="cursor-pointer">{tr("Mahalliy test", "Локальный тест")}</summary><button className={`${secondary} mt-3`} disabled={busy} onClick={async () => { const data = await call("/api/auth/test-login", { account: "user" }); if (data) finish(nextPath()); }}>{tr("Sinov hisobida kirish", "Войти в тестовый аккаунт")}</button></details>}
  </section>;
}
