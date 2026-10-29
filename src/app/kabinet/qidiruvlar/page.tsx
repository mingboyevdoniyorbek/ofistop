import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireUserPage } from "@/lib/page-auth";
import { getT } from "@/lib/i18n";
import { DeleteSearch } from "@/components/SavedSearch";
export default async function Page() {
  const user = await requireUserPage("/kabinet/qidiruvlar"), { locale } = await getT(), ru = locale === "ru";
  const rows = await db().select().from(s.savedSearches).where(eq(s.savedSearches.userId, user.id)).orderBy(desc(s.savedSearches.createdAt));
  return <section><h1 className="mb-3 text-2xl font-bold">{ru ? "Сохранённые поиски" : "Saqlangan qidiruvlar"}</h1><p className="mb-5 text-slate-600">{ru ? "Новые подходящие объявления появятся в уведомлениях на сайте." : "Mos yangi e’lonlar sayt ichidagi bildirishnomalarda chiqadi."}</p>{!rows.length && <Link className="text-brand underline" href="/joylar">{ru ? "Найдите и сохраните нужные условия" : "Kerakli filtrlarni tanlab, qidiruvni saqlang"}</Link>}<ul className="space-y-3">{rows.map(r => <li className="flex items-center justify-between gap-4 rounded-2xl border p-4" key={r.id}><Link className="font-semibold text-brand" href={`/joylar?${r.query}`}>{r.name}</Link><DeleteSearch id={r.id}/></li>)}</ul></section>;
}
