CREATE TABLE "stat_snapshots" (
	"hour" timestamp with time zone PRIMARY KEY NOT NULL,
	"unshipped_seconds" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "linked_seconds_seen" integer DEFAULT 0 NOT NULL;