import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const chatThreads = pgTable(
  "chat_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    userId: text("user_id"),
    title: text("title").notNull().default("New Thread"),
    adapterType: text("adapter_type").notNull().default("claude_local"),
    adapterConfig: jsonb("adapter_config").notNull().default({}),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyUserIdx: index("chat_threads_company_user_idx").on(table.companyId, table.userId),
    companyCreatedIdx: index("chat_threads_company_created_idx").on(table.companyId, table.createdAt),
  }),
);
