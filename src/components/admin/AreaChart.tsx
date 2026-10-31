"use client";
import { useState } from "react";

/**
 * Bitta qatorli maydon grafigi (kunlik qiymatlar). Sichqoncha/barmoq bilan ustidan o'tilganda
 * vertikal chiziq va qiymat oynasi chiqadi. Rang — saytning asosiy ko'k rangi.
 */
export default function AreaChart({ data, label, unit }: { data: { day: string; value: number }[]; label: string; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 220, P = { l: 36, r: 12, t: 12, b: 26 };
  const max = Math.max(4, ...data.map((d) => d.value));
  const nice = Math.ceil(max / 4) * 4;
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / Math.max(1, data.length - 1);
  const y = (v: number) => P.t + (H - P.t - P.b) * (1 - v / nice);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join("");
  const area = `${line}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const fmt = (iso: string) => iso.slice(8, 10) + "." + iso.slice(5, 7);
  const h = hover == null ? null : data[hover];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto max-h-64 w-full touch-pan-y" role="img" aria-label={`${label}: ${data.map((d) => `${fmt(d.day)} — ${d.value}`).join(", ")}`}
        onMouseLeave={() => setHover(null)}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (data.length - 1))))); }}>
        <defs><linearGradient id="adm-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2a78d6" stopOpacity="0.28" /><stop offset="1" stopColor="#2a78d6" stopOpacity="0.02" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map((i) => { const v = (nice / 4) * i; return <g key={i}><line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth="1" /><text x={P.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#64748b">{v}</text></g>; })}
        {data.map((d, i) => (i % 5 === 0 || i === data.length - 1) && <text key={d.day} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#64748b">{fmt(d.day)}</text>)}
        <path d={area} fill="url(#adm-area)" />
        <path d={line} fill="none" stroke="#2a78d6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {h && hover != null && <>
          <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={y(0)} stroke="#94a3b8" strokeDasharray="3 3" />
          <circle cx={x(hover)} cy={y(h.value)} r="5" fill="#2a78d6" stroke="#fff" strokeWidth="2" />
        </>}
      </svg>
      {h && hover != null && <div className="pointer-events-none absolute top-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
        style={{ left: `clamp(0px, calc(${(x(hover) / W) * 100}% - 50px), calc(100% - 100px))` }}>
        <p className="font-semibold">{h.value} {unit}</p><p className="text-slate-300">{fmt(h.day)}</p></div>}
    </div>
  );
}
