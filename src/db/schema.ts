import {
  pgTable, pgEnum, uuid, text, integer, bigint, boolean, timestamp, date,
  numeric, uniqueIndex, index, primaryKey, jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------- Enumlar ----------
export const roleEnum = pgEnum("role", ["user", "moderator", "admin"]);
export const posterTypeEnum = pgEnum("poster_type", ["owner", "business_center", "agency"]);
export const moderationEnum = pgEnum("moderation_status", ["draft", "pending", "approved", "rejected"]);
export const availabilityEnum = pgEnum("availability_status", ["available", "reserved", "rented", "paused", "expired", "archived"]);
export const currencyEnum = pgEnum("currency", ["UZS", "USD"]);
export const periodEnum = pgEnum("price_period", ["month", "day", "hour"]);
export const basisEnum = pgEnum("price_basis", ["whole", "per_m2", "per_seat"]);
export const commissionEnum = pgEnum("commission_type", ["none", "fixed", "percent"]);
export const percentBaseEnum = pgEnum("commission_percent_base", ["monthly_rent", "annual_rent"]);
export const utilitiesEnum = pgEnum("utilities", ["included", "separate", "partly"]);
export const categoryEnum = pgEnum("category", [
  "office", "bc_room", "coworking", "retail", "service_room", "warehouse", "production", "other",
]);
export const reportReasonEnum = pgEnum("report_reason", [
  "already_rented", "wrong_price", "false_info", "duplicate", "fraud_suspected", "other",
]);
export const reportStatusEnum = pgEnum("report_status", ["open", "resolved", "dismissed"]);
export const contactKindEnum = pgEnum("contact_kind", ["view", "phone_reveal", "telegram_click", "call_click"]);
export const memberRoleEnum = pgEnum("bc_member_role", ["manager"]);

// ---------- Foydalanuvchilar ----------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(), // E.164, masalan +998901234567
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
  role: roleEnum("role").notNull().default("user"),
  isBlocked: boolean("is_blocked").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  posterType: posterTypeEnum("poster_type").notNull().default("owner"),
  companyName: text("company_name"),
  telegramUsername: text("telegram_username"), // @siz
  contactPhone: text("contact_phone"),          // ommaga ochiladigan raqam (kirish raqamidan farq qilishi mumkin)
  // "Telefon tasdiqlangan" va "obyekt tekshirilgan" ALOHIDA tushunchalar:
  verifiedByStaffAt: timestamp("verified_by_staff_at", { withTimezone: true }), // faqat admin qo'yadi
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const otpChallenges = pgTable("otp_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("otp_phone_created_idx").on(t.phone, t.createdAt)]);

// Telegram orqali kirish: telefon raqami bot kontakt tugmasi orqali tasdiqlanadi (kontaktning user_id'si yuboruvchiniki bo'lishi shart).
export const telegramLinks = pgTable("telegram_links", {
  telegramUserId: bigint("telegram_user_id", { mode: "number" }).primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  phone: text("phone").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const telegramLogins = pgTable("telegram_logins", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(), // xom token faqat brauzer va bot havolasida
  telegramUserId: bigint("telegram_user_id", { mode: "number" }),
  chatId: bigint("chat_id", { mode: "number" }),
  phone: text("phone"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("tg_login_user_idx").on(t.telegramUserId, t.createdAt)]);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

// Verified provider identities are separate from public contact details.
export const authIdentities = pgTable("auth_identities", {
  provider: text("provider").notNull(),
  subject: text("subject").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.provider, t.subject] }), index("auth_identity_user_idx").on(t.userId)]);

export const authChallenges = pgTable("auth_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  method: text("method").notNull(),
  identifier: text("identifier").notNull().default(""),
  browserHash: text("browser_hash").notNull(),
  approvalHash: text("approval_hash").notNull().unique(),
  codeHash: text("code_hash"),
  payload: jsonb("payload").$type<Record<string, string>>().notNull().default({}),
  next: text("next").notNull().default("/kabinet"),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("auth_challenge_expiry_idx").on(t.expiresAt)]);

// ---------- Hududlar ----------
export const regions = pgTable("regions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull().unique(),
  nameUz: text("name_uz").notNull(),
  nameRu: text("name_ru").notNull(),
});

