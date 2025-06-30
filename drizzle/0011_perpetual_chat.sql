ALTER TABLE "stickers" ADD COLUMN "sticker_bytes" "bytea";--> statement-breakpoint
ALTER TABLE "stickers" ADD COLUMN "sticker_path" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "stickers" DROP COLUMN "image_base64";--> statement-breakpoint
ALTER TABLE "stickers" DROP COLUMN "image_path";