import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { userProfiles } from "@paperclipai/db";
import { randomUUID } from "crypto";

function toProfile(row: typeof userProfiles.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    contextMd: row.contextMd,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    timezone: row.timezone,
    preferences: (row.preferences ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function userProfileService(db: Db) {
  /**
   * Get profile for a user — creates a default one if it doesn't exist (upsert on read).
   */
  async function getOrCreate(userId: string, userName?: string | null) {
    const existing = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      return toProfile(existing[0]);
    }

    // Create default profile
    const id = randomUUID();
    const [created] = await db
      .insert(userProfiles)
      .values({
        id,
        userId,
        contextMd: "",
        displayName: userName?.split(" ")[0] ?? null, // Use first name from auth
        avatarUrl: null,
        timezone: null,
        preferences: {
          voiceTone: "professional",
          verbosity: "concise",
          autoApproveThreshold: 0,
          defaultAgent: null,
          notifications: true,
        },
      })
      .returning();

    return toProfile(created);
  }

  /**
   * Update profile fields (partial update).
   */
  async function update(
    userId: string,
    data: {
      contextMd?: string;
      displayName?: string | null;
      avatarUrl?: string | null;
      timezone?: string | null;
      preferences?: Record<string, unknown>;
    },
  ) {
    // Ensure profile exists first
    const profile = await getOrCreate(userId);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.contextMd !== undefined) updateData.contextMd = data.contextMd;
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.preferences !== undefined) {
      // Merge preferences with existing
      updateData.preferences = {
        ...(profile.preferences as Record<string, unknown>),
        ...data.preferences,
      };
    }

    const [updated] = await db
      .update(userProfiles)
      .set(updateData)
      .where(eq(userProfiles.userId, userId))
      .returning();

    return toProfile(updated);
  }

  /**
   * Get the USER.md content for agent injection.
   * Returns null if no profile or empty context.
   */
  async function getContextMd(userId: string): Promise<string | null> {
    const rows = await db
      .select({ contextMd: userProfiles.contextMd, displayName: userProfiles.displayName })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    if (rows.length === 0 || !rows[0].contextMd) return null;

    // Prepend display name if set
    const header = rows[0].displayName
      ? `# User: ${rows[0].displayName}\n\n`
      : "";

    return header + rows[0].contextMd;
  }

  return { getOrCreate, update, getContextMd };
}
