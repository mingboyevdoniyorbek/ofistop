CREATE TYPE "public"."furniture_kind" AS ENUM('ready', 'custom', 'both');--> statement-breakpoint
CREATE TYPE "public"."furniture_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "furniture_firms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "furniture_kind" NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"products" text[] DEFAULT '{}'::text[] NOT NULL,
	"region_id" integer NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"contact_name" text NOT NULL,
	"phone" text NOT NULL,
	"telegram_username" text,
	"website" text,
	"status" "furniture_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "furniture_firms" ADD CONSTRAINT "furniture_firms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "furniture_firms" ADD CONSTRAINT "furniture_firms_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "furniture_firms" ADD CONSTRAINT "furniture_firms_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "furniture_firms_status_idx" ON "furniture_firms" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "furniture_firms_user_idx" ON "furniture_firms" USING btree ("user_id");