ALTER TABLE "business_center_images" ADD COLUMN "pending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "telegram_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_notify" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Eski bildirishnomalar Telegram'ga qayta yuborilmasin.
UPDATE "notifications" SET "telegram_sent_at" = now() WHERE "telegram_sent_at" IS NULL;