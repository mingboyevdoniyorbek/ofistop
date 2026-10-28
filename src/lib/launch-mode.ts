import { localTestEnabled } from "./test-mode";

/** A reversible launch switch. SMS code stays in place for the later rollout. */
export function promoEnabled(now = Date.now()) {
  const enabled = process.env.PROMO_MODE === "true" || (localTestEnabled() && process.env.PROMO_MODE !== "false");
  if (!enabled) return false;
  const until = process.env.PROMO_ENDS_AT;
  if (!until) return true; // Switch off manually when real SMS and pricing are ready.
  const deadline = Date.parse(until);
  return Number.isFinite(deadline) && now < deadline;
}

export const isGuestPhone = (phone: string) => phone.startsWith("guest:");
