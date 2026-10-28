import { afterEach, expect, test, vi } from 'vitest';
import { promoEnabled } from '../src/lib/launch-mode';
import { authMethods } from '../src/lib/auth-methods';
afterEach(()=>vi.unstubAllEnvs());
test('production launch requires an explicit switch and respects its deadline',()=>{
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('PROMO_MODE','false');expect(promoEnabled()).toBe(false);
 vi.stubEnv('PROMO_MODE','true');vi.stubEnv('PROMO_ENDS_AT','2026-11-12T00:00:00+05:00');
 expect(promoEnabled(Date.parse('2026-11-11T18:59:59Z'))).toBe(true);
 expect(promoEnabled(Date.parse('2026-11-11T19:00:00Z'))).toBe(false);
 vi.stubEnv('PROMO_ENDS_AT','invalid');expect(promoEnabled()).toBe(false);
});
test('switching promo off restores configured SMS without changing the code',()=>{
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('APP_MODE','production');vi.stubEnv('PROMO_ENDS_AT','');vi.stubEnv('PROMO_MODE','true');
 vi.stubEnv('SMS_PROVIDER','eskiz');vi.stubEnv('ESKIZ_EMAIL','test@example.com');vi.stubEnv('ESKIZ_PASSWORD','test');
 expect(authMethods()).toMatchObject({guest:true,phone:false,telegram:false,test:false});
 vi.stubEnv('PROMO_MODE','false');expect(authMethods().phone).toBe(true);
});
