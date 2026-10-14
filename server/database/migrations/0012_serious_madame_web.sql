ALTER TABLE "shop_items" ADD COLUMN "fields" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD COLUMN "choices" jsonb DEFAULT '[]'::jsonb NOT NULL;