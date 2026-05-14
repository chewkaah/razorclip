CREATE TABLE IF NOT EXISTS "rate_limit_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "provider" text DEFAULT 'anthropic' NOT NULL,
  "model_family" text NOT NULL,
  "window_type" text NOT NULL,
  "limit_tokens" bigint,
  "used_tokens" bigint,
  "remaining_tokens" bigint,
  "reset_at" timestamp with time zone,
  "captured_at" timestamp with time zone DEFAULT now() NOT NULL,
  "source" text NOT NULL,
  "raw_headers" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rate_limit_snapshots_company_id_companies_id_fk') THEN
  ALTER TABLE "rate_limit_snapshots" ADD CONSTRAINT "rate_limit_snapshots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limit_snapshots_company_captured_idx" ON "rate_limit_snapshots" USING btree ("company_id", "captured_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limit_snapshots_company_model_idx" ON "rate_limit_snapshots" USING btree ("company_id", "model_family", "captured_at" DESC);
