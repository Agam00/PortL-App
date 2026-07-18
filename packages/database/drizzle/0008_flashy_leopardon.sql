CREATE TYPE "public"."service_request_status" AS ENUM('requested', 'confirmed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"society_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"category" varchar(60) NOT NULL,
	"note" text,
	"scheduled_at" timestamp,
	"status" "service_request_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_society_id_societies_id_fk" FOREIGN KEY ("society_id") REFERENCES "public"."societies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_resident_id_users_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;