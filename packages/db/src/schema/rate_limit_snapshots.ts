import { pgTable, uuid, text, timestamp, bigint, jsonb, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const rateLimitSnapshots = pgTable(
  "rate_limit_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("anthropic"),
    modelFamily: text("model_family").notNull(),
    windowType: text("window_type").notNull(),
    limitTokens: bigint("limit_tokens", { mode: "number" }),
    usedTokens: bigint("used_tokens", { mode: "number" }),
    remainingTokens: bigint("remaining_tokens", { mode: "number" }),
    resetAt: timestamp("reset_at", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
    source: text("source").notNull(),
    rawHeaders: jsonb("raw_headers"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyCapturedIdx: index("rate_limit_snapshots_company_captured_idx").on(table.companyId, table.capturedAt),
    companyModelIdx: index("rate_limit_snapshots_company_model_idx").on(table.companyId, table.modelFamily, table.capturedAt),
  })
);
