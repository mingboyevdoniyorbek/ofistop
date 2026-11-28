-- Biznes markaz vakili o'z jamoasiga yordamchi qo'shishni so'raydi; admin tasdiqlagach yordamchi markazni boshqaradi.
CREATE TABLE IF NOT EXISTS "center_member_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "center_id" uuid NOT NULL REFERENCES "business_centers"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "requested_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" "center_application_status" DEFAULT 'pending' NOT NULL,
  "reviewed_by" uuid REFERENCES "users"("id"),
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "center_member_req_status_idx" ON "center_member_requests" ("status", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "center_member_req_pending_uq" ON "center_member_requests" ("center_id", "user_id") WHERE "status" = 'pending';
--> statement-breakpoint
-- Mebel firmasi: logotip (yoki egasining rasmi) va ishlaridan 2 ta namuna rasm.
ALTER TABLE "furniture_firms" ADD COLUMN IF NOT EXISTS "logo_key" text;
--> statement-breakpoint
ALTER TABLE "furniture_firms" ADD COLUMN IF NOT EXISTS "photo_keys" text[] DEFAULT '{}'::text[] NOT NULL;
