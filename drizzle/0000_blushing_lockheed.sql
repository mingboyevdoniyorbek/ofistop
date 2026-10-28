CREATE TYPE "public"."availability_status" AS ENUM('available', 'reserved', 'rented', 'paused', 'expired', 'archived');--> statement-breakpoint
CREATE TYPE "public"."price_basis" AS ENUM('whole', 'per_m2', 'per_seat');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('office', 'bc_room', 'coworking', 'retail', 'service_room', 'warehouse', 'production', 'other');--> statement-breakpoint
CREATE TYPE "public"."commission_type" AS ENUM('none', 'fixed', 'percent');--> statement-breakpoint
CREATE TYPE "public"."contact_kind" AS ENUM('view', 'phone_reveal', 'telegram_click', 'call_click');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('UZS', 'USD');--> statement-breakpoint
CREATE TYPE "public"."bc_member_role" AS ENUM('manager');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('draft', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."commission_percent_base" AS ENUM('monthly_rent', 'annual_rent');--> statement-breakpoint
CREATE TYPE "public"."price_period" AS ENUM('month', 'day', 'hour');--> statement-breakpoint
CREATE TYPE "public"."poster_type" AS ENUM('owner', 'business_center', 'agency');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('already_rented', 'wrong_price', 'false_info', 'duplicate', 'fraud_suspected', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."utilities" AS ENUM('included', 'separate', 'partly');--> statement-breakpoint
CREATE TABLE "amenities" (
	"code" text PRIMARY KEY NOT NULL,
	"name_uz" text NOT NULL,
	"name_ru" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_center_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"center_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_center_memberships" (
	"center_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "bc_member_role" DEFAULT 'manager' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_center_memberships_center_id_user_id_pk" PRIMARY KEY("center_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "business_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"region_id" integer NOT NULL,
	"district_id" integer,
	"address" text NOT NULL,
	"lat" numeric(9, 6),
	"lng" numeric(9, 6),
	"amenities" text[] DEFAULT '{}'::text[] NOT NULL,
	"contact_phone" text,
	"telegram_username" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"kind" "contact_kind" NOT NULL,
	"visitor_hash" text NOT NULL,
	"day" date DEFAULT CURRENT_DATE NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "districts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"region_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name_uz" text NOT NULL,
	"name_ru" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_listing_id_pk" PRIMARY KEY("user_id","listing_id")
);
--> statement-breakpoint
CREATE TABLE "listing_amenities" (
	"listing_id" uuid NOT NULL,
	"amenity_code" text NOT NULL,
	CONSTRAINT "listing_amenities_listing_id_amenity_code_pk" PRIMARY KEY("listing_id","amenity_code")
);
--> statement-breakpoint
CREATE TABLE "listing_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"thumb_key" text,
	"width" integer,
	"height" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_placeholder" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"center_id" uuid,
	"poster_type" "poster_type" NOT NULL,
	"category" "category" NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"region_id" integer NOT NULL,
	"district_id" integer,
	"address" text DEFAULT '' NOT NULL,
	"lat" numeric(9, 6),
	"lng" numeric(9, 6),
	"exact_location_public" boolean DEFAULT false NOT NULL,
	"area_m2" numeric(10, 2),
	"floor" integer,
	"total_floors" integer,
	"seats" integer,
	"rooms_count" integer,
	"furnished" boolean,
	"unit_code" text,
	"unit_code_public" boolean DEFAULT false NOT NULL,
	"price_amount_minor" bigint,
	"currency" "currency" DEFAULT 'UZS' NOT NULL,
	"price_period" "price_period" DEFAULT 'month' NOT NULL,
	"price_basis" "price_basis" DEFAULT 'whole' NOT NULL,
	"price_negotiable" boolean DEFAULT false NOT NULL,
	"deposit_amount_minor" bigint,
	"deposit_currency" "currency",
	"commission_type" "commission_type" DEFAULT 'none' NOT NULL,
	"commission_fixed_minor" bigint,
	"commission_currency" "currency",
	"commission_percent" numeric(5, 2),
	"commission_percent_base" "commission_percent_base",
	"utilities" "utilities",
	"service_fee_minor" bigint,
	"service_fee_currency" "currency",
	"min_term_months" integer,
	"amenities" text[] DEFAULT '{}'::text[] NOT NULL,
	"contact_phone" text,
	"telegram_username" text,
	"moderation_status" "moderation_status" DEFAULT 'draft' NOT NULL,
	"rejection_reason" text,
	"availability_status" "availability_status" DEFAULT 'available' NOT NULL,
	"available_from" date,
	"availability_confirmed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"actor_id" uuid,
	"from_status" "moderation_status",
	"to_status" "moderation_status" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"poster_type" "poster_type" DEFAULT 'owner' NOT NULL,
	"company_name" text,
	"telegram_username" text,
	"contact_phone" text,
	"verified_by_staff_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "regions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name_uz" text NOT NULL,
	"name_ru" text NOT NULL,
	CONSTRAINT "regions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"comment" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"phone_verified_at" timestamp with time zone,
	"role" "role" DEFAULT 'user' NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_center_images" ADD CONSTRAINT "business_center_images_center_id_business_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."business_centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_center_memberships" ADD CONSTRAINT "business_center_memberships_center_id_business_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."business_centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_center_memberships" ADD CONSTRAINT "business_center_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_center_memberships" ADD CONSTRAINT "business_center_memberships_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_centers" ADD CONSTRAINT "business_centers_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_centers" ADD CONSTRAINT "business_centers_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_events" ADD CONSTRAINT "contact_events_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_amenities" ADD CONSTRAINT "listing_amenities_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_amenities" ADD CONSTRAINT "listing_amenities_amenity_code_amenities_code_fk" FOREIGN KEY ("amenity_code") REFERENCES "public"."amenities"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_center_id_business_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."business_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_events" ADD CONSTRAINT "moderation_events_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_events" ADD CONSTRAINT "moderation_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bc_slug_uq" ON "business_centers" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_dedupe_uq" ON "contact_events" USING btree ("listing_id","kind","visitor_hash","day");--> statement-breakpoint
CREATE UNIQUE INDEX "districts_region_slug_uq" ON "districts" USING btree ("region_id","slug");--> statement-breakpoint
CREATE INDEX "la_amenity_idx" ON "listing_amenities" USING btree ("amenity_code");--> statement-breakpoint
CREATE INDEX "listing_images_listing_idx" ON "listing_images" USING btree ("listing_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_images_one_primary_uq" ON "listing_images" USING btree ("listing_id") WHERE is_primary;--> statement-breakpoint
CREATE UNIQUE INDEX "listings_slug_uq" ON "listings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "listings_public_idx" ON "listings" USING btree ("moderation_status","availability_status","expires_at");--> statement-breakpoint
CREATE INDEX "listings_region_district_idx" ON "listings" USING btree ("region_id","district_id");--> statement-breakpoint
CREATE INDEX "listings_category_idx" ON "listings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "listings_center_idx" ON "listings" USING btree ("center_id");--> statement-breakpoint
CREATE INDEX "listings_owner_idx" ON "listings" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "listings_price_idx" ON "listings" USING btree ("currency","price_period","price_basis","price_amount_minor");--> statement-breakpoint
CREATE INDEX "listings_area_idx" ON "listings" USING btree ("area_m2");--> statement-breakpoint
CREATE INDEX "listings_published_idx" ON "listings" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_center_unit_active_uq" ON "listings" USING btree ("center_id","unit_code") WHERE center_id IS NOT NULL AND unit_code IS NOT NULL AND availability_status NOT IN ('rented','expired','archived');--> statement-breakpoint
CREATE INDEX "mod_events_listing_idx" ON "moderation_events" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "otp_phone_created_idx" ON "otp_challenges" USING btree ("phone","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_one_open_per_user_uq" ON "reports" USING btree ("listing_id","reporter_id") WHERE status = 'open';--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");