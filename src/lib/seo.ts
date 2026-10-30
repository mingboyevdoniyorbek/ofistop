import { isRuPath } from "./i18n";
import { publicSiteUrl } from "./site-url";
import { siteInfo } from "./site-info";

/** canonical + hreflang (uz, ru, x-default). `path` — /ru prefiksisiz, "/" bilan boshlanadi. */
export async function pageAlternates(path: string) {
  const ru = path === "/" ? "/ru" : `/ru${path}`;
  return { canonical: (await isRuPath()) ? ru : path, languages: { uz: path, ru, "x-default": path } };
}

export const absUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${publicSiteUrl()}${path}`);

/** Sayt bo'yicha Organization + WebSite (qidiruv bilan) tuzilgan ma'lumoti. */
export function siteJsonLd() {
  const s = siteInfo(), base = publicSiteUrl();
  const sameAs = [s.telegram && `https://t.me/${s.telegram}`, s.telegramChannel && `https://t.me/${s.telegramChannel}`, s.instagram && `https://instagram.com/${s.instagram}`].filter(Boolean);
  return [
    { "@context": "https://schema.org", "@type": "Organization", "@id": `${base}/#org`, name: "OfisTop", legalName: s.company ?? undefined, url: base, logo: `${base}/icon.png`,
      ...(s.phone || s.email ? { contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", telephone: s.phone ?? undefined, email: s.email ?? undefined, availableLanguage: ["uz", "ru"] }] } : {}),
      ...(sameAs.length ? { sameAs } : {}) },
    { "@context": "https://schema.org", "@type": "WebSite", "@id": `${base}/#site`, name: "OfisTop", url: base, inLanguage: ["uz", "ru"], publisher: { "@id": `${base}/#org` },
      potentialAction: { "@type": "SearchAction", target: `${base}/joylar?q={search_term_string}`, "query-input": "required name=search_term_string" } },
  ];
}

export function breadcrumbJsonLd(items: [string, string][]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: absUrl(path) })) };
}
