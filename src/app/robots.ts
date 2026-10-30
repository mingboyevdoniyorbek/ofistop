import { publicSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";
// Fly builds without runtime secrets; read APP_URL when the request arrives.
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  const base = publicSiteUrl();
  const priv = ["/kabinet", "/admin", "/api", "/kirish", "/media", "/sevimlilar", "/taqqoslash"];
  // E'lon rasmlari (/api/media) Google Rasmlar va havola ko'rinishlari uchun ochiq.
  return { rules: [{ userAgent: "*", allow: ["/", "/api/media/"], disallow: [...priv, ...priv.map((p) => `/ru${p}`)] }], sitemap: `${base}/sitemap.xml` };
}
