import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite"],
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
