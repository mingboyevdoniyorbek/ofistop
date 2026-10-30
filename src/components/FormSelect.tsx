"use client";
import { useState, type ChangeEvent, type SelectHTMLAttributes } from "react";
import InlineSelect from "./InlineSelect";

/**
 * Oddiy <select> o'rnini bosadi: Android'dagi to'liq ekranli tizim oynasi o'rniga maydon ostida ochiladigan ro'yxat.
 * Forma uchun qiymat yashirin input orqali yuboriladi; `defaultValue` (boshqarilmaydigan) yoki `value`+`onChange` ishlaydi.
 */
export default function FormSelect({ name, defaultValue, value, onChange, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  const [own, setOwn] = useState(String(defaultValue ?? ""));
  const cur = value !== undefined ? String(value) : own;
  return <>
    <InlineSelect {...rest} value={cur} onChange={(e: ChangeEvent<HTMLSelectElement>) => { if (value === undefined) setOwn(e.target.value); onChange?.(e); }}>{children}</InlineSelect>
    {name && <input type="hidden" name={name} value={cur} />}
  </>;
}
