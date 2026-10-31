CREATE TYPE "public"."center_application_kind" AS ENUM('new', 'claim');--> statement-breakpoint
CREATE TYPE "public"."center_application_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "center_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "center_application_kind" DEFAULT 'new' NOT NULL,
	"center_id" uuid,
	"name" text NOT NULL,
	"region_id" integer NOT NULL,
	"district_id" integer,
	"address" text NOT NULL,
	"contact_name" text NOT NULL,
	"phone" text NOT NULL,
	"telegram_username" text,
	"floors" integer,
	"free_rooms" integer,
	"website" text,
	"comment" text,
	"status" "center_application_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "view_days" (
	"kind" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"day" date DEFAULT CURRENT_DATE NOT NULL,
	"n" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "view_days_kind_entity_id_day_pk" PRIMARY KEY("kind","entity_id","day")
);
--> statement-breakpoint
ALTER TABLE "business_centers" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "business_centers" ADD COLUMN "featured_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "business_centers" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "business_centers" ADD COLUMN "pending_changes" jsonb;--> statement-breakpoint
ALTER TABLE "business_centers" ADD COLUMN "pending_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "business_centers" ADD COLUMN "pending_submitted_by" uuid;--> statement-breakpoint
ALTER TABLE "center_applications" ADD CONSTRAINT "center_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "center_applications" ADD CONSTRAINT "center_applications_center_id_business_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."business_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "center_applications" ADD CONSTRAINT "center_applications_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "center_applications" ADD CONSTRAINT "center_applications_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "center_applications" ADD CONSTRAINT "center_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "center_app_status_idx" ON "center_applications" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "center_app_user_idx" ON "center_applications" USING btree ("user_id");