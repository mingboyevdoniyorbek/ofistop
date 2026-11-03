CREATE TABLE "site_pageviews" (
	"day" date DEFAULT CURRENT_DATE NOT NULL,
	"section" text NOT NULL,
	"n" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "site_pageviews_day_section_pk" PRIMARY KEY("day","section")
);
--> statement-breakpoint
CREATE TABLE "site_visitors" (
	"day" date DEFAULT CURRENT_DATE NOT NULL,
	"visitor" text NOT NULL,
	"source" text DEFAULT 'direct' NOT NULL,
	"device" text DEFAULT 'mobile' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_visitors_day_visitor_pk" PRIMARY KEY("day","visitor")
);
