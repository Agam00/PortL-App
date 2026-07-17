CREATE TYPE "public"."notice_reaction_type" AS ENUM('like', 'dislike');--> statement-breakpoint
CREATE TABLE "notice_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notice_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reaction" "notice_reaction_type" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "notice_reactions_notice_id_user_id_unique" UNIQUE("notice_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "notice_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notice_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notice_reactions" ADD CONSTRAINT "notice_reactions_notice_id_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_reactions" ADD CONSTRAINT "notice_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_comments" ADD CONSTRAINT "notice_comments_notice_id_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_comments" ADD CONSTRAINT "notice_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;