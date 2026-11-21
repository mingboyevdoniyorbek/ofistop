-- «Joyingiz hali bo'shmi?» haftalik Telegram so'rovi qachon yuborilgani (bir e'longa haftasiga bir marta).
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "vacancy_asked_at" timestamp with time zone;
