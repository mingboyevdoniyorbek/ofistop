import { afterEach, expect, test, vi } from "vitest";
import { scryptSync } from "node:crypto";
import { adminPasswordConfigured, verifyAdminPassword } from "../src/lib/admin-password";
afterEach(() => vi.unstubAllEnvs());
test("plaintext in ADMIN_PASSWORD_HASH is rejected as misconfiguration", async () => {
  vi.stubEnv("ADMIN_PASSWORD_HASH", "my-password");
  expect(adminPasswordConfigured()).toBe(false);
  expect(await verifyAdminPassword("ofis", "my-password")).toBe(false);
});
test("generated scrypt hash accepts only the configured login and original password", async () => {
  const password = "test-password-123", salt = "ab".repeat(16);
  vi.stubEnv("ADMIN_LOGIN", "ofis"); vi.stubEnv("ADMIN_PASSWORD_HASH", `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`);
  expect(adminPasswordConfigured()).toBe(true);
  expect(await verifyAdminPassword("ofis", password)).toBe(true);
  expect(await verifyAdminPassword("other", password)).toBe(false);
  expect(await verifyAdminPassword("ofis", "wrong")).toBe(false);
});
