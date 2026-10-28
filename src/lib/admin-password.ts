import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { localTestEnabled } from "./test-mode";

const derive = promisify(scrypt);
// Requested local credentials: ofis / ijara. Production must explicitly configure a hash.
const LOCAL_HASH = "scrypt:506ea7ac8176637676a752f3002350b6:02d24b2f74c692a152ea8b6f58f3731517836fd1e28f374e6f6efc64f4c7c6bcf337aab0df42dc595b8fcdb331a57577f89927233fb9651bae530ab6ccd8bc97";
export const adminPasswordHash = () => process.env.ADMIN_PASSWORD_HASH || (localTestEnabled() ? LOCAL_HASH : "");

export async function verifyAdminPassword(login: string, password: string) {
  const [algorithm, salt, expected] = adminPasswordHash().split(":");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(expected ?? "")) return false;
  const actual = await derive(password, salt, 64) as Buffer;
  const valid = timingSafeEqual(actual, Buffer.from(expected, "hex"));
  return valid && login === (process.env.ADMIN_LOGIN || "ofis");
}
