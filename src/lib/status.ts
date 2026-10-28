export type Moderation = "draft" | "pending" | "approved" | "rejected";
export type Availability = "available" | "reserved" | "rented" | "paused" | "expired" | "archived";
export type Role = "user" | "moderator" | "admin";

const MOD_ACTOR: Record<string, { from: Moderation[]; to: Moderation; by: ("owner" | "moderator")[] }> = {
  submit:  { from: ["draft", "rejected"], to: "pending",  by: ["owner"] },
  approve: { from: ["pending"],           to: "approved", by: ["moderator"] },
  reject:  { from: ["pending"],           to: "rejected", by: ["moderator"] },
  edit:    { from: ["approved"],          to: "pending",  by: ["owner"] }, // tasdiqlangan e'lon muhim maydonlari o'zgardi
};

export function moderationTransition(action: keyof typeof MOD_ACTOR, from: Moderation, actor: "owner" | "moderator", reason?: string) {
  const rule = MOD_ACTOR[action];
  if (!rule) return { ok: false as const, error: "Noma'lum amal" };
  if (!rule.by.includes(actor)) return { ok: false as const, error: "Ruxsat yo'q" };
  if (!rule.from.includes(from)) return { ok: false as const, error: "Bu holatda amal mumkin emas" };
  if (action === "reject" && !reason?.trim()) return { ok: false as const, error: "Rad etish sababi majburiy" };
  return { ok: true as const, to: rule.to };
}

const AVAIL: Record<Availability, Availability[]> = {
  available: ["reserved", "rented", "paused", "archived"],
  reserved:  ["available", "rented", "paused", "archived"],
  paused:    ["available", "archived"],
  rented:    ["available", "archived"],
  expired:   ["available", "archived"],  // qayta faollashtirish
  archived:  [],
};
export function canChangeAvailability(from: Availability, to: Availability) {
  return AVAIL[from]?.includes(to) ?? false;
}

/** Ommaviy qidiruvga chiqish sharti (SQL bilan bir xil mantiq). */
export function isPubliclyVisible(l: { moderationStatus: Moderation; availabilityStatus: Availability; expiresAt: Date | null; isSuspended?: boolean; ownerBlocked?: boolean }, now = new Date()) {
  return !l.isSuspended && !l.ownerBlocked && l.moderationStatus === "approved" && l.availabilityStatus === "available" && l.expiresAt !== null && l.expiresAt > now;
}

/** Tasdiqlangan e'londa shu maydonlar o'zgarsa qayta moderatsiya kerak. "Ijaraga berildi" esa darhol. */
const REMODERATE = ["title", "description", "address", "lat", "lng", "areaM2", "priceAmountMinor", "currency", "pricePeriod", "priceBasis", "images", "category", "posterType", "regionId", "districtId", "centerId", "unitCode", "contactPhone", "telegramUsername", "depositAmountMinor", "depositCurrency", "commissionType", "commissionFixedMinor", "commissionCurrency", "commissionPercent", "commissionPercentBase", "serviceFeeMinor", "serviceFeeCurrency", "serviceFeePeriod", "amenities", "utilities", "seats", "roomsCount", "floor", "totalFloors", "furnished", "minTermMonths", "priceNegotiable", "exactLocationPublic", "unitCodePublic", "availableFrom"];
export function needsRemoderation(changedFields: string[]) {
  return changedFields.some((f) => REMODERATE.includes(f));
}

export function canEditListing(user: { id: string; role: Role }, listing: { ownerId: string }, managedCenterIds: string[] = [], listingCenterId: string | null = null) {
  if (user.role === "admin") return true;
  if (listing.ownerId === user.id) return true;
  return !!listingCenterId && managedCenterIds.includes(listingCenterId);
}
export const canModerate = (r: Role) => r === "moderator" || r === "admin";
export const isAdmin = (r: Role) => r === "admin";

/** Egasi tasdiqlangan e'lonni tahrirlaganda (REMODERATE maydonlari) e'lon qayta tekshiruvga o'tadi. */
export function effectiveAvailability(l: { availabilityStatus: Availability; expiresAt: Date | null }, now = new Date()): Availability {
  return l.availabilityStatus === "available" && l.expiresAt !== null && l.expiresAt <= now ? "expired" : l.availabilityStatus;
}
