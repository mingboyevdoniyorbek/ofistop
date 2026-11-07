import Link from "next/link";
import { getAdminUser } from "@/lib/auth";
import AdminLogin from "@/components/AdminLogin";
import { getT } from "@/lib/i18n";
import { adminDashboard } from "@/lib/admin-dashboard";
import { priceLabel } from "@/lib/format";
import ChartPanel from "@/components/admin/ChartPanel";
import { AdminIcon } from "@/components/admin/AdminShell";
import DonutChart from "@/components/admin/DonutChart";
import { visitStats } from "@/lib/site-visits";

export const dynamic = "force-dynamic";

/** 30 kunlik maqsadlar ("Oy maqsadlari" bloki). Kerak bo'lsa shu yerda o'zgartiring. */
const GOALS = { visitors: 1000, listings: 50, users: 100, calls: 150 };

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
  const [{ k, days, recent, pendingRows, latestRows }, v] = await Promise.all([adminDashboard(locale), visitStats()]);
  const views30 = days.reduce((n, d) => n + d.views, 0), created30 = days.reduce((n, d) => n + d.created, 0);
  const total = k.active + k.pending + k.drafts + k.inactive;
  const ago = (d: Date) => { const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
    return m < 60 ? `${Math.max(1, m)} ${ru ? "мин" : "daq"}` : m < 1440 ? `${Math.round(m / 60)} ${ru ? "ч" : "soat"}` : `${Math.round(m / 1440)} ${ru ? "дн." : "kun"}`; };
  const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : a > 0 ? 100 : 0);
  // Oxirgi 7 kun va undan oldingi 7 kun — o'sish foizi uchun.
  const wk = (arr: number[]) => [arr.slice(-7).reduce((a, b) => a + b, 0), arr.slice(-14, -7).reduce((a, b) => a + b, 0)] as const;
  const [vis7, visPrev] = wk(v.days.map((d) => d.visitors)), [cr7, crPrev] = wk(days.map((d) => d.created)), [vw7, vwPrev] = wk(days.map((d) => d.views));
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  const kpis = [
    { label: ru ? "Посетители сегодня" : "Bugungi tashriflar", value: fmt(v.totals.today), delta: pct(v.totals.today, v.totals.yesterday), hint: ru ? "к вчера" : "kechaga nisbatan", icon: "users" as const, g: "from-[#38bdf8] to-[#2563eb]" },
    { label: ru ? "Посетители · 30 дн." : "Tashriflar · 30 kun", value: fmt(v.totals.month), delta: pct(vis7, visPrev), hint: ru ? "неделя к неделе" : "haftaga nisbatan", icon: "dashboard" as const, g: "from-[#a78bfa] to-[#7c3aed]" },
    { label: ru ? "Активные объявления" : "Faol e’lonlar", value: fmt(k.active), delta: pct(cr7, crPrev), hint: `+${created30} ${ru ? "за 30 дн." : "30 kunda"}`, icon: "listings" as const, g: "from-[#34d399] to-[#059669]" },
    { label: ru ? "Просмотры объявлений" : "E’lon ko‘rishlari", value: fmt(views30), delta: pct(vw7, vwPrev), hint: ru ? "за 30 дней" : "30 kunda", icon: "centers" as const, g: "from-[#fbbf24] to-[#ea580c]" },
  ];
  const action = [
    { label: ru ? "Объявления на проверке" : "Tekshiruvdagi e’lonlar", value: k.pending, href: "/admin/elonlar?holat=pending", icon: "listings" as const, g: "from-[#38bdf8] to-[#2563eb]" },
    { label: ru ? "Заявки центров" : "Markaz arizalari", value: k.apps, href: "/admin/arizalar", icon: "apps" as const, g: "from-[#a78bfa] to-[#7c3aed]" },
    { label: ru ? "«Сдадим за вас»" : "Ijaraga berish xizmati", value: k.service_new, href: "/admin/xizmat", icon: "service" as const, g: "from-[#34d399] to-[#059669]" },
    { label: ru ? "Мебельные заявки" : "Mebel arizalari", value: k.furniture_pending, href: "/admin/mebel", icon: "furniture" as const, g: "from-[#fbbf24] to-[#ea580c]" },
    { label: ru ? "Открытые жалобы" : "Ochiq shikoyatlar", value: k.reports, href: "/admin/shikoyatlar", icon: "reports" as const, g: "from-[#fb7185] to-[#e11d48]" },
    { label: ru ? "Изменения центров" : "Markaz o‘zgarishlari", value: k.center_edits, href: "/admin/markazlar?holat=kutilmoqda", icon: "centers" as const, g: "from-[#2dd4bf] to-[#0d9488]" },
  ];
  const goals = [
    { label: ru ? "Посетители" : "Tashrif buyuruvchilar", value: v.totals.month, goal: GOALS.visitors, icon: "users" as const, g: "from-[#38bdf8] to-[#2563eb]" },
    { label: ru ? "Новые объявления" : "Yangi e’lonlar", value: created30, goal: GOALS.listings, icon: "listings" as const, g: "from-[#a78bfa] to-[#7c3aed]" },
    { label: ru ? "Новые пользователи" : "Yangi foydalanuvchilar", value: k.users_30, goal: GOALS.users, icon: "users" as const, g: "from-[#34d399] to-[#059669]" },
    { label: ru ? "Звонки владельцам" : "Egalarga qo‘ng‘iroqlar", value: k.calls_30, goal: GOALS.calls, icon: "reports" as const, g: "from-[#fbbf24] to-[#ea580c]" },
  ];
  const SOURCE: Record<string, [string, string]> = { instagram: ["Instagram", "#e1306c"], telegram: ["Telegram", "#29a9eb"], google: ["Google", "#4c8bf5"], yandex: ["Yandex", "#fc3f1d"], facebook: ["Facebook", "#1877f2"], olx: ["OLX", "#23e5db"], direct: [ru ? "Прямой заход" : "To‘g‘ridan-to‘g‘ri", "#94a3b8"], other: [ru ? "Другие сайты" : "Boshqa saytlar", "#64748b"] };
  const SECTION: Record<string, string> = ru
    ? { home: "Главная", catalog: "Каталог", listing: "Объявления", landing: "Подборки", centers: "Бизнес-центры", center: "Страницы центров", furniture: "Мебель", service: "Услуга «Сдадим за вас»", cabinet: "Кабинет", other: "Прочее" }
    : { home: "Bosh sahifa", catalog: "Katalog", listing: "E’lon sahifalari", landing: "Turkum sahifalari", centers: "Markazlar ro‘yxati", center: "Markaz sahifalari", furniture: "Mebel", service: "Ijaraga berish xizmati", cabinet: "Kabinet", other: "Boshqa" };
  const card = "adm-glass rounded-[28px] p-5";
  const H2 = ({ t, s: sub, right }: { t: string; s?: string; right?: React.ReactNode }) => <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-semibold text-white">{t}</h2>{sub && <p className="text-xs text-slate-400">{sub}</p>}</div>{right}</div>;
  const Chip = ({ n }: { n: number }) => <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${n >= 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-3 w-3 ${n < 0 ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>{n >= 0 ? "+" : ""}{n}%</span>;
  const Tile = ({ g, icon }: { g: string; icon: Parameters<typeof AdminIcon>[0]["name"] }) => <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${g} text-white shadow-lg`}><AdminIcon name={icon} /></span>;
  const bars = (rows: { key: string; n: number }[], name: (k: string) => string, color: (k: string) => string) => {
    const sum = rows.reduce((n, r) => n + r.n, 0) || 1;
    return rows.length === 0 ? <p className="text-sm text-slate-400">{ru ? "Данных пока нет." : "Hozircha ma’lumot yo‘q."}</p> : (
      <ul className="space-y-3">{rows.map((r) => { const p = Math.round((r.n / sum) * 100); return (
        <li key={r.key} className="text-sm"><div className="flex justify-between gap-2"><span className="truncate text-[#cbd5e1]">{name(r.key)}</span><span className="shrink-0 font-semibold text-white">{fmt(r.n)} <span className="font-normal text-slate-500">· {p}%</span></span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full" style={{ width: `${Math.max(2, p)}%`, background: color(r.key), boxShadow: `0 0 12px ${color(r.key)}` }} /></div></li>); })}</ul>);
  };
  const initials = (t: string) => (t.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("") || "E").toUpperCase();
  const AV = ["from-[#fb923c] to-[#ea580c]", "from-[#a78bfa] to-[#7c3aed]", "from-[#38bdf8] to-[#2563eb]", "from-[#34d399] to-[#059669]", "from-[#fb7185] to-[#e11d48]", "from-[#fbbf24] to-[#d97706]"];
  const mobile = v.devices.find((d) => d.key === "mobile")?.n ?? 0, desktop = v.devices.find((d) => d.key === "desktop")?.n ?? 0;
  const attention = action.reduce((n, a) => n + a.value, 0);
  const queue = pendingRows.length ? pendingRows : latestRows;
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* 1. Asosiy ko'rsatkichlar */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpis.map((x) => <div key={x.label} className={`${card} !p-4 sm:!p-5`}>
          <div className="flex flex-wrap items-center gap-2.5"><Tile g={x.g} icon={x.icon} /><span className="min-w-0 flex-1 text-xs font-medium leading-tight text-[#cbd5e1] sm:text-sm">{x.label}</span><span className="hidden sm:inline"><Chip n={x.delta} /></span></div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-[32px]">{x.value}</p>
          <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-slate-400"><span className="sm:hidden"><Chip n={x.delta} /></span>{x.hint}</p>
        </div>)}
      </div>

      {/* 2. Grafik + navbatdagi e'lonlar */}
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className={card}>
          <H2 t={ru ? "Динамика за 30 дней" : "30 kunlik dinamika"} s={ru ? "Без ботов и админки" : "Botlar va admin hisobga olinmaydi"} />
          <ChartPanel best={ru ? "Лучший день" : "Eng yaxshi kun"} ranges={[ru ? "7 дн." : "7 kun", ru ? "30 дн." : "30 kun"]} series={[
            { key: "visitors", label: ru ? "Посетители" : "Tashriflar", unit: ru ? "чел." : "kishi", color: "#38bdf8", data: v.days.map((d) => ({ day: d.day, value: d.visitors })) },
            { key: "views", label: ru ? "Просмотры объявлений" : "E’lon ko‘rishlari", unit: ru ? "просм." : "ko‘rish", color: "#fbbf24", data: days.map((d) => ({ day: d.day, value: d.views })) },
            { key: "created", label: ru ? "Новые объявления" : "Yangi e’lonlar", unit: ru ? "объявл." : "e’lon", color: "#a78bfa", data: days.map((d) => ({ day: d.day, value: d.created })) },
          ]} />
        </section>
        <section className={card}>
          <H2 t={pendingRows.length ? (ru ? "Ждут проверки" : "Tekshiruvni kutmoqda") : (ru ? "Последние объявления" : "So‘nggi e’lonlar")}
            s={pendingRows.length ? (ru ? "Самые старые сначала" : "Eng eskilari birinchi") : (ru ? "На проверке пусто ✓" : "Tekshiruvda hech narsa yo‘q ✓")}
            right={<Link href={pendingRows.length ? "/admin/elonlar?holat=pending" : "/admin/elonlar?holat=all"} className="text-xs font-semibold text-sky-300 hover:text-sky-200">{ru ? "Все" : "Barchasi"}</Link>} />
          {queue.length === 0 ? <p className="text-sm text-slate-400">{ru ? "Пока пусто." : "Hozircha bo‘sh."}</p> : (
            <ul className="space-y-2.5">{queue.map((r, i) => (
              <li key={r.id}><Link href={pendingRows.length ? `/admin/elonlar?holat=pending#${r.id}` : `/admin/elonlar?holat=all&q=${r.id.slice(0, 8)}`}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition hover:bg-white/[.08] ${i === 0 && pendingRows.length ? "border-sky-400/30 bg-sky-400/[.08]" : "border-white/[.06] bg-white/[.03]"}`}>
                <span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${AV[i % AV.length]} text-xs font-bold text-white`}>{initials(r.title || "E")}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{r.title || "—"}</span>
                  <span className="block truncate text-xs text-slate-400">{r.district ?? r.region} · {"createdAt" in r ? ago(r.createdAt) : ago(r.updatedAt)}</span></span>
                <span className="shrink-0 text-right text-xs font-semibold text-[#e2e8f0]">{priceLabel({ amount: r.amount, currency: r.currency, period: r.period, basis: r.basis, negotiable: r.negotiable }, locale)}</span>
              </Link></li>))}</ul>)}
        </section>
      </div>

      {/* 3. Diqqat talab qiladiganlar */}
      <section className={card}>
        <H2 t={ru ? "Требует внимания" : "Diqqat talab qiladi"} s={attention ? (ru ? `${attention} задач ждут решения` : `${attention} ta ish sizni kutmoqda`) : (ru ? "Всё проверено" : "Hammasi ko‘rib chiqilgan")} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {action.map((a) => <Link key={a.label} href={a.href} className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 ${a.value ? "border-white/10 bg-white/[.06] hover:bg-white/[.1]" : "border-white/[.05] bg-white/[.02] opacity-70 hover:opacity-100"}`}>
            <div className="flex items-center justify-between"><Tile g={a.g} icon={a.icon} />{a.value > 0 && <span className="h-2.5 w-2.5 rounded-full bg-[#f43f5e] shadow-[0_0_10px_#f43f5e]" />}</div>
            <p className="mt-3 text-2xl font-bold text-white">{a.value}</p>
            <p className="text-xs leading-tight text-slate-400">{a.label}</p>
          </Link>)}
        </div>
      </section>

      {/* 4. Oy maqsadlari */}
      <section className={card}>
        <H2 t={ru ? "Цели на 30 дней" : "30 kunlik maqsadlar"} s={ru ? "Прогресс за последние 30 дней" : "Oxirgi 30 kundagi natija"} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {goals.map((g) => { const p = Math.min(100, Math.round((g.value / g.goal) * 100)); const done = p >= 100; return (
            <div key={g.label} className={`rounded-2xl border p-4 ${done ? "border-emerald-400/40 bg-emerald-400/[.07]" : "border-white/[.07] bg-white/[.04]"}`}>
              <div className="flex items-center justify-between"><Tile g={g.g} icon={g.icon} /><span className={`flex items-center gap-1.5 text-sm font-bold ${done ? "text-emerald-300" : "text-white"}`}>{done && <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-400 text-[#052e1c]">✓</span>}{p}%</span></div>
              <p className="mt-3 text-sm font-medium text-[#cbd5e1]">{g.label}</p>
              <p className="text-2xl font-bold text-white">{fmt(g.value)} <span className="text-xs font-normal text-slate-400">/ {fmt(g.goal)}</span></p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[.08]"><div className={`h-full rounded-full bg-gradient-to-r ${done ? "from-[#34d399] to-[#10b981]" : "from-[#2563eb] to-[#38bdf8]"}`} style={{ width: `${Math.max(3, p)}%` }} /></div>
            </div>); })}
        </div>
      </section>

      {/* 5. Manbalar, holat, bo'limlar */}
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <section className={card}>
          <H2 t={ru ? "Откуда приходят" : "Qayerdan kelishmoqda"} s={ru ? "Первый заход за день · 30 дн." : "Kunlik birinchi kirish · 30 kun"} />
          {bars(v.sources, (k2) => SOURCE[k2]?.[0] ?? k2, (k2) => SOURCE[k2]?.[1] ?? "#94a3b8")}
          <div className="mt-5 border-t border-white/[.07] pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{ru ? "Устройства" : "Qurilmalar"}</p>
            <div className="flex h-2 gap-1 overflow-hidden rounded-full">{mobile + desktop > 0 ? <><div className="rounded-full bg-[#38bdf8]" style={{ width: `${(mobile / (mobile + desktop)) * 100}%` }} /><div className="rounded-full bg-[#a78bfa]" style={{ width: `${(desktop / (mobile + desktop)) * 100}%` }} /></> : <div className="w-full bg-white/[.07]" />}</div>
            <div className="mt-2 flex justify-between text-xs text-[#cbd5e1]"><span>📱 {ru ? "Телефон" : "Telefon"}: {mobile}</span><span>💻 {ru ? "Компьютер" : "Kompyuter"}: {desktop}</span></div>
          </div>
        </section>
        <section className={card}>
          <H2 t={ru ? "Объявления по статусу" : "E’lonlar holati"} s={`VIP: ${k.top_active ?? 0} · ${ru ? "продажа" : "sotuv"}: ${k.sale_active ?? 0}`} />
          <DonutChart dark total={total} totalLabel={ru ? "всего" : "jami"} parts={[
            { label: ru ? "Активные" : "Faol", value: k.active, color: "#38bdf8", href: "/admin/elonlar?holat=active" },
            { label: ru ? "На проверке" : "Tekshiruvda", value: k.pending, color: "#fb923c", href: "/admin/elonlar?holat=pending" },
            { label: ru ? "Неактивные" : "Nofaol", value: k.inactive, color: "#34d399" },
            { label: ru ? "Черновики" : "Qoralama/rad", value: k.drafts, color: "#a78bfa" },
          ]} />
        </section>
        <section className={card}>
          <H2 t={ru ? "Популярные разделы" : "Ommabop bo‘limlar"} s={ru ? "Просмотры страниц · 30 дн." : "Sahifa ko‘rishlari · 30 kun"} />
          {bars(v.sections, (k2) => SECTION[k2] ?? k2, () => "#38bdf8")}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[.07] pt-4 text-sm">
            <div><p className="text-xs text-slate-400">{ru ? "Пользователи" : "Foydalanuvchilar"}</p><p className="font-bold text-white">{fmt(k.users)} <span className="text-xs font-normal text-emerald-300">+{k.users_30}</span></p></div>
            <div><p className="text-xs text-slate-400">{ru ? "Бизнес-центры" : "Biznes markazlar"}</p><p className="font-bold text-white">{k.centers}</p></div>
            <div><p className="text-xs text-slate-400">{ru ? "Звонки / Telegram" : "Qo‘ng‘iroq / Telegram"}</p><p className="font-bold text-white">{k.calls_30} / {k.tg_30}</p></div>
            <div><p className="text-xs text-slate-400">{ru ? "В избранном" : "Saqlanganlar"}</p><p className="font-bold text-white">{k.favs_30}</p></div>
          </div>
        </section>
      </div>

      {/* 6. So'nggi amallar */}
      <section className={card}>
        <H2 t={ru ? "Последние действия" : "So‘nggi amallar"} right={<Link href="/admin/audit" className="text-xs font-semibold text-sky-300 hover:text-sky-200">{ru ? "Весь журнал" : "Butun jurnal"}</Link>} />
        {recent.length === 0 ? <p className="text-sm text-slate-400">{ru ? "Пока пусто." : "Hozircha bo‘sh."}</p> : (
          <ol className="grid gap-2 sm:grid-cols-2">
            {recent.map(({ a, phone }) => { const [uz, rus, dot] = ACTIONS[a.action] ?? [a.action, a.action, "bg-slate-400"]; return (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-white/[.05] bg-white/[.03] px-3 py-2.5 text-sm">
                <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
                <span className="min-w-0 flex-1"><span className="block truncate font-medium text-[#f1f5f9]">{ru ? rus : uz}</span><span className="block truncate text-xs text-slate-400">{phone && phone.startsWith("+") ? phone : a.entityType}</span></span>
                <span className="shrink-0 text-xs text-slate-500">{ago(a.createdAt)}</span>
              </li>); })}
          </ol>)}
      </section>
    </div>
  );
}
