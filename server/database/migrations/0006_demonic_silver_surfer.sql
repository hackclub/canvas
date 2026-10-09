CREATE TABLE "user_coding_days" (
	"user_id" text NOT NULL,
	"day" timestamp with time zone NOT NULL,
	"seconds" integer NOT NULL,
	CONSTRAINT "user_coding_days_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "daily_active_users" RENAME TO "daily_active_logins";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "coding_seen" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_coding_days" ADD CONSTRAINT "user_coding_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_coding_days_day_idx" ON "user_coding_days" USING btree ("day");