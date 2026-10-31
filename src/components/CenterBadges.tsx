/** Markaz belgilari: "✓ Tasdiqlangan markaz" va "Tavsiya etiladi" (muddati tugamagan bo'lsa). */
export const isFeatured = (c: { featuredUntil: Date | string | null }) => !!c.featuredUntil && new Date(c.featuredUntil).getTime() > Date.now();
export default function CenterBadges({ c, ru, className = "" }: { c: { verifiedAt: Date | string | null; featuredUntil: Date | string | null }; ru: boolean; className?: string }) {
  if (!c.verifiedAt && !isFeatured(c)) return null;
  return <span className={`inline-flex flex-wrap gap-1.5 ${className}`}>
    {c.verifiedAt && <span title={ru ? "Администратор проверил центр и его представителя" : "Administrator markaz va uning vakilini tekshirgan"} className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">✓ {ru ? "Проверенный центр" : "Tasdiqlangan markaz"}</span>}
    {isFeatured(c) && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">★ {ru ? "Рекомендуем" : "Tavsiya etiladi"}</span>}
  </span>;
}
