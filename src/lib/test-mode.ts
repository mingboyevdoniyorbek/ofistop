/** Enabled only by the local test launcher; never grants access in production. */
export function localTestEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.APP_MODE === "test" && process.env.TEST_DATABASE === "embedded";
}

export const testAccounts = {
  admin: { phone: "+998000000010", name: "Test administrator", role: "admin" },
  user: { phone: "+998000000001", name: "Test mulk egasi", role: "user" },
} as const;
