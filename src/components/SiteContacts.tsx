import { siteInfo, telHref } from "@/lib/site-info";

/** Sayt egasi bilan bog'lanish havolalari (faqat sozlanganlari). */
export default function SiteContacts({ className = "" }: { className?: string }) {
  const s = siteInfo();
  const items: [string, string, string][] = [];
  if (s.phone) items.push(["☎", s.phone, telHref(s.phone)]);
  if (s.telegram) items.push(["✈", `@${s.telegram}`, `https://t.me/${s.telegram}`]);
  if (s.email) items.push(["✉", s.email, `mailto:${s.email}`]);
  if (s.instagram) items.push(["◎", `@${s.instagram}`, `https://instagram.com/${s.instagram}`]);
  if (!items.length) return null;
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}>
      {items.map(([icon, label, href]) => <li key={href}><a href={href} className="hover:underline" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}><span aria-hidden="true">{icon}</span> {label}</a></li>)}
    </ul>
  );
}
