-- Multi-page site: its own tables, next to the one-page site's (which stay exactly as they are).
CREATE TABLE IF NOT EXISTS "site_v2_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_v2_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"page" text DEFAULT 'home' NOT NULL,
	"type" text NOT NULL,
	"position" integer NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_v2_sections_page_pos" ON "site_v2_sections" ("page", "position");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_v2_drafts" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"data" jsonb NOT NULL,
	"user_email" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_v2_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_email" text,
	"action" text NOT NULL,
	"detail" text,
	"snapshot" jsonb NOT NULL
);
