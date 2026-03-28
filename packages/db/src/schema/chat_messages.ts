import { pgTable, uuid, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { chatThreads } from "./chat_threads.js";

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    role: text("role").notNull(),
    content: text("content").notNull().default(""),
    runId: uuid("run_id"),
    isStreaming: boolean("is_streaming").notNull().default(false),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    threadCreatedIdx: index("chat_messages_thread_created_idx").on(table.threadId, table.createdAt),
    companyRunIdx: index("chat_messages_company_run_idx").on(table.companyId, table.runId),
  }),
);
