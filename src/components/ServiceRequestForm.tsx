"use client";
import { useState } from "react";
import { useLocale } from "./I18nProvider";
import FormSelect from "./FormSelect";

type Opt = { id: number; name: string };
/** «Joyingizni biz ijaraga beramiz» arizasi — faqat ism va telefon majburiy, qolgani ixtiyoriy. */
export default function ServiceRequestForm({ regions, districts, categories, init }: { regions: Opt[]; districts: (Opt & { regionId: number })[]; categories: [string, string][]; init: { name: string; phone: string; telegramUsername: string } }) {
  const ru = useLocale() === "ru";
  const [f, setF] = useState({ ...init, category: "", regionId: "", districtId: "", address: "", areaM2: "", desiredPrice: "", comment: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const inp = "mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5";
  const L = (k: string, label: string, child: React.ReactNode) => (
    <label className="block text-sm font-medium">{label}{child}{errors[k] && <span role="alert" className="mt-1 block text-xs text-red-700">{errors[k]}</span>}</label>);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null); setErrors({});
    const r = await fetch("/api/service-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (r?.ok) { setMsg({ ok: true, t: ru ? "Заявка принята! Менеджер OfisTop позвонит вам в ближайшее время." : "Arizangiz qabul qilindi! OfisTop menejeri tez orada sizga qo‘ng‘iroq qiladi." }); return; }
    if (d?.errors) setErrors(d.errors);
    setMsg({ ok: false, t: d?.error ?? (ru ? "Не удалось отправить" : "Yuborib bo‘lmadi") });
  }
  if (msg?.ok) return <div role="status" className="rounded-2xl border border-green-300 bg-green-50 p-5 text-green-900"><p className="text-lg font-semibold">✓ {msg.t}</p></div>;
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {L("name", ru ? "Ваше имя *" : "Ismingiz *", <input required minLength={2} maxLength={100} className={inp} value={f.name} onChange={set("name")} autoComplete="name" />)}
      {L("phone", ru ? "Телефон *" : "Telefon *", <input required type="tel" maxLength={30} className={inp} value={f.phone} onChange={set("phone")} placeholder="+998 90 123 45 67" autoComplete="tel" />)}
      {L("category", ru ? "Тип помещения" : "Joy turi", <FormSelect className={inp} value={f.category} onChange={set("category")}><option value="">{ru ? "Не указан" : "Ko‘rsatilmagan"}</option>{categories.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</FormSelect>)}
      {L("areaM2", ru ? "Площадь, м²" : "Maydoni, m²", <input inputMode="decimal" maxLength={20} className={inp} value={f.areaM2} onChange={set("areaM2")} />)}
      {L("regionId", ru ? "Регион" : "Hudud", <FormSelect className={inp} value={f.regionId} onChange={(e) => setF((x) => ({ ...x, regionId: e.target.value, districtId: "" }))}><option value="">{ru ? "Выберите" : "Tanlang"}</option>{regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</FormSelect>)}
      {L("districtId", ru ? "Район" : "Tuman", <FormSelect className={inp} value={f.districtId} onChange={set("districtId")}><option value="">{ru ? "Не указан" : "Ko‘rsatilmagan"}</option>{districts.filter((d) => String(d.regionId) === f.regionId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</FormSelect>)}
      <div className="sm:col-span-2">{L("address", ru ? "Адрес или ориентир" : "Manzil yoki mo‘ljal", <input maxLength={300} className={inp} value={f.address} onChange={set("address")} />)}</div>
      {L("desiredPrice", ru ? "Желаемая аренда в месяц" : "Kutilayotgan oylik ijara", <input maxLength={60} className={inp} value={f.desiredPrice} onChange={set("desiredPrice")} placeholder={ru ? "например, 800 USD" : "masalan, 800 USD"} />)}
      {L("telegramUsername", "Telegram", <input maxLength={40} className={inp} value={f.telegramUsername} onChange={set("telegramUsername")} placeholder="@username" />)}
      <div className="sm:col-span-2">{L("comment", ru ? "Комментарий" : "Izoh", <textarea maxLength={1000} rows={3} className={inp} value={f.comment} onChange={set("comment")} placeholder={ru ? "Когда удобно показать помещение, особые условия…" : "Joyni qachon ko‘rsatish qulay, maxsus shartlar…"} />)}</div>
      {/* honeypot: odamlar ko'rmaydi */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f.website} onChange={set("website")} />
      <div className="space-y-2 sm:col-span-2">
        <button disabled={busy} className="w-full rounded-xl bg-accent px-6 py-3.5 text-lg font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60 sm:w-auto">{busy ? "…" : (ru ? "Оставить заявку" : "Ariza qoldirish")}</button>
        <p className="text-xs text-slate-500">{ru ? "Обязательны только имя и телефон. Менеджер перезвонит и уточнит детали." : "Faqat ism va telefon majburiy. Menejer qo‘ng‘iroq qilib, qolganini aniqlab oladi."}</p>
        {msg && !msg.ok && <p role="alert" className="text-sm text-red-700">{msg.t}</p>}
      </div>
    </form>
  );
}
