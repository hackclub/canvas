CREATE TABLE "admin_actions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_actions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"admin_id" text,
	"action" text NOT NULL,
	"details" jsonb NOT NULL,
	"target_user_id" text,
	"project_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bonus_point_transactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bonus_point_transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"balance" integer NOT NULL,
	"reason" text NOT NULL,
	"actor_id" text,
	"ship_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_pixels" (
	"x" smallint NOT NULL,
	"y" smallint NOT NULL,
	"color" integer NOT NULL,
	"user_id" text,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "canvas_pixels_x_y_pk" PRIMARY KEY("x","y")
);
--> statement-breakpoint
CREATE TABLE "pixel_transactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pixel_transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"balance" integer NOT NULL,
	"reason" text NOT NULL,
	"actor_id" text,
	"ship_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "projects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"hackatime_projects" text[] DEFAULT '{}'::text[] NOT NULL,
	"ai_usage" text DEFAULT '' NOT NULL,
	"preexisting" boolean DEFAULT false NOT NULL,
	"demo_url" text,
	"repo_url" text,
	"banner_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ships" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ships_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"feedback" text DEFAULT '' NOT NULL,
	"reviewer_id" text,
	"hackatime_seconds" integer,
	"pixels_awarded" integer,
	"cooking" boolean DEFAULT false NOT NULL,
	"justification" jsonb,
	"bonus_points_awarded" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "shop_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shop_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"banner_key" text,
	"price" integer NOT NULL,
	"stock" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity" (
	"user_id" text NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	CONSTRAINT "user_activity_user_id_hour_pk" PRIMARY KEY("user_id","hour")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"identity" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hca" jsonb,
	"hackatime" jsonb,
	"slack_id" text,
	"slack_display_name" text,
	"display_name_override" text,
	"hackatime_id" integer,
	"verification_status" text,
	"ysws_eligible" boolean,
	"setup_rewarded_at" timestamp with time zone,
	"coding_baselines" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"coding_hours_paid" integer DEFAULT 0 NOT NULL,
	"pixels" integer DEFAULT 0 NOT NULL,
	"bonus_points" integer DEFAULT 0 NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"canvas_banned" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_hackatime_id_unique" UNIQUE("hackatime_id")
);
--> statement-breakpoint
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_point_transactions" ADD CONSTRAINT "bonus_point_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_point_transactions" ADD CONSTRAINT "bonus_point_transactions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_point_transactions" ADD CONSTRAINT "bonus_point_transactions_ship_id_ships_id_fk" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_pixels" ADD CONSTRAINT "canvas_pixels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pixel_transactions" ADD CONSTRAINT "pixel_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pixel_transactions" ADD CONSTRAINT "pixel_transactions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pixel_transactions" ADD CONSTRAINT "pixel_transactions_ship_id_ships_id_fk" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ships" ADD CONSTRAINT "ships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ships" ADD CONSTRAINT "ships_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_actions_created_at_idx" ON "admin_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bonus_point_transactions_user_id_idx" ON "bonus_point_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bonus_point_transactions_created_at_idx" ON "bonus_point_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pixel_transactions_user_id_idx" ON "pixel_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pixel_transactions_created_at_idx" ON "pixel_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ships_project_id_idx" ON "ships" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ships_status_idx" ON "ships" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "ships_one_pending_per_project" ON "ships" USING btree ("project_id") WHERE "ships"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "user_activity_hour_idx" ON "user_activity" USING btree ("hour");