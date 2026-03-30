import { pgTable, uuid, text, timestamp, jsonb, index, date, boolean } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const biSnapshots = pgTable(
  "bi_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(), // stripe | mercury | notion | apollo | vercel | ga4 | linkedin | etc.
    period: text("period").notNull(),          // daily | weekly | monthly
    periodStart: date("period_start").notNull(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companySourceIdx: index("bi_snapshots_company_source_idx").on(table.companyId, table.sourceType),
    companyPeriodIdx: index("bi_snapshots_company_period_idx").on(table.companyId, table.period, table.periodStart),
  }),
);

export const biAlerts = pgTable(
  "bi_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    alertType: text("alert_type").notNull(), // rise | drop | anomaly | milestone
    title: text("title").notNull(),
    description: text("description"),
    severity: text("severity").notNull().default("info"), // info | warning | critical
    acknowledged: boolean("acknowledged").notNull().default(false),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("bi_alerts_company_idx").on(table.companyId),
    companyUnackIdx: index("bi_alerts_company_unack_idx").on(table.companyId, table.acknowledged),
  }),
);
