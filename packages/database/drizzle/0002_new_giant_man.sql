ALTER TABLE "users" ALTER COLUMN "email_verified" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "must_reset_password" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "polls" ALTER COLUMN "multi_select" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "amenities" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_directory" ALTER COLUMN "is_verified_by_admin" SET NOT NULL;