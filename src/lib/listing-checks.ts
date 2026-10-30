/**
 * Moderatorga yordam: e'londagi ziddiyatlarni avtomatik topadi (e'lonni o'zi rad etmaydi).
 * Masalan, sarlavhada "20 m2" deyilgan, maydon maydonida esa 25 m² kiritilgan.
 */
export function listingWarnings(l: { title: string; description?: string | null; areaM2: string | number | null; floor?: number | null; totalFloors?: number | null }, ru = false): string[] {
  const out: string[] = [];
  const area = l.areaM2 == null ? null : Number(l.areaM2);
  const nums = [...l.title.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|kv\.?\s*m|кв\.?\s*м|м2|м²|kvm)/gi)].map((m) => Number(m[1].replace(",", ".")));
  if (area != null && nums.length && !nums.some((n) => Math.abs(n - area) <= Math.max(1, area * 0.02)))
    out.push(ru ? `В заголовке ${nums.join(", ")} м², а в поле площади ${area} м²` : `Sarlavhada ${nums.join(", ")} m², maydon maydonida esa ${area} m²`);
  const fl = [...l.title.matchAll(/(\d+)\s*-?\s*(?:qavat|этаж)/gi)].map((m) => Number(m[1]));
  if (l.floor != null && fl.length && !fl.includes(l.floor))
    out.push(ru ? `В заголовке ${fl.join(", ")}-й этаж, а в поле этажа ${l.floor}` : `Sarlavhada ${fl.join(", ")}-qavat, qavat maydonida esa ${l.floor}`);
  if (/(\+?998[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/.test(l.title)) out.push(ru ? "В заголовке указан номер телефона" : "Sarlavhada telefon raqami yozilgan");
  return out;
}
