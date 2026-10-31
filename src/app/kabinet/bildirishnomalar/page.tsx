import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { requireUserPage } from "@/lib/page-auth";
import NotificationsRead from "@/components/NotificationsRead";
import { getT } from "@/lib/i18n";
import { trServer } from "@/lib/server-i18n";
import TelegramNotifyToggle from "@/components/TelegramNotifyToggle";
import { botUsername, telegramEnabled } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export default async function Notifications() {
  const u = await requireUserPage("/kabinet/bildirishnomalar");
  const { locale, t } = await getT();
  const rows = await db().select().from(s.notifications).where(eq(s.notifications.userId, u.id)).orderBy(desc(s.notifications.createdAt)).limit(50);
  const unread = rows.filter((r) => !r.readAt).length;
  const [me] = await db().select({ notify: s.users.telegramNotify, linked: s.telegramLinks.chatId }).from(s.users).leftJoin(s.telegramLinks, eq(s.telegramLinks.phone, s.users.phone)).where(eq(s.users.id, u.id));
  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><h1 className="text-xl font-bold">{t("cab.nav.notifications")}</h1>{unread > 0 && <NotificationsRead />}</div>
      {telegramEnabled() && <div className="mb-4"><TelegramNotifyToggle initial={me?.notify ?? true} linked={me?.linked != null} bot={botUsername() || null} /></div>}
      {rows.length === 0 && <p className="rounded border border-dashed border-slate-300 p-6 text-center text-slate-500">{t("notif.empty")}</p>}
      <ul className="space-y-2">{rows.map((n) => (
        <li key={n.id} className={`rounded border p-3 text-sm ${n.readAt ? "border-slate-200" : "border-brand bg-blue-50"}`}>
          <p className="font-medium">{n.href ? <Link href={n.href} className="underline">{trServer(n.title, locale)}</Link> : trServer(n.title, locale)}</p>
          {n.body && <p className="text-slate-600">{trServer(n.body, locale)}</p>}
          <p className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString(locale === "ru" ? "ru-RU" : "uz-UZ")}</p>
        </li>))}</ul>
    </div>
  );
}
