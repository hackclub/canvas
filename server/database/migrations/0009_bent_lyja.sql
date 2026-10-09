ALTER TABLE "projects" ADD COLUMN "hackatime_id" integer;--> statement-breakpoint
-- Backfill from the owners, for projects made before this column existed
UPDATE "projects" SET "hackatime_id" = "users"."hackatime_id" FROM "users" WHERE "users"."id" = "projects"."user_id";
