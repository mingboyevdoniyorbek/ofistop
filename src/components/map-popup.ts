export type Marker = { id: string; href: string; title: string; category: string; area: number | null; price: string; total: string | null; thumb: string | null; lat: number; lng: number; approx: boolean; radiusM: number | null };

// Popup DOM orqali quriladi (textContent): e'lon sarlavhasi foydalanuvchi matni, innerHTML ishlatilmaydi (XSS).
export function popup(m: Marker, tx: { approx: string; m2: string } = { approx: "Taxminiy joylashuv", m2: "m²" }) {
  const el = document.createElement("div"); el.style.minWidth = "180px";
  if (m.thumb) { const img = document.createElement("img"); img.src = m.thumb; img.alt = ""; img.style.cssText = "width:100%;height:90px;object-fit:cover;border-radius:4px;margin-bottom:4px"; el.append(img); }
  const a = document.createElement("a"); a.href = m.href; a.textContent = m.title; a.style.cssText = "font-weight:600;display:block;color:#12308a"; el.append(a);
  const line = (t: string, s = "") => { const p = document.createElement("div"); p.textContent = t; p.style.cssText = `font-size:13px;${s}`; el.append(p); };
  line(m.price, "font-weight:700"); if (m.total) line(m.total);
  line(`${m.category}${m.area ? ` · ${m.area} ${tx.m2}` : ""}`, "color:#475569");
  if (m.approx) line(tx.approx, "color:#166534;font-size:12px");
  return el;
}

