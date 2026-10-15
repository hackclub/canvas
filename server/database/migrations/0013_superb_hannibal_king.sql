CREATE TABLE "bot_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bot_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text,
	"actor_id" text,
	"kind" text NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "coding_quarters_paid" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "welcome_message_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nudge_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ship_boost_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "broadcasts_unsubscribed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bot_log" ADD CONSTRAINT "bot_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_log" ADD CONSTRAINT "bot_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bot_log_created_at_idx" ON "bot_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bot_log_user_id_idx" ON "bot_log" USING btree ("user_id");--> statement-breakpoint
-- Hours already paid for, in 15 minute drops
UPDATE "users" SET "coding_quarters_paid" = "coding_hours_paid" * 4;