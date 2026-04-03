/**
 * Background sync scheduler — periodically syncs data from connected BI sources.
 *
 * Runs on a configurable interval (default 15 min). For each company with
 * connected BI integrations, fetches fresh data and upserts into local tables.
 */
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { Db } from "@paperclipai/db";
import { connections, biClients, connectionSyncLogs } from "@paperclipai/db";
import { fetchNotionClients } from "./notion-bi.js";
import { resolveConnectionKey } from "./onepassword.js";

const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
let timer: ReturnType<typeof setInterval> | null = null;

/** Sync Notion CRM clients into bi_clients table. */
async function syncNotionClients(db: Db, companyId: string, token: string, databaseId: string, connectionId: string) {
  const startedAt = new Date();
  try {
    const clients = await fetchNotionClients(token, databaseId);

    // Upsert each client — match on externalId (Notion page ID)
    for (const client of clients) {
      const existing = await db
        .select({ id: biClients.id })
        .from(biClients)
        .where(and(eq(biClients.companyId, companyId), eq(biClients.externalId, client.id)))
        .limit(1);

      if (existing.length > 0) {
        await db.update(biClients).set({
          name: client.name,
          status: client.status,
          retainerAmount: client.retainerAmount?.toString() ?? null,
          healthScore: client.healthScore,
          lastActivityAt: new Date(client.lastEditedAt),
          updatedAt: new Date(),
        }).where(eq(biClients.id, existing[0].id));
      } else {
        await db.insert(biClients).values({
          id: randomUUID(),
          companyId,
          name: client.name,
          status: client.status,
          retainerAmount: client.retainerAmount?.toString() ?? null,
          healthScore: client.healthScore,
          externalId: client.id,
          lastActivityAt: new Date(client.lastEditedAt),
          metadata: {},
        });
      }
    }

    // Log sync
    const durationMs = Date.now() - startedAt.getTime();
    await db.insert(connectionSyncLogs).values({
      id: randomUUID(),
      connectionId,
      companyId,
      startedAt,
      completedAt: new Date(),
      status: "success",
      recordsSynced: clients.length,
      durationMs,
    });

    // Update connection status
    await db.update(connections).set({
      status: "connected",
      lastSyncAt: new Date(),
      lastError: null,
      errorCode: null,
      updatedAt: new Date(),
    }).where(eq(connections.id, connectionId));

    console.log(`[sync] Notion: synced ${clients.length} clients for company ${companyId} in ${durationMs}ms`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[sync] Notion sync failed for company ${companyId}:`, msg);

    await db.insert(connectionSyncLogs).values({
      id: randomUUID(),
      connectionId,
      companyId,
      startedAt,
      completedAt: new Date(),
      status: "error",
      errorMessage: msg,
      durationMs: Date.now() - startedAt.getTime(),
    });

    await db.update(connections).set({
      lastError: msg,
      errorCode: "sync_failed",
      updatedAt: new Date(),
    }).where(eq(connections.id, connectionId));
  }
}

/** Run one sync cycle across all companies and their connected BI sources. */
async function runSyncCycle(db: Db) {
  // Find all enabled BI connections
  const biConns = await db
    .select()
    .from(connections)
    .where(and(
      eq(connections.connectionType, "bi_integration"),
      eq(connections.status, "connected"),
      eq(connections.isEnabled, true),
    ));

  for (const conn of biConns) {
    const key = resolveConnectionKey(conn);
    if (!key) continue;
    const meta = conn.metadata as Record<string, unknown> | null;

    if (conn.slug === "notion" || conn.slug === "notion-crm") {
      const databaseId = (meta?.databaseId as string) ?? undefined;
      if (!databaseId) {
        console.warn(`[sync] Notion connection ${conn.id} has no databaseId in metadata, skipping`);
        continue;
      }
      await syncNotionClients(db, conn.companyId, key, databaseId, conn.id);
    }

    // Future: add more sync handlers here for other BI sources
    // if (conn.slug === "vercel-analytics") { ... }
    // if (conn.slug === "ga4") { ... }
  }
}

/** Start the background sync loop. Call once on server boot. */
export function startSyncScheduler(db: Db) {
  if (timer) return; // already running

  console.log(`[sync] Starting background sync scheduler (interval: ${SYNC_INTERVAL_MS / 1000}s)`);

  // Run first sync after a short delay to let the server warm up
  setTimeout(() => {
    runSyncCycle(db).catch((err) => console.error("[sync] Cycle error:", err));
  }, 10_000);

  timer = setInterval(() => {
    runSyncCycle(db).catch((err) => console.error("[sync] Cycle error:", err));
  }, SYNC_INTERVAL_MS);
}

/** Stop the sync loop (for graceful shutdown). */
export function stopSyncScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("[sync] Stopped background sync scheduler");
  }
}
