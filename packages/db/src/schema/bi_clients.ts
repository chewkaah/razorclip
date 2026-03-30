import { pgTable, uuid, text, timestamp, jsonb, index, integer, numeric } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const biClients = pgTable(
  "bi_clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    logoUrl: text("logo_url"),
    retainerAmount: numeric("retainer_amount"),
    status: text("status").notNull().default("active"), // active | paused | at-risk | churned
    healthScore: text("health_score").notNull().default("green"), // green | amber | red
    assignedAgents: jsonb("assigned_agents").notNull().default([]), // UUID[]
    externalId: text("external_id"), // Notion page ID, etc.
    metadata: jsonb("metadata").notNull().default({}),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("bi_clients_company_idx").on(table.companyId),
    companyStatusIdx: index("bi_clients_company_status_idx").on(table.companyId, table.status),
  }),
);

export const biClientProjects = pgTable(
  "bi_client_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => biClients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"), // active | reviewing | complete
    progress: integer("progress").notNull().default(0), // 0-100
    nextMilestone: text("next_milestone"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clientIdx: index("bi_client_projects_client_idx").on(table.clientId),
  }),
);
