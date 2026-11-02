CREATE TYPE "public"."deal_type" AS ENUM('rent', 'sale');--> statement-breakpoint
ALTER TYPE "public"."category" ADD VALUE 'building';--> statement-breakpoint
ALTER TYPE "public"."commission_percent_base" ADD VALUE 'sale_price';--> statement-breakpoint
ALTER TYPE "public"."price_period" ADD VALUE 'once';--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "deal_type" "deal_type" DEFAULT 'rent' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "land_area_sotix" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "documents_ready" boolean;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "installment" boolean;--> statement-breakpoint
CREATE INDEX "listings_deal_idx" ON "listings" USING btree ("deal_type");