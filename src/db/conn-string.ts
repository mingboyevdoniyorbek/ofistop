/**
 * pg-connection-string yangi versiyasi `sslmode=require|prefer|verify-ca` uchun SECURITY WARNING chiqaradi
 * (hozir ular baribir verify-full kabi ishlaydi). Xatti-harakat o'zgarmasligi va ogohlantirish chiqmasligi uchun
 * ularni aniq `verify-full` ga almashtiramiz. Neon va boshqa ommaviy provayderlar tizim sertifikatlari bilan ishlaydi.
 */
export function normalizeConnectionString(url: string) {
  if (/[?&]uselibpqcompat=/.test(url)) return url;
  return url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/, "$1verify-full");
}
