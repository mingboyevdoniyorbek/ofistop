"use client";
import { useT } from "./I18nProvider";
export default function LogoutButton() {
  const t = useT();
  return <button className="text-brand hover:underline" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/"; }}>{t("nav.logout")}</button>;
}
