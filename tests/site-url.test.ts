import { afterEach, expect, test, vi } from "vitest";
import config from "../next.config";
import { publicSiteUrl } from "../src/lib/site-url";
afterEach(()=>vi.unstubAllEnvs());
test("public production metadata falls back to OfisTop; local remains local",()=>{
 vi.stubEnv("APP_URL","");vi.stubEnv("NODE_ENV","production");expect(publicSiteUrl()).toBe("https://ofistop.uz");
 vi.stubEnv("NODE_ENV","development");expect(publicSiteUrl()).toBe("http://localhost:3000");
 vi.stubEnv("APP_URL","https://preview.example/");expect(publicSiteUrl()).toBe("https://preview.example");
});
test("domain redirects activate only for the configured new origin, without a redirect loop",async()=>{
 vi.stubEnv("APP_URL","http://localhost:3000");expect(await config.redirects!()).toEqual([]);
 vi.stubEnv("APP_URL","https://ofistop.uz");const rules=await config.redirects!();expect(rules).toHaveLength(3);
 for(const rule of rules){expect(rule.destination).toBe("https://ofistop.uz/:path*");expect(rule.source).toBe("/:path*");expect(rule.permanent).toBe(true);expect(rule.has?.[0].value).not.toBe("ofistop\\.uz");}
});
