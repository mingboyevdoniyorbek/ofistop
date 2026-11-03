CREATE TYPE "public"."service_status" AS ENUM('new', 'in_progress', 'done', 'rejected');--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"telegram_username" text,
	"category" "category",
	"region_id" integer,
	"district_id" integer,
	"address" text DEFAULT '' NOT NULL,
	"area_m2" text,
	"desired_price" text,
	"comment" text,
	"status" "service_status" DEFAULT 'new' NOT NULL,
	"admin_note" text,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "furniture_firms" ADD COLUMN "featured_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "featured_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_requests_status_idx" ON "service_requests" USING btree ("status","created_at");