/**
 * Ommaviy (foydalanuvchiga bog'liq bo'lmagan) so'rovlar uchun qisqa muddatli xotira keshi.
 * Har bir server nusxasida alohida; bir vaqtdagi so'rovlar bitta bazaga murojaatni bo'lishadi.
 * Faqat hamma uchun bir xil ma'lumotga ishlating (sessiya/cookie'ga bog'liq natijaga emas).
 */
const store = new Map<string, { until: number; value: Promise<unknown> }>();
export function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now(), hit = store.get(key);
  if (hit && hit.until > now) return hit.value as Promise<T>;
  const value = fn();
  store.set(key, { until: now + ttlMs, value });
  value.catch(() => { if (store.get(key)?.value === value) store.delete(key); }); // xato keshlanmaydi
  if (store.size > 500) for (const [k, v] of store) if (v.until <= now) store.delete(k);
  return value;
}
