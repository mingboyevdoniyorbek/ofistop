"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "./I18nProvider";
import FormSelect from "./FormSelect";

type Opt = { id: number; name: string };
type Init = { centerId?: string; name: string; regionId: string; districtId: string; address: string; contactName: string; phone: string; telegramUsername: string };

/** Biznes markaz arizasi: yangi markaz yoki mavjud markaz boshqaruvini so'rash (centerId bilan). */
export default function CenterApplicationForm({ init, regions, districts }: { init: Init; regions: Opt[]; districts: (Opt & { regionId: number })[] }) {
  const ru = useLocale() === "ru"; const router = useRouter();
  const claim = !!init.centerId;
  const [f, setF] = useState({ ...init, floors: "", freeRooms: "", website: "", comment: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const inp = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5";
  const L = (k: string, label: string, child: React.ReactNode, hint?: string) => (
    <label className="block text-sm font-medium">{label}{child}{hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
      {errors[k] && <span role="alert" className="mt-1 block text-xs text-red-700">{errors[k]}</span>}</label>);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null); setErrors({});
    const r = await fetch("/api/center-applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (r?.ok) { setMsg({ ok: true, t: ru ? "Заявка принята! Администратор свяжется с вами, проверит данные и откроет доступ." : "Arizangiz qabul qilindi! Administrator siz bilan bog‘lanib, ma’lumotlarni tekshiradi va kirish huquqini ochadi." }); router.refresh(); return; }
    if (d?.errors) setErrors(d.errors);
    setMsg({ ok: false, t: d?.error ?? (ru ? "Не удалось отправить" : "Yuborib bo‘lmadi") });
  }
  if (msg?.ok) return <div role="status" className="rounded-2xl border border-green-300 bg-green-50 p-5 text-green-900"><p className="text-lg font-semibold">✓ {msg.t}</p></div>;
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">{L("name", ru ? "Название бизнес-центра *" : "Biznes markaz nomi *", <input required minLength={3} maxLength={120} className={inp} value={f.name} onChange={set("name")} readOnly={claim} />)}</div>
      {L("regionId", ru ? "Регион *" : "Hudud *", <FormSelect className={inp} value={f.regionId} onChange={(e) => setF((x) => ({ ...x, regionId: e.target.value, districtId: "" }))}><option value="">{ru ? "Выберите" : "Tanlang"}</option>{regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</FormSelect>)}
      {L("districtId", ru ? "Район" : "Tuman", <FormSelect className={inp} value={f.districtId} onChange={set("districtId")}><option value="">{ru ? "Не указан" : "Ko‘rsatilmagan"}</option>{districts.filter((d) => String(d.regionId) === f.regionId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</FormSelect>)}
      <div className="sm:col-span-2">{L("address", ru ? "Адрес *" : "Manzil *", <input required minLength={5} maxLength={300} className={inp} value={f.address} onChange={set("address")} placeholder={ru ? "Улица, дом, ориентир" : "Ko‘cha, uy, mo‘ljal"} />)}</div>
      {L("contactName", ru ? "Контактное лицо *" : "Mas’ul shaxs *", <input required minLength={2} maxLength={100} className={inp} value={f.contactName} onChange={set("contactName")} autoComplete="name" />, ru ? "Владелец или управляющий" : "Egasi yoki boshqaruvchi")}
      {L("phone", ru ? "Телефон *" : "Telefon *", <input required type="tel" maxLength={30} className={inp} value={f.phone} onChange={set("phone")} placeholder="+998 90 123 45 67" autoComplete="tel" />)}
      {L("telegramUsername", "Telegram", <input maxLength={40} className={inp} value={f.telegramUsername} onChange={set("telegramUsername")} placeholder="@username" />)}
      {L("website", ru ? "Сайт или Instagram" : "Sayt yoki Instagram", <input maxLength={300} className={inp} value={f.website} onChange={set("website")} placeholder="instagram.com/..." />)}
      {!claim && <>
        {L("floors", ru ? "Этажей в здании" : "Qavatlar soni", <input inputMode="numeric" maxLength={3} className={inp} value={f.floors} onChange={set("floors")} />)}
        {L("freeRooms", ru ? "Свободных помещений (примерно)" : "Bo‘sh xonalar (taxminan)", <input inputMode="numeric" maxLength={4} className={inp} value={f.freeRooms} onChange={set("freeRooms")} />)}
      </>}
      <div className="sm:col-span-2">{L("comment", ru ? "Комментарий" : "Izoh", <textarea maxLength={1000} rows={3} className={inp} value={f.comment} onChange={set("comment")} placeholder={claim ? (ru ? "Кем вы являетесь в центре и как это можно проверить" : "Markazda kim ekansiz va buni qanday tekshirish mumkin") : ""} />)}</div>
      <div className="sm:col-span-2 space-y-2">
        <button disabled={busy} className="w-full rounded-xl bg-accent px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60 sm:w-auto">{busy ? "…" : claim ? (ru ? "Запросить управление" : "Boshqaruvni so‘rash") : (ru ? "Отправить заявку" : "Arizani yuborish")}</button>
        {msg && !msg.ok && <p role="alert" className="text-sm text-red-700">{msg.t}</p>}
        <p className="text-xs text-slate-500">{ru ? "Перед подтверждением администратор позвонит по указанному номеру." : "Tasdiqlashdan oldin administrator ko‘rsatilgan raqamga qo‘ng‘iroq qiladi."}</p>
      </div>
    </form>
  );
}
