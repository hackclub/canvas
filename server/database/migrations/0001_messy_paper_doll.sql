ALTER TABLE "shop_items" ADD COLUMN "show_in_app" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN "show_on_landing" boolean DEFAULT false NOT NULL;