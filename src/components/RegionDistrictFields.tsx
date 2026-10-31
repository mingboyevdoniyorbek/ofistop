"use client";
import { useState } from "react";
import FormSelect from "./FormSelect";

/** Forma uchun hudud + tuman juftligi: hudud almashsa tuman ro'yxati shu hududnikiga o'zgaradi. */
export default function RegionDistrictFields({ regions, districts, region, district, labels, className }: {
  regions: { id: number; name: string }[]; districts: { id: number; regionId: number; name: string }[];
  region: string; district: string; labels: { region: string; district: string; all: string }; className: string;
}) {
  const [r, setR] = useState(region); const [d, setD] = useState(district);
  return <>
    <label className="text-sm">{labels.region}<FormSelect name="region" className={className} value={r} onChange={(e) => { setR(e.target.value); setD(""); }}>
      <option value="">{labels.all}</option>{regions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</FormSelect></label>
    <label className="text-sm">{labels.district}<FormSelect name="district" className={className} value={d} onChange={(e) => setD(e.target.value)}>
      <option value="">{labels.all}</option>{districts.filter((x) => !r || String(x.regionId) === r).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</FormSelect></label>
  </>;
}
