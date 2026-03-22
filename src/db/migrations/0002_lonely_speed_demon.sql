CREATE TYPE "public"."shelter_type" AS ENUM('SHELTER', 'HOSPITAL', 'POLICE_STATION', 'FIRE_STATION', 'SAFE_ZONE');--> statement-breakpoint
CREATE TABLE "shelters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"type" "shelter_type" DEFAULT 'SHELTER' NOT NULL,
	"location" geography(Point, 4326) NOT NULL,
	"capacity" integer,
	"current_occupancy" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
