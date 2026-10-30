"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/components/I18nProvider";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const ru = useLocale() === "ru";
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.webp" alt="OfisTop" width={80} height={80} className="h-20 w-20" />
      <h1 className="mt-4 text-xl font-semibold">{ru ? "Что-то пошло не так" : "Nimadir noto‘g‘ri ketdi"}</h1>
      <p className="mt-2 text-slate-600">{ru ? "Попробуйте ещё раз через несколько секунд." : "Bir necha soniyadan keyin qayta urinib ko‘ring."}</p>
      {error.digest && <p className="mt-1 text-xs text-slate-400">{ru ? "Код ошибки" : "Xato kodi"}: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="rounded-xl bg-brand px-5 py-3 font-semibold text-white">{ru ? "Повторить" : "Qayta urinish"}</button>
        <Link href="/" className="rounded-xl border border-brand px-5 py-3 font-semibold text-brand">{ru ? "На главную" : "Bosh sahifa"}</Link>
      </div>
    </div>
  );
}
