import AdminAction from "./AdminAction";
import { isFeatured } from "./CenterBadges";
import DeleteCenterButton from "./DeleteCenterButton";

type Center = Record<string, unknown> & { id: string; name: string; verifiedAt: Date | null; featuredUntil: Date | null; viewCount: number; pendingChanges: Record<string, unknown> | null; pendingSubmittedAt: Date | null };
const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") : v == null || v === "" ? "—" : String(v));

/** Admin: markaz bo'yicha qarorlar paneli (vakil o'zgarishlari, ishonch belgisi, tavsiya etilgan joylashuv). */
export default function CenterReviewPanel({ c, ru, labels, rooms = 0 }: { c: Center; ru: boolean; labels: Record<string, string>; rooms?: number }) {
  const url = `/api/admin/centers/${c.id}/review`;
  const diff = c.pendingChanges ? Object.entries(c.pendingChanges).filter(([k, v]) => show(v) !== show(c[k])) : [];
  const featured = isFeatured(c);
  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">{ru ? "Просмотры" : "Ko‘rishlar"}: {c.viewCount}</span>
        {c.verifiedAt ? <AdminAction url={url} body={{ action: "unverify" }} label={ru ? "✓ Проверен — снять" : "✓ Tasdiqlangan — olib tashlash"} />
          : <AdminAction url={url} body={{ action: "verify" }} tone="primary" label={ru ? "Отметить «Проверенный»" : "«Tasdiqlangan» belgisini qo‘yish"} confirm={ru ? "Вы проверили центр и представителя?" : "Markaz va vakilni tekshirdingizmi?"} />}
        {featured ? <><span className="rounded bg-amber-100 px-2 py-1 text-amber-900">★ {ru ? "Рекомендуем до" : "Tavsiya etiladi"} {new Date(c.featuredUntil!).toLocaleDateString("ru-RU")}</span>
          <AdminAction url={url} body={{ action: "unfeature" }} label={ru ? "Снять" : "Olib tashlash"} /></>
          : <>{[7, 30, 90].map((d) => <AdminAction key={d} url={url} body={{ action: "feature", days: d }} label={`★ ${d} ${ru ? "дн." : "kun"}`} confirm={ru ? `Показывать центр в рекомендуемых ${d} дней?` : `Markaz ${d} kun «Tavsiya etiladi» bo‘lsinmi?`} />)}</>}
        <span className="ml-auto"><DeleteCenterButton id={c.id} name={c.name} rooms={rooms} /></span>
      </div>
      {c.pendingChanges && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="font-semibold text-amber-900">✏️ {ru ? "Представитель изменил данные — ожидает проверки" : "Vakil ma’lumotni o‘zgartirdi — tasdiq kutmoqda"}{c.pendingSubmittedAt && ` · ${new Date(c.pendingSubmittedAt).toLocaleString("ru-RU")}`}</p>
          {diff.length === 0 ? <p className="text-xs text-slate-600">{ru ? "Отличий нет." : "Farq yo‘q."}</p> : (
            <table className="mt-2 w-full text-xs"><tbody>{diff.map(([k, v]) => <tr key={k} className="border-t border-amber-200 align-top">
              <th className="py-1 pr-2 text-left font-medium">{labels[k] ?? k}</th><td className="py-1 pr-2 text-red-700 line-through">{show(c[k]).slice(0, 300)}</td><td className="py-1 text-green-800">{show(v).slice(0, 300)}</td></tr>)}</tbody></table>)}
          <div className="mt-2 flex flex-wrap gap-2">
            <AdminAction url={url} body={{ action: "approve_changes" }} tone="primary" label={ru ? "Одобрить изменения" : "O‘zgarishlarni tasdiqlash"} />
            <AdminAction url={url} body={{ action: "reject_changes" }} tone="danger" label={ru ? "Отклонить" : "Rad etish"} askReason={ru ? "Причина (её увидит представитель):" : "Sabab (vakil ko‘radi):"} />
          </div>
        </div>)}
    </div>
  );
}
