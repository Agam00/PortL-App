ALTER TABLE "societies" ADD COLUMN "upi_id" varchar(120);--> statement-breakpoint
ALTER TABLE "societies" ADD COLUMN "upi_name" varchar(120);--> statement-breakpoint
ALTER TABLE "dues" ADD COLUMN "title" varchar(120);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "proof_image" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "verified" boolean DEFAULT false NOT NULL;