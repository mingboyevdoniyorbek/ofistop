import Link from "next/link";
import { getAdminUser } from "@/lib/auth";
import AdminLogin from "@/components/AdminLogin";
import { getT } from "@/lib/i18n";
import { adminDashboard } from "@/lib/admin-dashboard";
import { priceLabel } from "@/lib/format";
import AreaChart from "@/components/admin/AreaChart";
import DonutChart from "@/components/admin/DonutChart";
import { visitStats } from "@/lib/site-visits";

export const dynamic = "force-dynamic";

// Audit amallarining odamga tushunarli nomi va belgi rangi.
const ACTIONS: Record<string, [string, string, string]> = {
  "listing.approve": ["E’lon tasdiqlandi", "Объявление одобрено", "bg-[#1baf7a]"],
  "listing.reject": ["E’lon rad etildi", "Объявление отклонено", "bg-[#eb6834]"],
  "listing.hide": ["E’lon saytdan olindi", "Объявление снято", "bg-[#eb6834]"],
  "center_application.create": ["Yangi markaz arizasi", "Новая заявка центра", "bg-[#2a78d6]"],
  "center_application.claim": ["Markaz boshqaruvi so‘raldi", "Запрос управления центром", "bg-[#2a78d6]"],
  "center_application.approve": ["Markaz arizasi tasdiqlandi", "Заявка центра одобрена", "bg-[#1baf7a]"],
  "center_application.reject": ["Markaz arizasi rad etildi", "Заявка центра отклонена", "bg-[#eb6834]"],
  "center.submit_changes": ["Vakil markazni o‘zgartirdi", "Представитель изменил центр", "bg-[#eda100]"],
  "center.approve_changes": ["Markaz o‘zgarishi tasdiqlandi", "Изменения центра одобрены", "bg-[#1baf7a]"],
  "center.delete": ["Markaz o‘chirildi", "Центр удалён", "bg-[#eb6834]"],
  "center.create": ["Markaz yaratildi", "Центр создан", "bg-[#2a78d6]"],
  "admin.login": ["Adminga kirildi", "Вход в админку", "bg-slate-400"],
  "service_request.create": ["Yangi xizmat arizasi", "Новая заявка на услугу", "bg-[#16a34a]"],
  "listing.feature": ["E’lon VIP’ga chiqarildi", "Объявление поднято в VIP", "bg-[#f59e0b]"],
  "furniture_firm.create": ["Yangi mebel firmasi arizasi", "Новая заявка мебельной компании", "bg-[#b45309]"],
  "furniture_firm.approve": ["Mebel firmasi tasdiqlandi", "Мебельная компания одобрена", "bg-[#1baf7a]"],
  "furniture_firm.reject": ["Mebel arizasi rad etildi", "Заявка мебели отклонена", "bg-[#eb6834]"],
  "furniture_firm.remove": ["Mebel firmasi o‘chirildi", "Мебельная компания удалена", "bg-[#eb6834]"],
};

