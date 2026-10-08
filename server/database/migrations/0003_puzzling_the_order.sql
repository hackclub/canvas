CREATE TABLE "canvas_pixel_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "canvas_pixel_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"x" smallint NOT NULL,
	"y" smallint NOT NULL,
	"color" integer NOT NULL,
	"user_id" text,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canvas_pixel_log" ADD CONSTRAINT "canvas_pixel_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "canvas_pixel_log_placed_at_idx" ON "canvas_pixel_log" USING btree ("placed_at");