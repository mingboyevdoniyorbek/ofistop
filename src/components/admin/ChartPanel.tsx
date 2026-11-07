"use client";
import { useState } from "react";
import AreaChart from "./AreaChart";

type Series = { key: string; label: string; unit: string; color: string; data: { day: string; value: number }[] };

/** Bosh paneldagi katta grafik: ko'rsatkichni (tashriflar / ko'rishlar / e'lonlar) va davrni (7 / 30 kun) tanlash. */
export default function ChartPanel({ series, best, ranges }: { series: Series[]; best: string; ranges: [string, string] }) {
  const [k, setK] = useState(series[0]?.key);
  const [days, setDays] = useState(30);
  const s = series.find((x) => x.key === k) ?? series[0];
  if (!s) return null;
  const data = s.data.slice(-days);
  const sum = data.reduce((n, d) => n + d.value, 0);
  const pill = (on: boolean) => `rounded-xl px-3 py-1.5 text-xs font-semibold transition ${on ? "bg-[#fff] text-[#0b1424] shadow" : "text-slate-400 hover:text-white"}`;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Ko‘rsatkich" className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-white/[.05] p-1">
          {series.map((x) => <button key={x.key} type="button" role="tab" aria-selected={x.key === s.key} onClick={() => setK(x.key)} className={`${pill(x.key === s.key)} whitespace-nowrap`}>
            <span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: x.color }} />{x.label}</button>)}
        </div>
        <div role="group" aria-label="Davr" className="flex gap-1 rounded-2xl bg-white/[.05] p-1">
          {[7, 30].map((d, i) => <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={pill(days === d)}>{ranges[i]}</button>)}
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-white">{sum.toLocaleString("ru-RU")} <span className="text-sm font-medium text-slate-400">{s.unit} · {days === 7 ? ranges[0] : ranges[1]}</span></p>
      <div className="mt-2"><AreaChart dark data={data} label={s.label} unit={s.unit} color={s.color} best={best} /></div>
    </div>
  );
}
