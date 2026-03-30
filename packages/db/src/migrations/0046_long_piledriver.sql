CREATE TABLE IF NOT EXISTS "bi_client_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"next_milestone" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "bi_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"retainer_amount" numeric,
	"status" text DEFAULT 'active' NOT NULL,
	"health_score" text DEFAULT 'green' NOT NULL,
	"assigned_agents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"external_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_activity_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "bi_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"alert_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"severity" text DEFAULT 'info' NOT NULL,
	"acknowledged" boolean DEFAULT false NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "bi_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"period" text NOT NULL,
	"period_start" date NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "connection_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"status" text NOT NULL,
	"records_synced" integer,
	"error_message" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"category" text NOT NULL,
	"connection_type" text NOT NULL,
	"auth_mechanism" text NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"plugin_id" uuid,
	"secret_ref" text,
	"oauth_scopes" jsonb,
	"last_sync_at" timestamp with time zone,
	"last_health_check_at" timestamp with time zone,
	"last_error" text,
	"error_code" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connections_company_slug_uniq" UNIQUE("company_id","slug")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"context_md" text DEFAULT '' NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"timezone" text,
	"preferences" jsonb DEFAULT '{"voiceTone":"professional","verbosity":"concise","autoApproveThreshold":0,"defaultAgent":null,"notifications":true}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint

ALTER TABLE "bi_client_projects" ADD CONSTRAINT "bi_client_projects_client_id_bi_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."bi_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "bi_clients" ADD CONSTRAINT "bi_clients_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "bi_alerts" ADD CONSTRAINT "bi_alerts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "bi_snapshots" ADD CONSTRAINT "bi_snapshots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "connection_sync_logs" ADD CONSTRAINT "connection_sync_logs_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "connection_sync_logs" ADD CONSTRAINT "connection_sync_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "connections" ADD CONSTRAINT "connections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "bi_client_projects_client_idx" ON "bi_client_projects" USING btree ("client_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "bi_clients_company_idx" ON "bi_clients" USING btree ("company_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "bi_clients_company_status_idx" ON "bi_clients" USING btree ("company_id","status");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "bi_alerts_company_idx" ON "bi_alerts" USING btree ("company_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "bi_alerts_company_unack_idx" ON "bi_alerts" USING btree ("company_id","acknowledged");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "bi_snapshots_company_source_idx" ON "bi_snapshots" USING btree ("company_id","source_type");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "bi_snapshots_company_period_idx" ON "bi_snapshots" USING btree ("company_id","period","period_start");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "sync_logs_connection_started_idx" ON "connection_sync_logs" USING btree ("connection_id","started_at");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "connections_company_category_idx" ON "connections" USING btree ("company_id","category");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "connections_company_status_idx" ON "connections" USING btree ("company_id","status");