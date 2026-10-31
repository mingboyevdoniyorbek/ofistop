/** Halqa diagramma (≤4 bo'lak): bo'laklar orasida 2px bo'shliq, pastda son va foizli izoh (rang yolg'iz emas). */
export default function DonutChart({ parts, total, totalLabel }: { parts: { label: string; value: number; color: string; href?: string }[]; total: number; totalLabel: string }) {
  const R = 70, C = 2 * Math.PI * R, gap = parts.filter((p) => p.value > 0).length > 1 ? 2 : 0;
  let acc = 0;
  return (
    <div>
      <svg viewBox="0 0 200 200" className="mx-auto h-48 w-48" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(", ")}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="#f1f5f9" strokeWidth="26" />
        {total > 0 && parts.map((p) => {
          const len = (p.value / total) * C; const off = acc; acc += len;
          if (!p.value) return null;
          return <circle key={p.label} cx="100" cy="100" r={R} fill="none" stroke={p.color} strokeWidth="26"
            strokeDasharray={`${Math.max(0, len - gap)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 100 100)"><title>{`${p.label}: ${p.value}`}</title></circle>;
        })}
        <text x="100" y="98" textAnchor="middle" fontSize="30" fontWeight="700" fill="#0f172a">{total}</text>
        <text x="100" y="120" textAnchor="middle" fontSize="12" fill="#64748b">{totalLabel}</text>
      </svg>
      <ul className="mt-4 grid grid-cols-2 gap-3">
        {parts.map((p) => { const pct = total ? Math.round((p.value / total) * 100) : 0; const body = <>
          <p className="text-xl font-bold text-slate-900">{pct}<sup className="text-xs">%</sup></p>
          <p className="flex items-center gap-1.5 text-xs text-slate-600"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />{p.label} · {p.value}</p></>;
          return <li key={p.label}>{p.href ? <a href={p.href} className="block rounded-lg p-1 hover:bg-slate-50">{body}</a> : <div className="p-1">{body}</div>}</li>; })}
      </ul>
    </div>
  );
}