export const districts = pgTable("districts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  regionId: integer("region_id").notNull().references(() => regions.id),
  slug: text("slug").notNull(),
  nameUz: text("name_uz").notNull(),
  nameRu: text("name_ru").notNull(),
}, (t) => [uniqueIndex("districts_region_slug_uq").on(t.regionId, t.slug)]);

// ---------- Biznes markaz ----------
export const businessCenters = pgTable("business_centers", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  tagline: text("tagline").notNull().default(""),
  workingHours: text("working_hours").notNull().default(""),
  website: text("website").notNull().default(""),
  regionId: integer("region_id").notNull().references(() => regions.id),
  districtId: integer("district_id").references(() => districts.id),
  address: text("address").notNull(),
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lng: numeric("lng", { precision: 9, scale: 6 }),
  amenities: text("amenities").array().notNull().default(sql`'{}'::text[]`),
  contactPhone: text("contact_phone"),
  telegramUsername: text("telegram_username"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("bc_slug_uq").on(t.slug)]);

export const businessCenterImages = pgTable("business_center_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  centerId: uuid("center_id").notNull().references(() => businessCenters.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  position: integer("position").notNull().default(0),
});

// Vakil biriktirishni FAQAT admin qiladi (MVP). Egalik o'z-o'zidan e'lon qilinmaydi.
export const businessCenterMemberships = pgTable("business_center_memberships", {
  centerId: uuid("center_id").notNull().references(() => businessCenters.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: memberRoleEnum("role").notNull().default("manager"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.centerId, t.userId] })]);

// ---------- E'lon ----------
export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  centerId: uuid("center_id").references(() => businessCenters.id),
  posterType: posterTypeEnum("poster_type").notNull(),
  category: categoryEnum("category").notNull(),

  title: text("title").notNull(),
  description: text("description").notNull().default(""),

  regionId: integer("region_id").notNull().references(() => regions.id),
  districtId: integer("district_id").references(() => districts.id),
  address: text("address").notNull().default(""),
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lng: numeric("lng", { precision: 9, scale: 6 }),
  exactLocationPublic: boolean("exact_location_public").notNull().default(false),

  areaM2: numeric("area_m2", { precision: 10, scale: 2 }),
  floor: integer("floor"),
  totalFloors: integer("total_floors"),
  seats: integer("seats"),         // kovorking ish o'rinlari
  roomsCount: integer("rooms_count"),
  furnished: boolean("furnished"),
  unitCode: text("unit_code"),     // xona raqami / ichki kod
  unitCodePublic: boolean("unit_code_public").notNull().default(false),

  // Narx: float EMAS. Minor-unit (UZS: so'm, USD: sent) butun son.
  priceAmountMinor: bigint("price_amount_minor", { mode: "bigint" }),
  currency: currencyEnum("currency").notNull().default("UZS"),
  pricePeriod: periodEnum("price_period").notNull().default("month"),
  priceBasis: basisEnum("price_basis").notNull().default("whole"),
  priceNegotiable: boolean("price_negotiable").notNull().default(false),

  depositAmountMinor: bigint("deposit_amount_minor", { mode: "bigint" }),
  depositCurrency: currencyEnum("deposit_currency"),
  commissionType: commissionEnum("commission_type").notNull().default("none"),
  commissionFixedMinor: bigint("commission_fixed_minor", { mode: "bigint" }),
  commissionCurrency: currencyEnum("commission_currency"),
  commissionPercent: numeric("commission_percent", { precision: 5, scale: 2 }),
  commissionPercentBase: percentBaseEnum("commission_percent_base"),
  utilities: utilitiesEnum("utilities"),
  serviceFeeMinor: bigint("service_fee_minor", { mode: "bigint" }),
  serviceFeeCurrency: currencyEnum("service_fee_currency"),
  serviceFeePeriod: text("service_fee_period").notNull().default("month"),
  minTermMonths: integer("min_term_months"),

  amenities: text("amenities").array().notNull().default(sql`'{}'::text[]`),
  contactPhone: text("contact_phone"),
  telegramUsername: text("telegram_username"),

  // Ikki alohida holat o'qi
  moderationStatus: moderationEnum("moderation_status").notNull().default("draft"),
  rejectionReason: text("rejection_reason"),
  isSuspended: boolean("is_suspended").notNull().default(false),
  suspensionReason: text("suspension_reason"),
  availabilityStatus: availabilityEnum("availability_status").notNull().default("available"),
  availableFrom: date("available_from"),
  availabilityConfirmedAt: timestamp("availability_confirmed_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  viewCount: integer("view_count").notNull().default(0), // e'lon sahifasi ko'rishlari (bir tashrifchi/sutka — bitta)
  expiresAt: timestamp("expires_at", { withTimezone: true }),

  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("listings_slug_uq").on(t.slug),
  index("listings_public_idx").on(t.moderationStatus, t.availabilityStatus, t.expiresAt),
  index("listings_region_district_idx").on(t.regionId, t.districtId),
  index("listings_category_idx").on(t.category),
  index("listings_center_idx").on(t.centerId),
  index("listings_owner_idx").on(t.ownerId),
  index("listings_price_idx").on(t.currency, t.pricePeriod, t.priceBasis, t.priceAmountMinor),
  index("listings_area_idx").on(t.areaM2),
  index("listings_published_idx").on(t.publishedAt),
  // Bir xona tasodifan ikki marta e'lon qilinishiga qarshi: markaz ichida kod takrorlanmasin (faol e'lonlar)
  uniqueIndex("listings_center_unit_active_uq").on(t.centerId, t.unitCode)
    .where(sql`center_id IS NOT NULL AND unit_code IS NOT NULL AND availability_status NOT IN ('rented','expired','archived')`),
]);

