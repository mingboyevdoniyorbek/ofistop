"use client";
import { useRouter } from "next/navigation";
import { useT } from "./I18nProvider";
export default function NotificationsRead() {
  const t = useT(); const router = useRouter();
  return <button type="button" className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={async () => { await fetch("/api/notifications", { method: "POST" }).catch(() => null); router.refresh(); }}>{t("notif.markAll")}</button>;
}
