/** Public metadata fallback; authentication still requires an explicit APP_URL. */
export function publicSiteUrl() {
  return (process.env.APP_URL || (process.env.NODE_ENV === "production" ? "https://ofistop.uz" : "http://localhost:3000")).replace(/\/+$/, "");
}
