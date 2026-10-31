import Link from "next/link";
import { getAdminUser } from "@/lib/auth";
import AdminLogin from "@/components/AdminLogin";
import { getT } from "@/lib/i18n";
import { adminDashboard } from "@/lib/admin-dashboard";
import { priceLabel } from "@/lib/format";
import AreaChart from "@/components/admin/AreaChart";
import DonutChart from "@/components/admin/DonutChart";

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
};

export default async function AdminHome() {
  const u = await getAdminUser();
  if (!u) return <AdminLogin />;
  const { locale } = await getT(); const ru = locale === "ru";
  const { k, days, recent, pendingRows } = await adminDashboard(locale);
  const views30 = days.reduce((n, d) => n + d.views, 0), created30 = days.reduce((n, d) => n + d.created, 0);
  const total = k.active + k.pending + k.drafts + k.inactive;
  const ago = (d: Date) => { const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
    return m < 60 ? `${Math.max(1, m)} ${ru ? "мин назад" : "daqiqa oldin"}` : m < 1440 ? `${Math.round(m / 60)} ${ru ? "ч назад" : "soat oldin"}` : `${Math.round(m / 1440)} ${ru ? "дн. назад" : "kun oldin"}`; };
  const action = [
    { label: ru ? "На проверке" : "Tekshiruvdagi e’lonlar", value: k.pending, href: "/admin/elonlar?holat=pending", cls: "from-[#12308a] to-[#2a78d6]" },
    { label: ru ? "Заявки центров" : "Markaz arizalari", value: k.apps, href: "/admin/arizalar", cls: "from-[#4338ca] to-[#7c3aed]" },
    { label: ru ? "Открытые жалобы" : "Ochiq shikoyatlar", value: k.reports, href: "/admin/shikoyatlar", cls: "from-[#0e7490] to-[#0ea5e9]" },
    { label: ru ? "Изменения центров" : "Markaz o‘zgarishlari", value: k.center_edits, href: "/admin/markazlar?holat=kutilmoqda", cls: "from-[#15803d] to-[#22c55e]" },
  ];
  const mini = [
    { label: ru ? "Пользователи" : "Foydalanuvchilar", value: k.users, sub: `+${k.users_30} ${ru ? "за 30 дн." : "30 kunda"}`, color: "bg-[#2a78d6]" },
    { label: ru ? "Звонки (30 дн.)" : "Qo‘ng‘iroqlar (30 kun)", value: k.calls_30, sub: `Telegram: ${k.tg_30}`, color: "bg-[#1baf7a]" },
    { label: ru ? "В избранном (30 дн.)" : "Saqlanganlar (30 kun)", value: k.favs_30, sub: ru ? "добавлений" : "marta qo‘shildi", color: "bg-[#eb6834]" },
    { label: ru ? "Бизнес-центры" : "Biznes markazlar", value: k.centers, sub: ru ? "на сайте" : "saytda", color: "bg-[#eda100]" },
  ];
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h2 className="font-semibold">{ru ? "Обзор" : "Umumiy ko‘rinish"}</h2><p className="text-xs text-slate-500">{ru ? "Последние 30 дней" : "Oxirgi 30 kun"}</p></div>
            <p className="text-xs text-slate-500">{ru ? "Просмотры объявлений по дням" : "E’lonlar ko‘rishlari, kunlik"}</p>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-[200px_1fr]">
            <div className="space-y-5">
              <div><p className="text-3xl font-bold text-slate-900">{k.active}</p><p className="text-xs text-slate-500">{ru ? "Активных объявлений" : "Faol e’lonlar"}</p></div>
              <div><p className="text-3xl font-bold text-slate-900">{views30}</p><p className="text-xs text-slate-500">{ru ? "Просмотров за 30 дней" : "30 kunda ko‘rishlar"}</p></div>
              <div><p className="text-xl font-bold text-slate-900">+{created30} <span className="text-sm font-normal text-slate-500">· {ru ? "сегодня" : "bugun"} +{k.new_today}</span></p><p className="text-xs text-slate-500">{ru ? "Новых объявлений" : "Yangi e’lonlar"}</p></div>
              <Link href="/admin/elonlar?holat=pending" className="inline-block rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">{ru ? "Проверить объявления" : "E’lonlarni tekshirish"}</Link>
            </div>
            <AreaChart data={days.map((d) => ({ day: d.day, value: d.views }))} label={ru ? "Просмотры объявлений" : "E’lon ko‘rishlari"} unit={ru ? "просмотров" : "ko‘rish"} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 lg:grid-cols-4">
            {mini.map((m) => <div key={m.label} className="flex items-center gap-3">
              <span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white ${m.color}`}>●</span>
              <div className="min-w-0"><p className="text-xs leading-tight text-slate-500">{m.label}</p><p className="font-bold text-slate-900">{m.value}</p><p className="truncate text-[11px] text-slate-400">{m.sub}</p></div></div>)}
          </div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">{ru ? "Объявления по статусу" : "E’lonlar holati"}</h2>
          <div className="mt-4"><DonutChart total={total} totalLabel={ru ? "всего" : "jami"} parts={[
            { label: ru ? "Активные" : "Faol", value: k.active, color: "#2a78d6", href: "/admin/elonlar?holat=active" },
            { label: ru ? "На проверке" : "Tekshiruvda", value: k.pending, color: "#eb6834", href: "/admin/elonlar?holat=pending" },
            { label: ru ? "Неактивные" : "Nofaol", value: k.inactive, color: "#1baf7a" },
            { label: ru ? "Черновики" : "Qoralama/rad", value: k.drafts, color: "#eda100" },
          ]} /></div>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {action.map((a) => <Link key={a.label} href={a.href} className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${a.cls} p-5 text-white shadow-sm transition hover:shadow-lg`}>
          <p className="text-sm text-white/85">{a.label}</p>
          <p className="mt-6 text-4xl font-bold">{a.value}</p>
          <p className="mt-1 text-xs text-white/80">{a.value ? (ru ? "Требует внимания →" : "Ko‘rib chiqish kerak →") : (ru ? "Всё проверено ✓" : "Hammasi ko‘rib chiqilgan ✓")}</p>
          <svg aria-hidden="true" viewBox="0 0 120 60" className="absolute -bottom-2 right-0 h-16 w-32 opacity-25"><path d="M0 50 C20 20 35 45 55 25 S90 10 120 30 V60 H0Z" fill="#fff" /></svg>
        </Link>)}
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
