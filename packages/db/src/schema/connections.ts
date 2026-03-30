import { pgTable, uuid, text, timestamp, jsonb, index, integer, boolean, unique } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    category: text("category").notNull(),
    connectionType: text("connection_type").notNull(), // mcp_server | oauth | api_key | bi_integration
    authMechanism: text("auth_mechanism").notNull(),   // oauth2 | api_key | bearer_token
    status: text("status").notNull().default("disconnected"), // connected | disconnected | error | pending_auth
    pluginId: uuid("plugin_id"),
    secretRef: text("secret_ref"), // 1Password reference: op://vault/item
    oauthScopes: jsonb("oauth_scopes"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastHealthCheckAt: timestamp("last_health_check_at", { withTimezone: true }),
    lastError: text("last_error"),
    errorCode: text("error_code"), // token_expired | invalid_credentials | rate_limited | network_error
    metadata: jsonb("metadata").notNull().default({}),
    sortOrder: integer("sort_order").notNull().default(0),
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companySlugUniq: unique("connections_company_slug_uniq").on(table.companyId, table.slug),
    companyCategoryIdx: index("connections_company_category_idx").on(table.companyId, table.category),
    companyStatusIdx: index("connections_company_status_idx").on(table.companyId, table.status),
  }),
);

export const connectionSyncLogs = pgTable(
  "connection_sync_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: text("status").notNull(), // success | error | partial
    recordsSynced: integer("records_synced"),
    errorMessage: text("error_message"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    connectionStartedIdx: index("sync_logs_connection_started_idx").on(table.connectionId, table.startedAt),
  }),
);
