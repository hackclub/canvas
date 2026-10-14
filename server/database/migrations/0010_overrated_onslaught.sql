CREATE TABLE "shop_orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shop_orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"item_id" integer,
	"item_name" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_notes" ADD COLUMN "order_id" integer;--> statement-breakpoint
ALTER TABLE "bonus_point_transactions" ADD COLUMN "order_id" integer;--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN "show_quantity" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN "per_user_limit" integer;--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN "checkout_limit" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN "checkout_limit_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN "disclaimer" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN "silly" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN "require_phone" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_item_id_shop_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."shop_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shop_orders_user_id_idx" ON "shop_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shop_orders_item_id_idx" ON "shop_orders" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "shop_orders_status_idx" ON "shop_orders" USING btree ("status");--> statement-breakpoint
ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_order_id_shop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shop_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_point_transactions" ADD CONSTRAINT "bonus_point_transactions_order_id_shop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shop_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_notes_order_id_idx" ON "admin_notes" USING btree ("order_id");