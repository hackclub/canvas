ALTER TABLE "pixel_transactions" ADD COLUMN "order_id" integer;--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN "pixels" integer;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD COLUMN "pixels" integer;--> statement-breakpoint
ALTER TABLE "pixel_transactions" ADD CONSTRAINT "pixel_transactions_order_id_shop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shop_orders"("id") ON DELETE set null ON UPDATE no action;