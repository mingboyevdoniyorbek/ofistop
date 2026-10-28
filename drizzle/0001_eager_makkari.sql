CREATE TABLE "telegram_links" (
	"telegram_user_id" bigint PRIMARY KEY NOT NULL,
	"chat_id" bigint NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_links_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "telegram_logins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"telegram_user_id" bigint,
	"chat_id" bigint,
	"phone" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_logins_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE INDEX "tg_login_user_idx" ON "telegram_logins" USING btree ("telegram_user_id","created_at");