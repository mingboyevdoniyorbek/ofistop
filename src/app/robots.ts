import { publicSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";
// Fly builds without runtime secrets; read APP_URL when the request arrives.
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  const base = publicSiteUrl();
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/kabinet", "/admin", "/api", "/kirish", "/media"] }], sitemap: `${base}/sitemap.xml` };
}
