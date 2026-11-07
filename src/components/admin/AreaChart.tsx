"use client";
import { useState } from "react";

/**
 * Bitta qatorli maydon grafigi (kunlik qiymatlar). Sichqoncha/barmoq bilan ustidan o'tilganda
 * vertikal chiziq va qiymat oynasi chiqadi. Rang — saytning asosiy ko'k rangi.
 */
export default function AreaChart({ data, label, unit, dark, color = "#2a78d6", best }: { data: { day: string; value: number }[]; label: string; unit: string; dark?: boolean; color?: string; best?: string }) {
  const grid = dark ? "rgba(255,255,255,0.07)" : "#e2e8f0", axis = dark ? "#7c8aa3" : "#64748b";
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = dark ? 240 : 220, P = { l: 36, r: 12, t: 12, b: 26 };
  const max = Math.max(4, ...data.map((d) => d.value));
  const nice = Math.ceil(max / 4) * 4;
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / Math.max(1, data.length - 1);
  const y = (v: number) => P.t + (H - P.t - P.b) * (1 - v / nice);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join("");
  const area = `${line}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const fmt = (iso: string) => iso.slice(8, 10) + "." + iso.slice(5, 7);
  // Ustidan o'tilmaganda (videodagidek) eng yaxshi kun ko'rsatib turiladi.
  const bestIdx = data.reduce((b, d, i) => (d.value > data[b].value ? i : b), 0);
  const at = hover ?? (best && data.length && data[bestIdx].value > 0 ? bestIdx : null);
  const h = at == null ? null : data[at];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto max-h-64 w-full touch-pan-y" role="img" aria-label={`${label}: ${data.map((d) => `${fmt(d.day)} — ${d.value}`).join(", ")}`}
        onMouseLeave={() => setHover(null)}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (data.length - 1))))); }}>
        <defs><linearGradient id={`adm-area-${color.slice(1)}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity={dark ? 0.45 : 0.28} /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient>
          <filter id="adm-glow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {[0, 1, 2, 3, 4].map((i) => { const v = (nice / 4) * i; return <g key={i}><line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={grid} strokeWidth="1" strokeDasharray={dark ? "4 6" : undefined} /><text x={P.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill={axis}>{v}</text></g>; })}
        {data.map((d, i) => (i % 5 === 0 || i === data.length - 1) && <text key={d.day} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill={axis}>{fmt(d.day)}</text>)}
        <path d={area} fill={`url(#adm-area-${color.slice(1)})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={dark ? 2.5 : 2} strokeLinejoin="round" strokeLinecap="round" filter={dark ? "url(#adm-glow)" : undefined} />
        {h && at != null && <>
          <line x1={x(at)} x2={x(at)} y1={P.t} y2={y(0)} stroke={dark ? "rgba(255,255,255,.25)" : "#94a3b8"} strokeDasharray="3 3" />
          <circle cx={x(at)} cy={y(h.value)} r="6" fill={color} stroke="#fff" strokeWidth="2.5" />
        </>}
      </svg>
      {h && at != null && <div className={`pointer-events-none absolute top-0 rounded-xl px-3 py-2 text-xs text-white shadow-lg ${dark ? "border border-white/10 bg-[#050a14]/90 backdrop-blur" : "bg-slate-900"}`}
        style={{ left: `clamp(0px, calc(${(x(at) / W) * 100}% - 50px), calc(100% - 110px))` }}>
        <p className="text-[11px] text-slate-300">{hover == null && best ? best : fmt(h.day)}</p><p className="text-sm font-bold">{h.value} {unit}</p></div>}
    </div>
  );
}
