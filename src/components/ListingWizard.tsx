"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { labels, priceLabel, totalLabel, primaryPrice } from "@/lib/format";
import type { MsgKey } from "@/messages/uz";
import { useLocale, useT } from "./I18nProvider";
import PickMap from "./PickMap";
import { parseMajorToMinor } from "@/lib/money";
import { STEP_OF as ORIGINAL_STEPS, USES_FLOOR, USES_SEATS, type Form } from "@/lib/listing-input";

type F = Required<Form>;
type Img = { id: string; url: string | null; thumbUrl: string | null; isPrimary: boolean };
interface Props { promo?: boolean; updatedAt: string; id: string; slug: string; initial: F; images: Img[]; moderation: "draft" | "pending" | "approved" | "rejected"; rejectionReason: string | null; archived: boolean;
  regions: { id: number; name: string }[]; districts: { id: number; regionId: number; name: string }[]; amenities: { code: string; name: string }[]; centers: { id: string; name: string }[] }

const STEP_OF = Object.fromEntries(Object.entries(ORIGINAL_STEPS).map(([key, step]) => [key, step <= 3 ? step : step === 4 ? 3 : 4]));
/** Xatolar ro'yxatidagi maydon nomlari (forma yorliqlari bilan bir xil kalitlar). */
const LABELS: Record<string, MsgKey> = { title: "wiz.f.title", description: "wiz.f.description", regionId: "f.region", districtId: "f.district", address: "wiz.f.address", areaM2: "f.area", priceAmount: "f.price", priceBasis: "wiz.f.basis", seats: "wiz.f.seats", commissionFixed: "wiz.f.commFixed", commissionPercent: "wiz.f.commPct", commissionPercentBase: "wiz.f.commBase", depositAmount: "wiz.l.deposit", contactPhone: "wiz.f.phone", telegramUsername: "prof.telegram", images: "wiz.l.images", lat: "wiz.lat", lng: "wiz.lng", floor: "wiz.f.floor", totalFloors: "wiz.f.totalFloors", minTermMonths: "wiz.f.minTerm", availableFrom: "wiz.f.availFrom", centerId: "wiz.f.center", unitCode: "wiz.f.unitCode", roomsCount: "wiz.f.rooms", serviceFee: "wiz.f.serviceFee" };
const inp = "w-full rounded border border-slate-300 px-3 py-2.5 bg-white";

function E({ k, errors }: { k: string; errors: Record<string, string> }) {
  return errors[k] ? <span id={`err-${k}`} role="alert" className="mt-1 block text-sm text-red-700">{errors[k]}</span> : null;
}
function L({ k, label, children, hint, errors }: { k: string; label: string; children: React.ReactNode; hint?: string; errors: Record<string,string> }) {
  return <label className="block text-sm"><span className="font-medium">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}<E k={k} errors={errors} /></label>;
}

