DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VALIDATING' AND enumtypid = 'public.report_status'::regtype) THEN
        ALTER TYPE "public"."report_status" ADD VALUE 'VALIDATING' BEFORE 'VERIFIED';
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disaster_reports' AND column_name = 'image_urls') THEN
        ALTER TABLE "disaster_reports" ADD COLUMN "image_urls" text[];
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disaster_reports' AND column_name = 'ai_reasoning') THEN
        ALTER TABLE "disaster_reports" ADD COLUMN "ai_reasoning" text;
    END IF;
END $$;