"use client";
import * as Select from "@radix-ui/react-select";
import { Children, isValidElement, type SelectHTMLAttributes, type ReactElement, type ChangeEvent } from "react";

const EMPTY = "__ofistop_empty__";
/** Anchored, keyboard accessible picker instead of Android's full-screen native dialog. */
export default function InlineSelect({ children, value, onChange, className, disabled, name, required, ...aria }: SelectHTMLAttributes<HTMLSelectElement>) {
  const options = Children.toArray(children).filter(isValidElement) as ReactElement<{ value?: string | number; children?: React.ReactNode; disabled?: boolean }>[];
  const current = String(value ?? "");
  const selected = options.find((o) => String(o.props.value ?? o.props.children ?? "") === current);
  return <Select.Root value={String(value ?? "") || EMPTY} disabled={disabled} name={name} required={required}
    onValueChange={v => onChange?.({ target: { value: v === EMPTY ? "" : v } } as ChangeEvent<HTMLSelectElement>)}>
    <Select.Trigger aria-label={aria['aria-label']} aria-invalid={aria['aria-invalid']} aria-describedby={aria['aria-describedby']}
      className={`${className ?? ""} flex items-center justify-between gap-2 text-left`}>
      {/* Tanlangan matn serverda ham chiqadi (JS yuklanguncha maydon bo'sh ko'rinmasin) */}
      <Select.Value>{selected?.props.children}</Select.Value><Select.Icon aria-hidden>⌄</Select.Icon>
    </Select.Trigger>
    <Select.Portal><Select.Content position="popper" side="bottom" align="start" sideOffset={4} collisionPadding={8}
      className="z-[2000] max-h-[min(280px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <Select.Viewport className="p-1">{options.map((o, i) => {
        const v = String(o.props.value ?? o.props.children ?? "") || EMPTY;
        return <Select.Item key={`${v}-${i}`} value={v} disabled={o.props.disabled} className="cursor-pointer rounded-lg px-3 py-3 text-sm outline-none data-[highlighted]:bg-blue-50 data-[state=checked]:font-semibold data-[state=checked]:text-blue-800 data-[disabled]:opacity-50">
          <Select.ItemText>{o.props.children}</Select.ItemText>
        </Select.Item>;
      })}</Select.Viewport>
    </Select.Content></Select.Portal>
  </Select.Root>;
}
