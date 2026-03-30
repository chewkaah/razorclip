import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { authUsers } from "./auth.js";

/**
 * user_profiles — Per-user context document (USER.md)
 *
 * Stores the user's personal context markdown that agents read
 * when interacting with them. Also stores preferences and metadata.
 *
 * This is the "USER.md" equivalent of AGENTS.md — it gives agents
 * context about the human they're working with.
 */
export const userProfiles = pgTable("user_profiles", {
  id: text("id").primaryKey(), // same as userId for simplicity
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => authUsers.id, { onDelete: "cascade" }),

  // The USER.md content — markdown that agents read
  contextMd: text("context_md").notNull().default(""),

  // Display preferences
  displayName: text("display_name"),   // how they want to be greeted
  avatarUrl: text("avatar_url"),       // profile photo URL
  timezone: text("timezone"),          // e.g. "America/New_York"

  // Agent interaction preferences
  preferences: jsonb("preferences").notNull().default({
    voiceTone: "professional",         // professional | casual | minimal
    verbosity: "concise",              // verbose | concise | minimal
    autoApproveThreshold: 0,           // $ amount below which auto-approve
    defaultAgent: null,                // preferred agent slug for chat
    notifications: true,
  }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
