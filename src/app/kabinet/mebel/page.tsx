import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireUserPage } from "@/lib/page-auth";
import { getT } from "@/lib/i18n";
import { mediaUrl } from "@/lib/storage";
import { KIND_LABELS } from "@/lib/furniture";
import FirmAvatar from "@/components/FirmAvatar";
import FirmPhotos from "@/components/FirmPhotos";
import FurnitureApplicationForm from "@/components/FurnitureApplicationForm";
import DeleteFirmButton from "@/components/DeleteFirmButton";

export const dynamic = "force-dynamic";

/** Kabinet → Mebel firmam: firma ma'lumotlari, logotip va ish rasmlarini tahrirlash yoki firmani o'chirish. */
export default async function MyFirms() {
  const user = await requireUserPage("/kabinet/mebel");
  const { locale } = await getT(); const ru = locale === "ru"; const lang = ru ? "ru" : "uz";
  const [firms, regions] = await Promise.all([
    db().select().from(s.furnitureFirms).where(eq(s.furnitureFirms.userId, user.id)).orderBy(desc(s.furnitureFirms.createdAt)),
    db().select().from(s.regions).orderBy(asc(s.regions.id)),
  ]);
  const st = { pending: [ru ? "На проверке" : "Tekshiruvda", "bg-amber-50 text-amber-800"], approved: [ru ? "На сайте" : "Saytda", "bg-emerald-50 text-emerald-700"], rejected: [ru ? "Отклонена" : "Rad etilgan", "bg-red-50 text-red-700"] } as const;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{ru ? "Моя мебельная компания" : "Mebel firmam"}</h1>
        <Link href="/mebel/ariza" className="text-sm font-semibold text-brand">＋ {ru ? "Ещё компания" : "Yana firma"}</Link>
      </div>
      {!firms.length && <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-slate-600">{ru ? "У вас нет мебельной компании." : "Sizda mebel firmasi yo‘q."} <Link href="/mebel/ariza" className="font-semibold text-brand underline">{ru ? "Добавить" : "Qo‘shish"}</Link></div>}
      <div className="space-y-6">{firms.map((f) => (
        <section key={f.id} className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <FirmAvatar name={f.name} url={mediaUrl(f.logoKey)} />
            <div className="min-w-0 flex-1"><h2 className="truncate text-lg font-bold">{f.name}</h2><p className="text-xs text-slate-500">{KIND_LABELS[f.kind][lang]}</p></div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${st[f.status][1]}`}>{st[f.status][0]}</span>
          </div>
          {f.status === "rejected" && f.rejectionReason && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{f.rejectionReason} <span className="block text-xs">{ru ? "Исправьте данные и сохраните — заявка снова уйдёт на проверку." : "Ma’lumotlarni tuzatib saqlang — ariza qayta tekshiruvga yuboriladi."}</span></p>}
          {f.status === "approved" && <Link href={`/mebel/${f.id}`} className="mt-2 inline-block text-sm text-brand underline">{ru ? "Открыть профиль на сайте →" : "Saytdagi profilni ochish →"}</Link>}
          <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">{ru ? "Фото" : "Rasmlar"}</h3>
          <FirmPhotos firmId={f.id} logo={mediaUrl(f.logoKey)} photos={f.photoKeys.map((k) => ({ key: k, url: mediaUrl(k) }))} />
          <details className="mt-5 rounded-2xl border border-slate-200">
            <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-brand [&::-webkit-details-marker]:hidden">✏️ {ru ? "Изменить данные компании" : "Firma ma’lumotlarini tahrirlash"}</summary>
            <div className="border-t border-slate-100 p-4">
              <FurnitureApplicationForm editId={f.id} regions={regions.map((r) => ({ id: r.id, name: ru ? r.nameRu : r.nameUz }))}
                init={{ contactName: f.contactName, phone: f.phone, telegramUsername: f.telegramUsername ?? "" }}
                full={{ name: f.name, kind: f.kind, products: f.products, description: f.description, regionId: String(f.regionId), address: f.address, website: f.website ?? "" }} />
            </div>
          </details>
          <div className="mt-4 flex justify-end"><DeleteFirmButton id={f.id} /></div>
        </section>))}</div>
    </div>
  );
}
