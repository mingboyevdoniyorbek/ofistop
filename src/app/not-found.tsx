import Link from "next/link";
import { getT } from "@/lib/i18n";

export const metadata = { title: "404", robots: { index: false } };
export default async function NotFound() {
  const { locale } = await getT(); const ru = locale === "ru";
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.webp" alt="OfisTop" width={96} height={96} className="h-24 w-24" />
      <p className="mt-4 text-6xl font-bold text-brand">404</p>
      <h1 className="mt-2 text-xl font-semibold">{ru ? "Страница не найдена" : "Sahifa topilmadi"}</h1>
      <p className="mt-2 text-slate-600">{ru ? "Возможно, объявление снято с публикации или ссылка устарела." : "E’lon olib tashlangan yoki havola eskirgan bo‘lishi mumkin."}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-xl bg-brand px-5 py-3 font-semibold text-white">{ru ? "На главную" : "Bosh sahifaga qaytish"}</Link>
        <Link href="/joylar" className="rounded-xl border border-brand px-5 py-3 font-semibold text-brand">{ru ? "Искать помещения" : "Joy qidirish"}</Link>
      </div>
    </div>
  );
}
