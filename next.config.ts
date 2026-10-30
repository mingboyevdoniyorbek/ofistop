import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite"],
  async headers() {
    const security = [
      { key: "X-Frame-Options", value: "DENY" },                       // clickjacking: sayt boshqa sayt ichida ochilmaydi
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
    ];
    return [{ source: "/:path*", headers: security }];
  },
  async redirects() {
    // Enable the move only after the production origin has been configured.
    if (process.env.APP_URL?.replace(/\/+$/, "") !== "https://ofistop.uz") return [];
    return ["ofisijara.uz", "www.ofisijara.uz", "www.ofistop.uz"].map(host => ({
      source: "/:path*", has: [{ type: "host" as const, value: host.replaceAll(".", "\\.") }],
      destination: "https://ofistop.uz/:path*", permanent: true,
    }));
  },
};
export default nextConfig;
