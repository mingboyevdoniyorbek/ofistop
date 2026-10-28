// CLI skriptlar uchun: .env.local va .env dagi qiymatlarni yuklaydi (Next.js buni faqat server uchun qiladi).
// Allaqachon o'rnatilgan muhit o'zgaruvchilari ustidan yozilmaydi. Fayl bo'lmasa jim o'tadi.
import { existsSync, readFileSync } from "fs";
for (const f of [`.env.${process.env.NODE_ENV ?? "development"}.local`, ".env.local", `.env.${process.env.NODE_ENV ?? "development"}`, ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m || process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1); else v = v.replace(/\s+#.*$/, "").trim();
    process.env[m[1]] = v;
  }
}
