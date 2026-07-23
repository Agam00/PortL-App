ALTER TABLE "users" ADD COLUMN "on_duty" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "duty_changed_at" timestamp;