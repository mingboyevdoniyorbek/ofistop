"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "./I18nProvider";

type Team = { members: { id: string; label: string; you: boolean; removable: boolean }[]; pending: { id: string; label: string }[] };

/**
 * Markaz jamoasi: vakil o'ziga yordamchi (xodim) qo'shadi. Yordamchi saytda ro'yxatdan o'tgan bo'lishi kerak;
 * so'rov administrator tasdig'idan keyin kuchga kiradi.
 */
export default function CenterTeam({ centerId, team }: { centerId: string; team: Team }) {
  const ru = useLocale() === "ru"; const router = useRouter();
  const [contact, setContact] = useState(""); const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function call(body: object, ok?: string) {
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/centers/${centerId}/team`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (r?.ok) { if (ok) { setMsg({ ok: true, t: ok }); setContact(""); } router.refresh(); }
    else setMsg({ ok: false, t: d?.error ?? (ru ? "Не удалось выполнить" : "Bajarib bo‘lmadi") });
  }
  const row = "flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm";
  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="team-h">
      <h2 id="team-h" className="text-lg font-bold">{ru ? "Команда центра" : "Markaz jamoasi"}</h2>
      <p className="mt-1 text-sm text-slate-600">{ru ? "Добавьте сотрудника, который тоже будет управлять центром. Он должен быть зарегистрирован на сайте. Доступ откроется после проверки администратором." : "Markazni siz bilan birga boshqaradigan xodimni qo‘shing. U saytda ro‘yxatdan o‘tgan bo‘lishi kerak. Administrator tasdiqlagach unga kirish ochiladi."}</p>
      <ul className="mt-4 space-y-2">
        {team.members.map((m) => <li key={m.id} className={row}>
          <span className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{m.label.replace(/^\+998/, "").slice(0, 2).toUpperCase()}</span><span className="truncate font-medium">{m.label}</span>{m.you && <span className="text-xs text-slate-500">({ru ? "вы" : "siz"})</span>}</span>
          {m.removable && <button type="button" disabled={busy} onClick={() => confirm(ru ? "Убрать из команды?" : "Jamoadan chiqarilsinmi?") && call({ action: "remove", userId: m.id })} className="text-xs font-semibold text-red-700">{ru ? "Убрать" : "Chiqarish"}</button>}
        </li>)}
        {team.pending.map((p) => <li key={p.id} className={row}>
          <span className="min-w-0 truncate">{p.label} <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">{ru ? "на проверке" : "tekshiruvda"}</span></span>
          <button type="button" disabled={busy} onClick={() => call({ action: "remove", requestId: p.id })} className="text-xs font-semibold text-slate-600">{ru ? "Отменить" : "Bekor qilish"}</button>
        </li>)}
      </ul>
      <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (contact.trim()) call({ action: "add", contact }, ru ? "Запрос отправлен администратору." : "So‘rov administratorga yuborildi."); }}>
        <label className="sr-only" htmlFor="team-contact">{ru ? "Телефон или Gmail сотрудника" : "Xodimning telefoni yoki Gmail’i"}</label>
        <input id="team-contact" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} placeholder={ru ? "+998 90 123 45 67 или почта Gmail" : "+998 90 123 45 67 yoki Gmail pochta"} className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 py-3" />
        <button disabled={busy || !contact.trim()} className="rounded-2xl bg-brand px-5 py-3 font-semibold text-white disabled:opacity-60">{ru ? "Добавить" : "Qo‘shish"}</button>
      </form>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.t}</p>}
    </section>
  );
}
