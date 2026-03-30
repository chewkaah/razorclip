import { eq, and, desc } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { connections, connectionSyncLogs } from "@paperclipai/db";
import { randomUUID } from "crypto";

function toConnection(row: typeof connections.$inferSelect) {
  return {
    id: row.id,
    companyId: row.companyId,
    slug: row.slug,
    displayName: row.displayName,
    category: row.category,
    connectionType: row.connectionType,
    authMechanism: row.authMechanism,
    status: row.status,
    pluginId: row.pluginId,
    secretRef: row.secretRef,
    oauthScopes: row.oauthScopes,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    lastHealthCheckAt: row.lastHealthCheckAt?.toISOString() ?? null,
    lastError: row.lastError,
    errorCode: row.errorCode,
    metadata: row.metadata,
    sortOrder: row.sortOrder,
    isEnabled: row.isEnabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSyncLog(row: typeof connectionSyncLogs.$inferSelect) {
  return {
    id: row.id,
    connectionId: row.connectionId,
    companyId: row.companyId,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    status: row.status,
    recordsSynced: row.recordsSynced,
    errorMessage: row.errorMessage,
    durationMs: row.durationMs,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Default connections seeded for every company */
const DEFAULT_CONNECTIONS = [
  { slug: "gmail", displayName: "Gmail", category: "Communication & CRM", connectionType: "mcp_server", authMechanism: "oauth2" },
  { slug: "google-calendar", displayName: "Google Calendar", category: "Communication & CRM", connectionType: "mcp_server", authMechanism: "oauth2" },
  { slug: "apollo", displayName: "Apollo.io", category: "Communication & CRM", connectionType: "mcp_server", authMechanism: "api_key" },
  { slug: "fireflies", displayName: "Fireflies.ai", category: "Communication & CRM", connectionType: "mcp_server", authMechanism: "api_key" },
  { slug: "linear", displayName: "Linear", category: "Project Management", connectionType: "mcp_server", authMechanism: "oauth2" },
  { slug: "notion", displayName: "Notion", category: "Project Management", connectionType: "mcp_server", authMechanism: "oauth2" },
  { slug: "vercel", displayName: "Vercel", category: "Dev & Deploy", connectionType: "mcp_server", authMechanism: "bearer_token" },
  { slug: "stripe-mcp", displayName: "Stripe", category: "Dev & Deploy", connectionType: "mcp_server", authMechanism: "api_key" },
  { slug: "canva", displayName: "Canva", category: "Creative", connectionType: "mcp_server", authMechanism: "oauth2" },
  { slug: "stripe-bi", displayName: "Stripe (Financial)", category: "Financial", connectionType: "bi_integration", authMechanism: "api_key" },
  { slug: "mercury", displayName: "Mercury", category: "Financial", connectionType: "bi_integration", authMechanism: "api_key" },
  { slug: "vercel-analytics", displayName: "Vercel Analytics", category: "Analytics", connectionType: "bi_integration", authMechanism: "bearer_token" },
  { slug: "ga4", displayName: "Google Analytics 4", category: "Analytics", connectionType: "bi_integration", authMechanism: "oauth2" },
  { slug: "linkedin", displayName: "LinkedIn", category: "Social", connectionType: "bi_integration", authMechanism: "oauth2" },
  { slug: "instagram", displayName: "Instagram", category: "Social", connectionType: "bi_integration", authMechanism: "oauth2" },
  { slug: "twitter-x", displayName: "Twitter / X", category: "Social", connectionType: "bi_integration", authMechanism: "bearer_token" },
  { slug: "tiktok", displayName: "TikTok", category: "Social", connectionType: "bi_integration", authMechanism: "oauth2" },
  { slug: "symphony", displayName: "Symphony", category: "Music SaaS", connectionType: "mcp_server", authMechanism: "api_key" },
];

export function connectionsService(db: Db) {
  /** List all connections for a company */
  async function list(companyId: string) {
    const rows = await db
      .select()
      .from(connections)
      .where(eq(connections.companyId, companyId))
      .orderBy(connections.sortOrder, connections.category, connections.displayName);
    return rows.map(toConnection);
  }

  /** Get a single connection by slug */
  async function getBySlug(companyId: string, slug: string) {
    const rows = await db
      .select()
      .from(connections)
      .where(and(eq(connections.companyId, companyId), eq(connections.slug, slug)))
      .limit(1);
    return rows.length > 0 ? toConnection(rows[0]) : null;
  }

  /** Seed default connections for a company (called on company creation or first access) */
  async function seedDefaults(companyId: string) {
    const existing = await db
      .select({ slug: connections.slug })
      .from(connections)
      .where(eq(connections.companyId, companyId));

    const existingSlugs = new Set(existing.map((r) => r.slug));
    const toInsert = DEFAULT_CONNECTIONS.filter((c) => !existingSlugs.has(c.slug));

    if (toInsert.length === 0) return;

    await db.insert(connections).values(
      toInsert.map((c, i) => ({
        id: randomUUID(),
        companyId,
        slug: c.slug,
        displayName: c.displayName,
        category: c.category,
        connectionType: c.connectionType,
        authMechanism: c.authMechanism,
        status: "disconnected" as const,
        sortOrder: i,
        isEnabled: false,
        metadata: {},
      })),
    );
  }

  /** Enable a connection */
  async function enable(companyId: string, slug: string) {
    const [updated] = await db
      .update(connections)
      .set({ isEnabled: true, updatedAt: new Date() })
      .where(and(eq(connections.companyId, companyId), eq(connections.slug, slug)))
      .returning();
    return updated ? toConnection(updated) : null;
  }

  /** Disable a connection */
  async function disable(companyId: string, slug: string) {
    const [updated] = await db
      .update(connections)
      .set({ isEnabled: false, updatedAt: new Date() })
      .where(and(eq(connections.companyId, companyId), eq(connections.slug, slug)))
      .returning();
    return updated ? toConnection(updated) : null;
  }

  /** Update connection status (called after health check or OAuth) */
  async function updateStatus(
    companyId: string,
    slug: string,
    status: string,
    opts?: { lastError?: string; errorCode?: string; metadata?: Record<string, unknown> },
  ) {
    const setData: Record<string, unknown> = {
      status,
      lastHealthCheckAt: new Date(),
      updatedAt: new Date(),
    };
    if (opts?.lastError !== undefined) setData.lastError = opts.lastError;
    if (opts?.errorCode !== undefined) setData.errorCode = opts.errorCode;
    if (opts?.metadata) setData.metadata = opts.metadata;
    if (status === "connected") setData.lastSyncAt = new Date();

    const [updated] = await db
      .update(connections)
      .set(setData)
      .where(and(eq(connections.companyId, companyId), eq(connections.slug, slug)))
      .returning();
    return updated ? toConnection(updated) : null;
  }

  /** Log a sync attempt */
  async function logSync(
    connectionId: string,
    companyId: string,
    data: { status: string; recordsSynced?: number; errorMessage?: string; durationMs?: number },
  ) {
    const [log] = await db
      .insert(connectionSyncLogs)
      .values({
        id: randomUUID(),
        connectionId,
        companyId,
        startedAt: new Date(),
        completedAt: new Date(),
        status: data.status,
        recordsSynced: data.recordsSynced ?? null,
        errorMessage: data.errorMessage ?? null,
        durationMs: data.durationMs ?? null,
      })
      .returning();
    return toSyncLog(log);
  }

  /** Get recent sync logs for a connection */
  async function getSyncLogs(connectionId: string, limit = 20) {
    const rows = await db
      .select()
      .from(connectionSyncLogs)
      .where(eq(connectionSyncLogs.connectionId, connectionId))
      .orderBy(desc(connectionSyncLogs.startedAt))
      .limit(limit);
    return rows.map(toSyncLog);
  }

  return { list, getBySlug, seedDefaults, enable, disable, updateStatus, logSync, getSyncLogs };
}
