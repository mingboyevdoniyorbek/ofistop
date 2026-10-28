ALTER TABLE "listings" ADD COLUMN "service_fee_period" text DEFAULT 'month' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "is_suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "suspension_reason" text;
--> statement-breakpoint
UPDATE listings l SET is_suspended = true, suspension_reason = 'Oldingi moderator cheklovi'
WHERE l.availability_status = 'paused' AND EXISTS
(SELECT 1 FROM audit_logs a WHERE a.entity_type = 'listing' AND a.entity_id = l.id::text AND a.action = 'listing.hide');
