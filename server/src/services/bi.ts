import { eq, and, desc } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { biClients, biAlerts, connections } from "@paperclipai/db";
import { fetchStripePulse, type StripePulse } from "./stripe-bi.js";
import { fetchMercuryPulse, type MercuryPulse } from "./mercury-bi.js";

function toClient(row: typeof biClients.$inferSelect) {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    logoUrl: row.logoUrl,
    retainerAmount: row.retainerAmount ? Number(row.retainerAmount) : null,
    status: row.status,
    healthScore: row.healthScore,
    assignedAgents: row.assignedAgents,
    externalId: row.externalId,
    metadata: row.metadata,
    lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAlert(row: typeof biAlerts.$inferSelect) {
  return {
    id: row.id,
    companyId: row.companyId,
    sourceType: row.sourceType,
    alertType: row.alertType,
    title: row.title,
    description: row.description,
    severity: row.severity,
    acknowledged: row.acknowledged,
    data: row.data,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Resolve the API key for a BI connection slug. */
async function resolveKey(db: Db, companyId: string, slug: string): Promise<string | null> {
  const rows = await db
    .select({ metadata: connections.metadata, secretRef: connections.secretRef, status: connections.status })
    .from(connections)
    .where(and(eq(connections.companyId, companyId), eq(connections.slug, slug)))
    .limit(1);
  const conn = rows[0];
  if (!conn || conn.status !== "connected") return null;

  // Key stored in metadata.apiKey (set by the configure flow)
  const meta = conn.metadata as Record<string, unknown> | null;
  if (meta?.apiKey && typeof meta.apiKey === "string") return meta.apiKey;

  // Fallback: env var
  return null;
}

export function biService(db: Db) {
  /** Business Pulse — real data from Stripe when connected, fallback to client retainer aggregation */
  async function getPulse(companyId: string) {
    const clients = await db.select().from(biClients).where(eq(biClients.companyId, companyId));
    const activeClients = clients.filter((c) => c.status === "active");
    const totalRetainer = activeClients.reduce((sum, c) => sum + (c.retainerAmount ? Number(c.retainerAmount) : 0), 0);

    // Resolve keys for both financial providers
    const stripeKey = await resolveKey(db, companyId, "stripe-bi") ?? process.env.STRIPE_SECRET_KEY;
    const mercuryKey = await resolveKey(db, companyId, "mercury") ?? process.env.MERCURY_API_KEY;

    // Fetch Stripe + Mercury in parallel (each is optional)
    const [stripeResult, mercuryResult] = await Promise.all([
      stripeKey
        ? fetchStripePulse(stripeKey).catch((err) => { console.warn("Stripe pulse failed:", (err as Error).message); return null; })
        : Promise.resolve(null),
      mercuryKey
        ? fetchMercuryPulse(mercuryKey).catch((err) => { console.warn("Mercury pulse failed:", (err as Error).message); return null; })
        : Promise.resolve(null),
    ]) as [StripePulse | null, MercuryPulse | null];

    const weeklyRevenue = stripeResult?.weeklyRevenue ?? (totalRetainer > 0 ? Math.round(totalRetainer / 4) : 0);
    const weeklyBurn = mercuryResult?.weeklyBurn ?? 0;
    const cashPosition = mercuryResult?.cashPosition ?? 0;

    return {
      activeClients: activeClients.length,
      totalClients: clients.length,
      weeklyRevenue,
      monthlyRevenue: stripeResult?.monthlyRevenue ?? totalRetainer,
      weeklyBurn,
      netMargin: weeklyRevenue > 0 ? Math.round(((weeklyRevenue - weeklyBurn) / weeklyRevenue) * 100) : (totalRetainer > 0 ? 85 : 0),
      cashPosition,
      availableBalance: mercuryResult?.availableBalance ?? 0,
      runwayDays: mercuryResult?.runwayDays ?? 0,
      monthlyBurn: mercuryResult?.monthlyBurn ?? 0,
      pipelineValue: 0, // Apollo handles this
      mrr: stripeResult?.mrr ?? totalRetainer,
      activeSubscriptions: stripeResult?.activeSubscriptions ?? 0,
      churnedThisMonth: stripeResult?.churnedThisMonth ?? 0,
    };
  }

  async function listClients(companyId: string) {
    const rows = await db.select().from(biClients).where(eq(biClients.companyId, companyId));
    return rows.map(toClient);
  }

  async function listAlerts(companyId: string) {
    const rows = await db
      .select()
      .from(biAlerts)
      .where(eq(biAlerts.companyId, companyId))
      .orderBy(desc(biAlerts.createdAt))
      .limit(20);
    return rows.map(toAlert);
  }

  async function acknowledgeAlert(alertId: string) {
    await db.update(biAlerts).set({ acknowledged: true }).where(eq(biAlerts.id, alertId));
  }

  return { getPulse, listClients, listAlerts, acknowledgeAlert };
}
