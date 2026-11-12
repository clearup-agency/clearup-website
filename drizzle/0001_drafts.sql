CREATE TABLE IF NOT EXISTS "drafts" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"data" jsonb NOT NULL,
	"user_email" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
