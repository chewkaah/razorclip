import { eq, and, desc } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { biClients, biAlerts, connections } from "@paperclipai/db";
import { fetchStripePulse } from "./stripe-bi.js";

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

    // Try Stripe first
    const stripeKey = await resolveKey(db, companyId, "stripe-bi") ?? process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      try {
        const stripe = await fetchStripePulse(stripeKey);
        return {
          activeClients: activeClients.length,
          totalClients: clients.length,
          weeklyRevenue: stripe.weeklyRevenue,
          monthlyRevenue: stripe.monthlyRevenue,
          weeklyBurn: stripe.weeklyBurn,
          netMargin: stripe.weeklyRevenue > 0 ? Math.round(((stripe.weeklyRevenue - stripe.weeklyBurn) / stripe.weeklyRevenue) * 100) : 0,
          cashPosition: 0, // Mercury handles this
          pipelineValue: 0, // Apollo handles this
          mrr: stripe.mrr,
          activeSubscriptions: stripe.activeSubscriptions,
          churnedThisMonth: stripe.churnedThisMonth,
        };
      } catch (err) {
        console.warn("Stripe pulse fetch failed, falling back to retainer aggregation:", (err as Error).message);
      }
    }

    // Fallback: aggregate from bi_clients
    return {
      activeClients: activeClients.length,
      totalClients: clients.length,
      weeklyRevenue: totalRetainer > 0 ? Math.round(totalRetainer / 4) : 0,
      monthlyRevenue: totalRetainer,
      weeklyBurn: 0,
      netMargin: totalRetainer > 0 ? 85 : 0,
      cashPosition: 0,
      pipelineValue: 0,
      mrr: totalRetainer,
      activeSubscriptions: 0,
      churnedThisMonth: 0,
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