export default async function AdminHome() {
  const u = await getAdminUser();
  if (!u) return <AdminLogin />;
  const { locale } = await getT(); const ru = locale === "ru";
  const [{ k, days, recent, pendingRows }, v] = await Promise.all([adminDashboard(locale), visitStats()]);
  const views30 = days.reduce((n, d) => n + d.views, 0), created30 = days.reduce((n, d) => n + d.created, 0);
  const total = k.active + k.pending + k.drafts + k.inactive;
  const ago = (d: Date) => { const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
    return m < 60 ? `${Math.max(1, m)} ${ru ? "мин назад" : "daqiqa oldin"}` : m < 1440 ? `${Math.round(m / 60)} ${ru ? "ч назад" : "soat oldin"}` : `${Math.round(m / 1440)} ${ru ? "дн. назад" : "kun oldin"}`; };
  const delta = v.totals.today - v.totals.yesterday;
  const action = [
    { label: ru ? "На проверке" : "Tekshiruvdagi e’lonlar", value: k.pending, href: "/admin/elonlar?holat=pending", cls: "from-[#12308a] to-[#2a78d6]" },
    { label: ru ? "Заявки центров" : "Markaz arizalari", value: k.apps, href: "/admin/arizalar", cls: "from-[#4338ca] to-[#7c3aed]" },
    { label: ru ? "Заявки «Сдадим за вас»" : "Ijaraga berish xizmati", value: k.service_new, href: "/admin/xizmat", cls: "from-[#166534] to-[#16a34a]" },
    { label: ru ? "Мебельные компании" : "Mebel arizalari", value: k.furniture_pending, href: "/admin/mebel", cls: "from-[#9a3412] to-[#f59e0b]" },
    { label: ru ? "Открытые жалобы" : "Ochiq shikoyatlar", value: k.reports, href: "/admin/shikoyatlar", cls: "from-[#0e7490] to-[#0ea5e9]" },
    { label: ru ? "Изменения центров" : "Markaz o‘zgarishlari", value: k.center_edits, href: "/admin/markazlar?holat=kutilmoqda", cls: "from-[#0f766e] to-[#14b8a6]" },
  ];
  const mini = [
    { label: ru ? "Пользователи" : "Foydalanuvchilar", value: k.users, sub: `+${k.users_30} ${ru ? "за 30 дн." : "30 kunda"}`, color: "bg-[#2a78d6]", icon: "👤" },
    { label: ru ? "Звонки (30 дн.)" : "Qo‘ng‘iroqlar (30 kun)", value: k.calls_30, sub: `Telegram: ${k.tg_30}`, color: "bg-[#1baf7a]", icon: "📞" },
    { label: ru ? "В избранном (30 дн.)" : "Saqlanganlar (30 kun)", value: k.favs_30, sub: `${ru ? "сохр. поиски" : "saqlangan qidiruv"}: ${k.saved_searches}`, color: "bg-[#eb6834]", icon: "♥" },
    { label: ru ? "Просмотры объявлений" : "E’lon ko‘rishlari", value: views30, sub: ru ? "за 30 дней" : "30 kunda", color: "bg-[#7c3aed]", icon: "👁" },
    { label: ru ? "Бизнес-центры" : "Biznes markazlar", value: k.centers, sub: ru ? "на сайте" : "saytda", color: "bg-[#eda100]", icon: "🏢" },
    { label: ru ? "Мебельные компании" : "Mebel firmalari", value: k.furniture, sub: k.furniture_pending ? `${k.furniture_pending} ${ru ? "ждут" : "kutmoqda"}` : (ru ? "одобрено" : "tasdiqlangan"), color: "bg-[#b45309]", icon: "🛋" },
  ];
  const SOURCE: Record<string, [string, string]> = { instagram: ["Instagram", "#d62976"], telegram: ["Telegram", "#229ed9"], google: ["Google", "#4285f4"], yandex: ["Yandex", "#fc3f1d"], facebook: ["Facebook", "#1877f2"], olx: ["OLX", "#23e5db"], direct: [ru ? "Прямой заход" : "To‘g‘ridan-to‘g‘ri", "#64748b"], other: [ru ? "Другие сайты" : "Boshqa saytlar", "#94a3b8"] };
  const SECTION: Record<string, string> = ru
    ? { home: "Главная", catalog: "Каталог", listing: "Объявления", landing: "Подборки", centers: "Бизнес-центры", center: "Страницы центров", furniture: "Мебель", service: "Услуга «Сдадим за вас»", cabinet: "Кабинет", other: "Прочее" }
    : { home: "Bosh sahifa", catalog: "Katalog", listing: "E’lon sahifalari", landing: "Turkum sahifalari", centers: "Markazlar ro‘yxati", center: "Markaz sahifalari", furniture: "Mebel", service: "Ijaraga berish xizmati", cabinet: "Kabinet", other: "Boshqa" };
  const bars = (rows: { key: string; n: number }[], name: (k: string) => string, color: (k: string) => string) => {
    const sum = rows.reduce((n, r) => n + r.n, 0) || 1;
    return rows.length === 0 ? <p className="text-sm text-slate-500">{ru ? "Данных пока нет." : "Hozircha ma’lumot yo‘q."}</p> : (
      <ul className="space-y-2.5">{rows.map((r) => { const pct = Math.round((r.n / sum) * 100); return (
        <li key={r.key} className="text-sm"><div className="flex justify-between gap-2"><span className="truncate text-slate-700">{name(r.key)}</span><span className="shrink-0 font-semibold text-slate-900">{r.n} <span className="font-normal text-slate-400">· {pct}%</span></span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, background: color(r.key) }} /></div></li>); })}</ul>);
  };
  const mobile = v.devices.find((d) => d.key === "mobile")?.n ?? 0, desktop = v.devices.find((d) => d.key === "desktop")?.n ?? 0;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* 1. Saytga tashriflar — eng muhim ko'rsatkich */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h2 className="font-semibold">{ru ? "Посещаемость сайта" : "Saytga tashriflar"}</h2><p className="text-xs text-slate-500">{ru ? "Уникальные посетители по дням · последние 30 дней" : "Noyob tashrif buyuruvchilar, kunlik · oxirgi 30 kun"}</p></div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{ru ? "Без ботов и админки" : "Botlar va admin hisobga olinmaydi"}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { l: ru ? "Сегодня" : "Bugun", n: v.totals.today, s: `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)} ${ru ? "к вчера" : "kechagiga nisbatan"}`, c: delta >= 0 ? "text-green-700" : "text-red-700" },
              { l: ru ? "За 7 дней" : "7 kunda", n: v.totals.week, s: ru ? "уникальных" : "noyob", c: "text-slate-500" },
              { l: ru ? "За 30 дней" : "30 kunda", n: v.totals.month, s: `${ru ? "вернулись" : "qaytganlar"}: ${v.totals.returning}`, c: "text-slate-500" },
              { l: ru ? "Просмотры страниц" : "Sahifa ko‘rishlari", n: v.totals.views, s: ru ? "за 30 дней" : "30 kunda", c: "text-slate-500" },
            ].map((x) => <div key={x.l} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{x.l}</p><p className="text-2xl font-bold text-slate-900">{x.n}</p><p className={`truncate text-[11px] ${x.c}`}>{x.s}</p></div>)}
          </div>
          <div className="mt-4"><AreaChart data={v.days.map((d) => ({ day: d.day, value: d.visitors }))} label={ru ? "Посетители" : "Tashrif buyuruvchilar"} unit={ru ? "посетителей" : "kishi"} /></div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">{ru ? "Откуда приходят" : "Qayerdan kelishmoqda"}</h2>
          <p className="mb-4 text-xs text-slate-500">{ru ? "Источник первого захода за день · 30 дней" : "Kunlik birinchi kirish manbasi · 30 kun"}</p>
          {bars(v.sources, (k2) => SOURCE[k2]?.[0] ?? k2, (k2) => SOURCE[k2]?.[1] ?? "#94a3b8")}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{ru ? "Устройства" : "Qurilmalar"}</p>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">{mobile + desktop > 0 && <><div className="bg-[#2a78d6]" style={{ width: `${(mobile / (mobile + desktop)) * 100}%` }} /><div className="bg-[#1baf7a]" style={{ width: `${(desktop / (mobile + desktop)) * 100}%` }} /></>}</div>
            <div className="mt-2 flex justify-between text-xs text-slate-600"><span>📱 {ru ? "Телефон" : "Telefon"}: {mobile}</span><span>💻 {ru ? "Компьютер" : "Kompyuter"}: {desktop}</span></div>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-400">{ru ? "Совет: в рекламе добавляйте к ссылке ?utm_source=instagram — так переходы будут видны точно." : "Maslahat: reklamada havolaga ?utm_source=instagram qo‘shing — o‘tishlar aniq ko‘rinadi."}</p>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {action.map((a) => <Link key={a.label} href={a.href} className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${a.cls} p-5 text-white shadow-sm transition hover:shadow-lg`}>
          <p className="text-sm text-white/85">{a.label}</p>
          <p className="mt-6 text-4xl font-bold">{a.value}</p>
          <p className="mt-1 text-xs text-white/80">{a.value ? (ru ? "Требует внимания →" : "Ko‘rib chiqish kerak →") : (ru ? "Всё проверено ✓" : "Hammasi ko‘rib chiqilgan ✓")}</p>
          <svg aria-hidden="true" viewBox="0 0 120 60" className="absolute -bottom-2 right-0 h-16 w-32 opacity-25"><path d="M0 50 C20 20 35 45 55 25 S90 10 120 30 V60 H0Z" fill="#fff" /></svg>
        </Link>)}
      </div>

      {/* 2. Kontent: e'lonlar, holatlar, asosiy ko'rsatkichlar */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h2 className="font-semibold">{ru ? "Объявления" : "E’lonlar"}</h2><p className="text-xs text-slate-500">{ru ? "Новые объявления по дням · 30 дней" : "Yangi e’lonlar, kunlik · 30 kun"}</p></div>
            <Link href="/admin/elonlar?holat=pending" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">{ru ? "Проверить объявления" : "E’lonlarni tekshirish"}</Link>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-[180px_1fr]">
            <div className="space-y-4">
              <div><p className="text-3xl font-bold text-slate-900">{k.active}</p><p className="text-xs text-slate-500">{ru ? "Активных объявлений" : "Faol e’lonlar"}{k.sale_active ? ` · ${ru ? "продажа" : "sotuv"}: ${k.sale_active}` : ""}{k.top_active ? ` · VIP: ${k.top_active}` : ""}</p></div>
              <div><p className="text-xl font-bold text-slate-900">+{created30} <span className="text-sm font-normal text-slate-500">· {ru ? "сегодня" : "bugun"} +{k.new_today}</span></p><p className="text-xs text-slate-500">{ru ? "Новых за 30 дней" : "30 kunda yangi"}</p></div>
            </div>
            <AreaChart data={days.map((d) => ({ day: d.day, value: d.created }))} label={ru ? "Новые объявления" : "Yangi e’lonlar"} unit={ru ? "объявл." : "ta e’lon"} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 md:grid-cols-3">
            {mini.map((m) => <div key={m.label} className="flex items-center gap-3">
              <span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-base text-white ${m.color}`}>{m.icon}</span>
              <div className="min-w-0"><p className="text-xs leading-tight text-slate-500">{m.label}</p><p className="font-bold text-slate-900">{m.value}</p><p className="truncate text-[11px] text-slate-400">{m.sub}</p></div></div>)}
          </div>
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold">{ru ? "Объявления по статусу" : "E’lonlar holati"}</h2>
            <div className="mt-4"><DonutChart total={total} totalLabel={ru ? "всего" : "jami"} parts={[
              { label: ru ? "Активные" : "Faol", value: k.active, color: "#2a78d6", href: "/admin/elonlar?holat=active" },
              { label: ru ? "На проверке" : "Tekshiruvda", value: k.pending, color: "#eb6834", href: "/admin/elonlar?holat=pending" },
              { label: ru ? "Неактивные" : "Nofaol", value: k.inactive, color: "#1baf7a" },
              { label: ru ? "Черновики" : "Qoralama/rad", value: k.drafts, color: "#eda100" },
            ]} /></div>
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold">{ru ? "Популярные разделы" : "Ommabop bo‘limlar"}</h2>
            <p className="mb-4 text-xs text-slate-500">{ru ? "Просмотры страниц · 30 дней" : "Sahifa ko‘rishlari · 30 kun"}</p>
            {bars(v.sections, (k2) => SECTION[k2] ?? k2, () => "#2a78d6")}
          </section>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">{ru ? "Последние действия" : "So‘nggi amallar"}</h2>
          {recent.length === 0 ? <p className="text-sm text-slate-500">{ru ? "Пока пусто." : "Hozircha bo‘sh."}</p> : (
            <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[7.5rem] before:top-2 before:w-px before:bg-slate-200">
              {recent.map(({ a, phone }) => { const [uz, rus, dot] = ACTIONS[a.action] ?? [a.action, a.action, "bg-slate-400"]; return (
                <li key={a.id} className="grid grid-cols-[6.5rem_2rem_1fr] items-start gap-2 text-sm">
                  <span className="pt-0.5 text-right text-xs text-slate-400">{ago(a.createdAt)}</span>
                  <span aria-hidden="true" className={`relative z-10 mx-auto mt-1 h-3.5 w-3.5 rounded-full ring-4 ring-white ${dot}`} />
                  <span><span className="block font-medium text-slate-800">{ru ? rus : uz}</span><span className="text-xs text-slate-500">{phone && phone.startsWith("+") ? phone : a.entityType}</span></span>
                </li>); })}
            </ol>)}
          <Link href="/admin/audit" className="mt-4 inline-block text-sm text-brand hover:underline">{ru ? "Весь журнал →" : "Butun jurnal →"}</Link>
        </section>
        <section className="min-w-0 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-baseline justify-between gap-2"><div><h2 className="font-semibold">{ru ? "Ожидают проверки" : "Tekshiruvni kutayotgan e’lonlar"}</h2><p className="text-xs text-slate-500">{ru ? "Самые старые сначала" : "Eng eskilari birinchi"}</p></div>
            <Link href="/admin/elonlar?holat=pending" className="text-sm text-brand hover:underline">{ru ? "Все" : "Barchasi"} →</Link></div>
          {pendingRows.length === 0 ? <p className="rounded-lg bg-green-50 p-4 text-sm text-green-800">✓ {ru ? "Нет объявлений на проверке." : "Tekshiruvni kutayotgan e’lon yo‘q."}</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
              <thead><tr className="bg-brand-dark text-xs uppercase tracking-wide text-white"><th className="rounded-l-lg px-3 py-2.5 font-medium">{ru ? "Объявление" : "E’lon"}</th><th className="px-3 py-2.5 font-medium">{ru ? "Район" : "Hudud"}</th><th className="px-3 py-2.5 font-medium">{ru ? "Цена" : "Narx"}</th><th className="px-3 py-2.5 font-medium">{ru ? "Отправлено" : "Yuborilgan"}</th><th className="rounded-r-lg px-3 py-2.5 font-medium">{ru ? "Статус" : "Holat"}</th></tr></thead>
              <tbody>{pendingRows.map((r) => <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="max-w-[16rem] truncate px-3 py-3 font-medium"><Link href={`/admin/elonlar?holat=pending#${r.id}`} className="hover:text-brand hover:underline">{r.title || "—"}</Link></td>
                <td className="px-3 py-3 text-slate-600">{r.district ?? r.region}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{priceLabel({ amount: r.amount, currency: r.currency, period: r.period, basis: r.basis, negotiable: r.negotiable }, locale)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-500">{ago(r.updatedAt)}</td>
                <td className="px-3 py-3"><span className="rounded bg-[#eb6834] px-2 py-1 text-xs font-medium text-white">{ru ? "Проверка" : "Tekshiruvda"}</span></td>
              </tr>)}</tbody>
            </table></div>)}
        </section>
      </div>
    </div>
  );
}