export const listingImages = pgTable("listing_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  thumbKey: text("thumb_key"),
  width: integer("width"),
  height: integer("height"),
  position: integer("position").notNull().default(0),
  isPrimary: boolean("is_primary").notNull().default(false),
  isPlaceholder: boolean("is_placeholder").notNull().default(false),
}, (t) => [
  index("listing_images_listing_idx").on(t.listingId, t.position),
  uniqueIndex("listing_images_one_primary_uq").on(t.listingId).where(sql`is_primary`),
]);

export const amenities = pgTable("amenities", {
  code: text("code").primaryKey(),
  nameUz: text("name_uz").notNull(),
  nameRu: text("name_ru").notNull(),
});

export const listingAmenities = pgTable("listing_amenities", {
  listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  amenityCode: text("amenity_code").notNull().references(() => amenities.code),
}, (t) => [primaryKey({ columns: [t.listingId, t.amenityCode] }), index("la_amenity_idx").on(t.amenityCode)]);

export const favorites = pgTable("favorites", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.listingId] })]);

// ---------- Moderatsiya, shikoyat, audit, statistika ----------
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  reporterId: uuid("reporter_id").notNull().references(() => users.id),
  reason: reportReasonEnum("reason").notNull(),
  comment: text("comment"),
  status: reportStatusEnum("status").notNull().default("open"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("reports_one_open_per_user_uq").on(t.listingId, t.reporterId).where(sql`status = 'open'`),
  index("reports_status_idx").on(t.status),
]);

export const moderationEvents = pgTable("moderation_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id),
  fromStatus: moderationEnum("from_status"),
  toStatus: moderationEnum("to_status").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("mod_events_listing_idx").on(t.listingId, t.createdAt)]);

export const contactEvents = pgTable("contact_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  kind: contactKindEnum("kind").notNull(),
  // Takroriy bosishdan himoya: bir kishi/kun/turga bitta hisob. Xom IP saqlanmaydi, faqat hash.
  visitorHash: text("visitor_hash").notNull(),
  day: date("day").notNull().default(sql`CURRENT_DATE`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("contact_dedupe_uq").on(t.listingId, t.kind, t.visitorHash, t.day)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("audit_created_idx").on(t.createdAt), index("audit_entity_idx").on(t.entityType, t.entityId)]);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body"),
  href: text("href"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)]);

export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  query: text("query").notNull(),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("saved_search_user_query_uq").on(t.userId, t.query)]);