export default function ListingWizard(p: Props) {
  const router = useRouter();
  const version = useRef(p.updatedAt);
  const t = useT(); const locale = useLocale(); const LB = labels(locale);
  const steps = locale === "ru" ? ["О помещении", "Адрес", "Цена и фотографии", "Проверка и отправка"] : ["Joy haqida", "Manzil", "Narx va rasmlar", "Tekshirish va yuborish"];
  const publishLabel = t("wiz.submitTitle");
  const [f, setF] = useState<F>(p.initial);
  const [saved, setSaved] = useState(JSON.stringify(p.initial));
  const dirty = JSON.stringify(f) !== saved;
  const latest = useRef(f); latest.current = f;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const navigate = (event: MouseEvent) => {
      const a = (event.target as Element).closest?.("a[href]");
      if (a && !window.confirm(locale === "ru" ? "Изменения не сохранены. Выйти?" : "O‘zgarishlar saqlanmagan. Chiqasizmi?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", navigate, true); };
  }, [dirty, locale]);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [warn, setWarn] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [backgroundSaving, setBackgroundSaving] = useState(false);
  const saveActive = useRef(false);
  const lastAttempt = useRef<string | null>(null);
  const [images, setImages] = useState<Img[]>(p.images);
  const [upRes, setUpRes] = useState<{ name: string; ok: boolean; error?: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof F>(k: K, v: F[K]) => setF((x) => ({ ...x, [k]: v }));
  const seats = USES_SEATS.includes(f.category), floors = USES_FLOOR.includes(f.category);
  const editable = !p.archived;

  async function save(background = false): Promise<boolean> {
    if (busy || saveActive.current) return false;
    const fields = latest.current;
    const snapshot = JSON.stringify(fields);
    saveActive.current = true;
    lastAttempt.current = snapshot;
    setBackgroundSaving(background); setBusy(true); setMsg(null); setWarn([]);
    try {
      const r = await fetch(`/api/listings/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields, expectedUpdatedAt: version.current }) }).catch(() => null);
      const d = await r?.json().catch(() => ({}));
      if (!r) { setMsg({ ok: false, t: t("wiz.netSave") }); return false; }
      const unchanged = JSON.stringify(latest.current) === snapshot;
      if (!r.ok) {
        if (unchanged) {
          setErrors(d.errors ?? {}); setMsg({ ok: false, t: d.error ?? t("wiz.saveFail") });
          const first = Object.keys(d.errors ?? {})[0];
          // Background validation must never move the user to another step.
          if (!background && first && STEP_OF[first]) setStep(STEP_OF[first]);
        }
        return false;
      }
      if (d.updatedAt) version.current = d.updatedAt;
      // Only this snapshot was saved; text entered during the request stays dirty.
      setSaved(snapshot);
      if (unchanged) {
        setErrors({}); setWarn(d.warnings ?? []);
        setMsg({ ok: true, t: d.remoderation ? t("wiz.savedRemod") : t("wiz.saved") });
      }
      return true;
    } finally {
      saveActive.current = false; setBusy(false); setBackgroundSaving(false);
    }
  }
  useEffect(() => {
    if (!dirty || busy || !editable || p.moderation !== "draft") return;
    // Retry on a new edit or explicit Save, not endlessly on an unchanged error.
    if (JSON.stringify(f) === lastAttempt.current) return;
    const timer = window.setTimeout(() => { void save(true); }, 2000);
    return () => window.clearTimeout(timer);
  }, [f, dirty, busy, editable, p.moderation]);

  async function go(n: number) { if (editable && !(await save())) return; setStep(n); window.scrollTo({ top: 0 }); }

  async function upload(files: FileList | null) {
    if (!files?.length) return; setBusy(true); setMsg(null); setUpRes([]);
    const fd = new FormData(); [...files].forEach((x) => fd.append("files", x));
    const r = await fetch(`/api/listings/${p.id}/images`, { method: "POST", body: fd }).catch(() => null);
    const d = await r?.json().catch(() => ({})); setBusy(false); if (fileRef.current) fileRef.current.value = "";
    if (!r) return setMsg({ ok: false, t: t("wiz.netUpload") });
    if (d.updatedAt) version.current = d.updatedAt;
    if (d.images) setImages(d.images); if (d.results) setUpRes(d.results);
    if (!r.ok && !d.results) setMsg({ ok: false, t: d.error ?? t("wiz.uploadFail") });
    if (d.remoderation) setMsg({ ok: true, t: t("wiz.imgRemod") });
  }
  async function imgCall(url: string, init: RequestInit) {
    setBusy(true); const r = await fetch(url, init).catch(() => null); const d = await r?.json().catch(() => ({})); setBusy(false);
    if (!r?.ok) return setMsg({ ok: false, t: d?.error ?? t("err.generic") });
    if (d.updatedAt) version.current = d.updatedAt;
    setImages(d.images); if (d.remoderation) setMsg({ ok: true, t: t("wiz.imgRemod") });
  }
  const reorder = (order: string[], primary: string) => imgCall(`/api/listings/${p.id}/images`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order, primary }) });
  const move = (i: number, dir: -1 | 1) => { const o = images.map((x) => x.id); [o[i], o[i + dir]] = [o[i + dir], o[i]]; reorder(o, images.find((x) => x.isPrimary)?.id ?? o[0]); };

  async function submit() {
    if (!(await save())) return; setBusy(true);
    const r = await fetch(`/api/listings/${p.id}/submit`, { method: "POST" }).catch(() => null); const d = await r?.json().catch(() => ({})); setBusy(false);
    if (!r) return setMsg({ ok: false, t: t("wiz.net") });
    if (r.status === 401) { location.href = `/kirish?next=/kabinet/elon/${p.id}`; return; }
    if (!r.ok) { setErrors(d.errors ?? {}); const first = Object.keys(d.errors ?? {})[0]; if (first && STEP_OF[first]) setStep(STEP_OF[first]); return setMsg({ ok: false, t: d.error ?? t("wiz.submitFail") }); }
    router.push(d.moderationStatus === "approved" ? "/kabinet?holat=active" : "/kabinet?holat=pending");
  }

  const bad = (k: string) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `err-${k}` } as const : {});
  const bind = (k: keyof F) => ({ value: f[k] as string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never), ...bad(k) });
  // Asosiy narx valyutasi o'zgarsa, unga teng bo'lgan depozit/komissiya/xizmat to'lovi valyutalari ham ergashadi (tasodifiy UZS/USD aralashuvining oldini oladi).
  const setCur = (k: keyof F, v: "UZS" | "USD") => setF((x) => k !== "currency" ? { ...x, [k]: v } : {
    ...x, currency: v,
    ...(x.depositCurrency === x.currency ? { depositCurrency: v } : {}), ...(x.commissionCurrency === x.currency ? { commissionCurrency: v } : {}), ...(x.serviceFeeCurrency === x.currency ? { serviceFeeCurrency: v } : {}),
  });
  const cur = (k: keyof F) => <select aria-label={t("f.currency")} className="rounded border border-slate-300 px-2" value={f[k] as string} onChange={(e) => setCur(k, e.target.value as "UZS" | "USD")}><option>UZS</option><option>USD</option></select>;

  const amount = parseMajorToMinor(f.priceAmount);
  const price = { amount, currency: f.currency, period: f.pricePeriod, basis: f.priceBasis, negotiable: f.priceNegotiable };
  const total = totalLabel(price, f.areaM2.replace(",", "."), locale);
  const distOpts = p.districts.filter((x) => x.regionId === f.regionId);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-xl font-bold">{p.moderation === "draft" ? t("wiz.titleNew") : t("wiz.titleEdit")}</h1>
      {p.archived && <p role="status" className="mb-3 rounded bg-amber-50 p-3 text-sm">{t("wiz.archived")}</p>}
      {p.moderation === "rejected" && <p role="status" className="mb-3 rounded border border-red-300 bg-red-50 p-3 text-sm"><strong>{t("wiz.rejected")}</strong> {p.rejectionReason}. {t("wiz.rejectedFix")}</p>}
      {p.moderation === "approved" && <p role="status" className="mb-3 rounded bg-slate-50 p-3 text-sm">{t("wiz.approvedNote")}</p>}
      <ol className="mb-5 flex flex-wrap gap-2" aria-label={t("wiz.stepsAria")}>
        {steps.map((label, i) => <li key={i}><button type="button" onClick={() => go(i + 1)} aria-current={step === i + 1 ? "step" : undefined} disabled={busy} className={`rounded-full border px-3 py-1 text-sm ${step === i + 1 ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{i + 1}. {label}</button></li>)}
      </ol>
          {Object.keys(errors).length > 0 && <div role="alert" className="mb-3 rounded border border-red-300 bg-red-50 p-3 text-sm"><p className="font-medium">{t("wiz.mustFill")}</p><ul className="mt-1 list-disc pl-5">{Object.entries(errors).map(([k, v]) => <li key={k}>{LABELS[k] ? t(LABELS[k]) : k}: {v} {STEP_OF[k] && <button type="button" onClick={() => setStep(STEP_OF[k])} className="text-brand underline">{t("wiz.fix")}</button>}</li>)}</ul></div>}

      <fieldset disabled={(busy && !backgroundSaving) || !editable} className="space-y-4">
        {step === 1 && <>
          <L errors={errors} k="category" label={t("wiz.f.category")}><select className={inp} value={f.category} onChange={(e) => setF(x => ({ ...x, category: e.target.value as F["category"], priceBasis: e.target.value !== "coworking" && x.priceBasis === "per_seat" ? "whole" : x.priceBasis }))}>{Object.entries(LB.category).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></L>
          <L errors={errors} k="title" label={t("wiz.f.title")} hint={t("wiz.h.title")}><input className={inp} maxLength={120} {...bind("title")} /></L>
          <L errors={errors} k="description" label={t("wiz.f.description")} hint={t("wiz.h.description")}><textarea className={inp} rows={6} maxLength={5000} {...bind("description")} /></L>
          <L errors={errors} k="posterType" label={t("prof.poster")}><select className={inp} {...bind("posterType")}>{Object.entries(LB.poster).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></L>
          <L errors={errors} k="centerId" label={t("wiz.f.center")} hint={p.centers.length ? t("wiz.h.centerYes") : t("wiz.h.centerNo")}>
            <select className={inp} value={f.centerId ?? ""} onChange={(e) => set("centerId", e.target.value || null)}><option value="">{t("wiz.noCenter")}</option>{p.centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></L>
          {f.centerId && <>
            <L errors={errors} k="unitCode" label={t("wiz.f.unitCode")} hint={t("wiz.h.unitCode")}><input className={inp} maxLength={40} {...bind("unitCode")} /></L>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.unitCodePublic} onChange={(e) => set("unitCodePublic", e.target.checked)} />{t("wiz.unitPublic")}</label></>}
        </>}

        {step === 2 && <>
          <L errors={errors} k="regionId" label={t("f.region")}><select className={inp} value={f.regionId} onChange={(e) => { set("regionId", Number(e.target.value)); set("districtId", null); }} {...bad("regionId")}>{p.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></L>
          <L errors={errors} k="districtId" label={t("f.district")} hint={distOpts.length ? undefined : t("wiz.h.noDistricts")}><select className={inp} value={f.districtId ?? ""} onChange={(e) => set("districtId", e.target.value ? Number(e.target.value) : null)}><option value="">{t("wiz.notSelected")}</option>{distOpts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></L>
          <L errors={errors} k="address" label={t("wiz.f.address")}><input className={inp} maxLength={200} {...bind("address")} /></L>
          <fieldset className="rounded border border-slate-200 p-3"><legend className="px-1 text-sm font-medium">{t("wiz.coords")}</legend>
            <p className="mb-2 text-xs text-slate-500">{t("wiz.coordsHint")}</p>
            <PickMap lat={f.lat} lng={f.lng} disabled={!editable} onPick={(la, ln) => setF((x) => ({ ...x, lat: la, lng: ln }))} />
            <div className="mt-3 grid grid-cols-2 gap-3"><L errors={errors} k="lat" label={t("wiz.lat")}><input className={inp} inputMode="decimal" placeholder="41.311081" {...bind("lat")} /></L><L errors={errors} k="lng" label={t("wiz.lng")}><input className={inp} inputMode="decimal" placeholder="69.240562" {...bind("lng")} /></L></div>
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.exactLocationPublic} onChange={(e) => set("exactLocationPublic", e.target.checked)} />{t("wiz.exactPublic")}</label>
            {(f.lat || f.lng) && editable && <button type="button" onClick={() => setF((x) => ({ ...x, lat: "", lng: "" }))} className="mt-2 text-sm text-brand underline">{t("wiz.clearCoords")}</button>}</fieldset>
        </>}

        {step === 3 && <>
          <div className="grid gap-3 sm:grid-cols-2">
            <L errors={errors} k="areaM2" label={t("f.area")}><input className={inp} inputMode="decimal" {...bind("areaM2")} /></L>
            {floors && <L errors={errors} k="floor" label={t("wiz.f.floor")}><input className={inp} inputMode="numeric" {...bind("floor")} /></L>}
            {floors && <L errors={errors} k="totalFloors" label={t("wiz.f.totalFloors")}><input className={inp} inputMode="numeric" {...bind("totalFloors")} /></L>}
            {seats && <L errors={errors} k="seats" label={t("wiz.f.seats")}><input className={inp} inputMode="numeric" {...bind("seats")} /></L>}
            <L errors={errors} k="roomsCount" label={t("wiz.f.rooms")}><input className={inp} inputMode="numeric" {...bind("roomsCount")} /></L>
            <L errors={errors} k="furnished" label={t("wiz.f.furnished")}><select className={inp} {...bind("furnished")}><option value="">{t("wiz.unspecified")}</option><option value="1">{t("f.furnYes")}</option><option value="0">{t("f.furnNo")}</option></select></L>
          </div>
          <fieldset className="space-y-3 rounded border border-slate-200 p-3"><legend className="px-1 text-sm font-medium">{t("f.price")}</legend>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><L errors={errors} k="priceAmount" label={t("wiz.f.amount")}><input className={inp} inputMode="decimal" {...bind("priceAmount")} /></L><div className="self-end">{cur("currency")}</div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <L errors={errors} k="pricePeriod" label={t("wiz.f.period")}><select className={inp} {...bind("pricePeriod")}><option value="month">{t("wiz.per.month")}</option><option value="day">{t("wiz.per.day")}</option><option value="hour">{t("wiz.per.hour")}</option></select></L>
              <L errors={errors} k="priceBasis" label={t("wiz.f.basis")}><select className={inp} {...bind("priceBasis")}><option value="whole">{t("wiz.b.whole")}</option><option value="per_m2">{t("wiz.b.per_m2")}</option>{seats && <option value="per_seat">{t("wiz.b.per_seat")}</option>}</select></L></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.priceNegotiable} onChange={(e) => set("priceNegotiable", e.target.checked)} />{t("wiz.negotiable")}</label>
            <p className="rounded bg-slate-50 p-2 text-sm" aria-live="polite">{t("wiz.preview")} <strong>{priceLabel(price, locale)}</strong>{total ? ` · ${total}` : ""}</p></fieldset>
          <fieldset className="space-y-3 rounded border border-slate-200 p-3"><legend className="px-1 text-sm font-medium">{t("wiz.extra")}</legend>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><L errors={errors} k="depositAmount" label={t("wiz.f.deposit")}><input className={inp} inputMode="decimal" {...bind("depositAmount")} /></L><div className="self-end">{cur("depositCurrency")}</div></div>
            <L errors={errors} k="commissionType" label={t("wiz.f.commission")}><select className={inp} {...bind("commissionType")}><option value="none">{t("wiz.c.none")}</option><option value="fixed">{t("wiz.c.fixed")}</option><option value="percent">{t("wiz.c.percent")}</option></select></L>
            {f.commissionType === "fixed" && <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><L errors={errors} k="commissionFixed" label={t("wiz.f.commFixed")}><input className={inp} inputMode="decimal" {...bind("commissionFixed")} /></L><div className="self-end">{cur("commissionCurrency")}</div></div>}
            {f.commissionType === "percent" && <div className="grid gap-3 sm:grid-cols-2"><L errors={errors} k="commissionPercent" label={t("wiz.f.commPct")}><input className={inp} inputMode="decimal" {...bind("commissionPercent")} /></L>
              <L errors={errors} k="commissionPercentBase" label={t("wiz.f.commBase")}><select className={inp} {...bind("commissionPercentBase")}><option value="monthly_rent">{t("wiz.cb.monthly")}</option><option value="annual_rent">{t("wiz.cb.annual")}</option></select></L></div>}
            <L errors={errors} k="utilities" label={t("wiz.f.utilities")}><select className={inp} {...bind("utilities")}><option value="">{t("wiz.unspecified")}</option><option value="included">{t("wiz.u.included")}</option><option value="separate">{t("wiz.u.separate")}</option><option value="partly">{t("wiz.u.partly")}</option></select></L>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><L errors={errors} k="serviceFee" label={t("wiz.f.serviceFee")}><input className={inp} inputMode="decimal" {...bind("serviceFee")} /></L><div className="self-end">{cur("serviceFeeCurrency")}</div></div>
            <L errors={errors} k="serviceFeePeriod" label={locale === "ru" ? "Период платы за обслуживание" : "Xizmat to‘lovi davri"}><select className={inp} {...bind("serviceFeePeriod")}><option value="month">{locale === "ru" ? "Ежемесячно" : "Har oy"}</option><option value="once">{locale === "ru" ? "Один раз" : "Bir martalik"}</option></select></L>
            <div className="grid gap-3 sm:grid-cols-2"><L errors={errors} k="minTermMonths" label={t("wiz.f.minTerm")}><input className={inp} inputMode="numeric" {...bind("minTermMonths")} /></L>
              <L errors={errors} k="availableFrom" label={t("wiz.f.availFrom")} hint={t("wiz.h.availFrom")}><input type="date" className={inp} {...bind("availableFrom")} /></L></div></fieldset>
        </>}

        {step === 3 && <>
          <section aria-labelledby="img-h"><h2 id="img-h" className="mb-1 font-medium">{t("wiz.images", { n: images.length })}</h2>
            <p className="mb-2 text-xs text-slate-500">{t("wiz.imgHint")}</p>
            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy || !editable || images.length >= 15} onChange={(e) => upload(e.target.files)} aria-label={t("wiz.pickImg")} className="block w-full text-sm" />
            {upRes.some((r) => !r.ok) && <ul role="alert" className="mt-2 space-y-0.5 text-sm text-red-700">{upRes.filter((r) => !r.ok).map((r) => <li key={r.name}>{r.name}: {r.error}</li>)}</ul>}
            {upRes.some((r) => r.ok) && <p role="status" className="mt-1 text-sm text-green-700">{t("wiz.uploaded", { n: upRes.filter((r) => r.ok).length })}</p>}
            <E errors={errors} k="images" />
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((im, i) => (
              <li key={im.id} className="rounded border border-slate-200 p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {im.thumbUrl ? <img src={im.thumbUrl} alt={t("wiz.imgAlt", { n: i + 1 })} className="aspect-[4/3] w-full rounded object-cover" /> : <div className="aspect-[4/3] bg-slate-100" />}
                <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
                  {im.isPrimary ? <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-900">{t("wiz.primary")}</span> : <button type="button" disabled={busy} onClick={() => reorder(images.map((x) => x.id), im.id)} className="rounded border border-slate-300 px-1.5 py-0.5">{t("wiz.makePrimary")}</button>}
                  <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={t("wiz.moveEarlier")} className="rounded border border-slate-300 px-1.5 py-0.5">←</button>
                  <button type="button" disabled={busy || i === images.length - 1} onClick={() => move(i, 1)} aria-label={t("wiz.moveLater")} className="rounded border border-slate-300 px-1.5 py-0.5">→</button>
                  <button type="button" disabled={busy} onClick={() => window.confirm(t("wiz.delConfirm")) && imgCall(`/api/listings/${p.id}/images/${im.id}`, { method: "DELETE" })} className="rounded border border-red-300 px-1.5 py-0.5 text-red-700">{t("wiz.del")}</button>
                </div></li>))}</ul></section>
          <fieldset className="rounded border border-slate-200 p-3"><legend className="px-1 text-sm font-medium">{t("f.amenities")}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{p.amenities.filter(a => f.amenities.includes(a.code) || !["three_phase", "truck_access"].includes(a.code) || ["warehouse", "production", "retail"].includes(f.category)).map((a) => <label key={a.code} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.amenities.includes(a.code)} onChange={(e) => set("amenities", e.target.checked ? [...f.amenities, a.code] : f.amenities.filter((x) => x !== a.code))} />{a.name}</label>)}</div></fieldset>
        </>}

        {step === 4 && <>
          <L errors={errors} k="contactPhone" label={t("wiz.f.phone")} hint={t("wiz.h.phone")}><input className={inp} inputMode="tel" placeholder="+998 90 123 45 67" {...bind("contactPhone")} /></L>
          <L errors={errors} k="telegramUsername" label={t("prof.telegram")}><input className={inp} placeholder="@username" {...bind("telegramUsername")} /></L>
          <section aria-labelledby="pv"><h2 id="pv" className="mb-2 font-medium">{t("wiz.previewTitle")}</h2>
            <article className="max-w-xs overflow-hidden rounded-lg border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {images.find((x) => x.isPrimary)?.thumbUrl ? <img src={images.find((x) => x.isPrimary)!.thumbUrl!} alt="" className="aspect-[16/10] w-full object-cover" /> : <div className="grid aspect-[16/10] place-items-center bg-slate-100 text-sm text-slate-500">{t("card.noImg")}</div>}
              <div className="space-y-1 p-3"><h3 className="font-semibold">{f.title || t("wiz.noTitle")}</h3><p className="font-bold text-brand">{primaryPrice(price, f.areaM2.replace(",", "."), locale)}</p>
                {total && <p className="text-sm text-slate-600">{priceLabel(price, locale)}</p>}
                <p className="text-sm text-slate-600">{f.areaM2 ? `${f.areaM2} ${t("unit.m2")}` : ""}{f.floor ? ` · ${t("card.floor", { n: f.floor })}` : ""}</p>
                <p className="text-sm text-slate-600">{[p.districts.find((x) => x.id === f.districtId)?.name, p.regions.find((x) => x.id === f.regionId)?.name].filter(Boolean).join(", ")}</p>
                <p className="text-xs text-slate-500">{LB.poster[f.posterType]}</p></div></article></section>
        </>}

        {step === 4 && <section aria-labelledby="sub">
          <h2 id="sub" className="mb-2 font-medium">{p.moderation === "draft" || p.moderation === "rejected" ? publishLabel : t("wiz.saveTitle")}</h2>
          {p.moderation === "pending" && <p className="mb-3 text-sm">{t("wiz.pendingNote")}</p>}
          {(p.moderation === "draft" || p.moderation === "rejected") ? <>
            <p className="mb-3 text-sm text-slate-600">{t("wiz.submitNote")}</p>
            <button type="button" onClick={submit} disabled={busy || !editable} className="rounded bg-accent px-5 py-2.5 font-medium text-white disabled:opacity-60">{publishLabel}</button></> :
            <button type="button" onClick={async () => { if (await save()) router.push("/kabinet"); }} disabled={busy || !editable} className="rounded bg-brand px-5 py-2.5 font-medium text-white disabled:opacity-60">{t("prof.save")}</button>}
        </section>}
      </fieldset>

      {dirty && <p className="mt-3 text-sm text-amber-800" role="status">{locale === "ru" ? "Есть несохранённые изменения" : "Saqlanmagan o‘zgarishlar bor"}</p>}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-4 rounded p-2 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{msg.t}</p>}
      {warn.map((w) => <p key={w} role="status" className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">{w}</p>)}
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <button type="button" disabled={busy || step === 1} onClick={() => go(step - 1)} className="rounded border border-slate-300 px-4 py-2 disabled:opacity-50">{t("wiz.back")}</button>
        <button type="button" disabled={busy || !editable} onClick={() => void save()} className="rounded border border-brand px-4 py-2 text-brand disabled:opacity-50">{t("wiz.saveDraft")}</button>
        {step < 4 && <button type="button" disabled={busy} onClick={() => go(step + 1)} className="rounded bg-brand px-4 py-2 text-white disabled:opacity-60">{t("wiz.next")}</button>}
      </div>
    </div>
  );
}
