CREATE EXTENSION IF NOT EXISTS "postgis";--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('PENDING_AI', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"metadata" jsonb,
	"trust_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "disaster_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"location" geography(Point, 4326) NOT NULL,
	"disaster_type" varchar(50) NOT NULL,
	"description" text,
	"image_url" text,
	"severity_level" integer,
	"status" "report_status" DEFAULT 'PENDING_AI',
	"ai_confidence_score" double precision,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;