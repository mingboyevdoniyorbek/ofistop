"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "./I18nProvider";
import FormSelect from "./FormSelect";
import { ProductIcon } from "./Stickers";
import { FURNITURE_PRODUCTS, KIND_LABELS, PRODUCT_LABELS } from "@/lib/furniture-labels";

type Init = { contactName: string; phone: string; telegramUsername: string };

/** Mebel firmasi arizasi: nomi, turi, nimalarni taklif qiladi, hudud va aloqa. */
export default function FurnitureApplicationForm({ init, regions }: { init: Init; regions: { id: number; name: string }[] }) {
  const ru = useLocale() === "ru"; const lang = ru ? "ru" : "uz"; const router = useRouter();
  const [f, setF] = useState({ ...init, name: "", kind: "both", products: [] as string[], description: "", regionId: "", address: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const inp = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5";
  const L = (k: string, label: string, child: React.ReactNode, hint?: string) => (
    <label className="block text-sm font-medium">{label}{child}{hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
      {errors[k] && <span role="alert" className="mt-1 block text-xs text-red-700">{errors[k]}</span>}</label>);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null); setErrors({});
    const r = await fetch("/api/furniture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (r?.ok) { setMsg({ ok: true, t: ru ? "Заявка принята! После проверки ваша компания появится в разделе «Офисная мебель»." : "Arizangiz qabul qilindi! Tekshiruvdan so‘ng firmangiz «Ofis mebellari» bo‘limida chiqadi." }); router.refresh(); return; }
    if (d?.errors) setErrors(d.errors);
    setMsg({ ok: false, t: d?.error ?? (ru ? "Не удалось отправить" : "Yuborib bo‘lmadi") });
  }
  if (msg?.ok) return <div role="status" className="rounded-2xl border border-green-300 bg-green-50 p-5 text-green-900"><p className="text-lg font-semibold">✓ {msg.t}</p></div>;
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">{L("name", ru ? "Название компании *" : "Firma nomi *", <input required minLength={2} maxLength={120} className={inp} value={f.name} onChange={set("name")} />)}</div>
      <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">{ru ? "Чем вы занимаетесь? *" : "Nima bilan shug‘ullanasiz? *"}</legend>
        <div className="mt-1 grid gap-2 sm:grid-cols-3">{(["ready", "custom", "both"] as const).map((k) =>
          <label key={k} className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-slate-200 p-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-blue-50">
            <input type="radio" name="kind" value={k} checked={f.kind === k} onChange={() => setF((x) => ({ ...x, kind: k }))} />{KIND_LABELS[k][lang]}</label>)}</div></fieldset>
      <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">{ru ? "Что предлагаете" : "Nimalarni taklif qilasiz"}</legend>
        <div className="mt-1 flex flex-wrap gap-2">{FURNITURE_PRODUCTS.map((p) =>
          <label key={p} className="cursor-pointer rounded-full border border-slate-300 px-3 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white">
            <input type="checkbox" className="sr-only" checked={f.products.includes(p)} onChange={(e) => setF((x) => ({ ...x, products: e.target.checked ? [...x.products, p] : x.products.filter((y) => y !== p) }))} /><span className="inline-flex items-center gap-1.5"><ProductIcon name={p} className="h-5 w-5 rounded bg-white p-0.5" />{PRODUCT_LABELS[p][lang]}</span></label>)}</div></fieldset>
      <div className="sm:col-span-2">{L("description", ru ? "О компании" : "Firma haqida", <textarea maxLength={1500} rows={4} className={inp} value={f.description} onChange={set("description")} placeholder={ru ? "Материалы, сроки изготовления, доставка и сборка, гарантия…" : "Materiallar, tayyorlash muddati, yetkazib berish va yig‘ish, kafolat…"} />)}</div>
      {L("regionId", ru ? "Регион *" : "Hudud *", <FormSelect className={inp} value={f.regionId} onChange={set("regionId")}><option value="">{ru ? "Выберите" : "Tanlang"}</option>{regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</FormSelect>)}
      {L("address", ru ? "Адрес шоурума или цеха" : "Do‘kon yoki sex manzili", <input maxLength={300} className={inp} value={f.address} onChange={set("address")} />)}
      {L("contactName", ru ? "Контактное лицо *" : "Mas’ul shaxs *", <input required minLength={2} maxLength={100} className={inp} value={f.contactName} onChange={set("contactName")} autoComplete="name" />)}
      {L("phone", ru ? "Телефон *" : "Telefon *", <input required type="tel" maxLength={30} className={inp} value={f.phone} onChange={set("phone")} placeholder="+998 90 123 45 67" autoComplete="tel" />)}
      {L("telegramUsername", "Telegram", <input maxLength={40} className={inp} value={f.telegramUsername} onChange={set("telegramUsername")} placeholder="@username" />)}
      {L("website", ru ? "Сайт или Instagram" : "Sayt yoki Instagram", <input maxLength={300} className={inp} value={f.website} onChange={set("website")} placeholder="instagram.com/..." />)}
      <div className="space-y-2 sm:col-span-2">
        <button disabled={busy} className="w-full rounded-xl bg-accent px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60 sm:w-auto">{busy ? "…" : (ru ? "Отправить заявку" : "Arizani yuborish")}</button>
        {msg && !msg.ok && <p role="alert" className="text-sm text-red-700">{msg.t}</p>}
      </div>
    </form>
  );
}
