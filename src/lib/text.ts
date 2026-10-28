// O'zbekcha apostrof variantlari: ' ʻ ʼ ` ´ ‘ ’ — barchasi bitta belgiga keltiriladi.
export function normalizeUz(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[\u02bb\u02bc\u2018\u2019\u0060\u00b4\u2032']/g, "'")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Qidiruv uchun apostrofni butunlay olib tashlaydi: o'zbek == o‘zbek == ozbek emas, lekin o'zbek == o`zbek == ozbek ham mos. */
export function searchKey(s: string): string {
  return normalizeUz(s).replace(/'/g, "");
}

export function normalizePhoneUz(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  const d = digits.startsWith("+") ? digits.slice(1) : digits;
  let national: string;
  if (d.startsWith("998") && d.length === 12) national = d.slice(3);
  else if (d.length === 9) national = d;
  else return null;
  return /^\d{9}$/.test(national) ? `+998${national}` : null;
}

const TRANSLIT: Record<string, string> = { "o'": "o", "g'": "g", "sh": "sh", "ch": "ch" };
export function slugify(s: string): string {
  let out = normalizeUz(s);
  for (const [k, v] of Object.entries(TRANSLIT)) out = out.split(k).join(v);
  return out.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "joy";
}
