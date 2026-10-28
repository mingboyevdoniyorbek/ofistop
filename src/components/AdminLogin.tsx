"use client";
import { useState } from "react";
import { useLocale } from "./I18nProvider";

export default function AdminLogin() {
  const ru = useLocale() === "ru";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className="mx-auto max-w-sm px-4 py-12">
    <h1 className="mb-6 text-xl font-bold">{ru ? "Вход администратора" : "Admin panelga kirish"}</h1>
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      const form = new FormData(event.currentTarget);
      try {
        const response = await fetch("/api/auth/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login: form.get("login"), password: form.get("password") }) });
        const data = await response.json();
        if (!response.ok) { setError(data.error); return; }
        location.href = "/admin";
      } catch { setError(ru ? "Ошибка сети" : "Tarmoq xatosi"); }
      finally { setBusy(false); }
    }}>
      <label className="block text-sm">Login<input name="login" autoComplete="username" required maxLength={100} className="mt-1 w-full rounded border px-3 py-2" /></label>
      <label className="block text-sm">{ru ? "Пароль" : "Parol"}<input name="password" type="password" autoComplete="current-password" required maxLength={200} className="mt-1 w-full rounded border px-3 py-2" /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-brand py-2.5 text-white disabled:opacity-50">{ru ? "Войти" : "Kirish"}</button>
    </form>
  </div>;
}
