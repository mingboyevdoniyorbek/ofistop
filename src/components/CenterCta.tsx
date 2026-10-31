import Link from "next/link";
import { getT } from "@/lib/i18n";
import { siteInfo } from "@/lib/site-info";

/** "Biznes markazingiz bormi?" chaqirig'i: ariza formasi va (sozlangan bo'lsa) admin Telegram'i. */
export default async function CenterCta({ variant = "banner" }: { variant?: "banner" | "compact" }) {
  const { locale } = await getT(); const ru = locale === "ru";
  const tg = siteInfo().telegram;
  const title = ru ? "У вас есть бизнес-центр?" : "Biznes markazingiz bormi?";
  const text = ru ? "Разместите свободные помещения бесплатно — страница центра, список комнат и прямая связь с арендаторами."
    : "Bo‘sh xonalaringizni bepul joylang — markaz sahifasi, xonalar ro‘yxati va ijarachilar bilan to‘g‘ridan-to‘g‘ri aloqa.";
  const apply = <Link href="/markazlar/ariza" className="rounded-xl bg-accent px-5 py-3 text-center font-semibold text-white hover:bg-green-700">{ru ? "Оставить заявку" : "Ariza qoldirish"}</Link>;
  const write = tg && <a href={`https://t.me/${tg}`} target="_blank" rel="noopener" className="rounded-xl border border-current px-5 py-3 text-center font-semibold">{ru ? "Написать в Telegram" : "Telegram orqali yozish"}</a>;
  if (variant === "compact") return (
    <div className="rounded-2xl border border-brand/20 bg-blue-50 p-4 text-sm text-brand-dark sm:flex sm:items-center sm:justify-between sm:gap-4">
      <p><strong>🏢 {title}</strong> {text}</p>
      <div className="mt-3 flex shrink-0 flex-wrap gap-2 text-brand sm:mt-0">{apply}{write}</div>
    </div>
  );
  return (
    <section className="rounded-3xl bg-gradient-to-r from-brand to-brand-dark p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
      <div>
        <h2 className="text-2xl font-bold">🏢 {title}</h2>
        <p className="mt-2 max-w-2xl text-blue-100">{text}</p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-blue-100">
          <li>✓ {ru ? "Бесплатно" : "Bepul"}</li><li>✓ {ru ? "Отметка «Проверенный центр»" : "«Tasdiqlangan markaz» belgisi"}</li><li>✓ {ru ? "Статистика просмотров и звонков" : "Ko‘rishlar va qo‘ng‘iroqlar statistikasi"}</li>
        </ul>
      </div>
      <div className="mt-5 flex shrink-0 flex-col gap-2 sm:mt-0">{apply}{write}</div>
    </section>
  );
}
