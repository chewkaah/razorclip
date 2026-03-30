import { eq, desc } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { biClients, biClientProjects, biSnapshots, biAlerts } from "@paperclipai/db";

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

export function biService(db: Db) {
  /** Business Pulse — aggregated hero metrics */
  async function getPulse(companyId: string) {
    const clients = await db.select().from(biClients).where(eq(biClients.companyId, companyId));
    const activeClients = clients.filter((c) => c.status === "active");
    const totalRetainer = activeClients.reduce((sum, c) => sum + (c.retainerAmount ? Number(c.retainerAmount) : 0), 0);

    return {
      activeClients: activeClients.length,
      totalClients: clients.length,
      weeklyRevenue: totalRetainer / 4, // rough weekly from monthly
      weeklyBurn: 0, // TODO: from Mercury/Stripe
      netMargin: totalRetainer > 0 ? 85 : 0, // placeholder
      cashPosition: 0, // TODO: from Mercury
      pipelineValue: 0, // TODO: from Apollo
    };
  }

  /** List BI clients */
  async function listClients(companyId: string) {
    const rows = await db.select().from(biClients).where(eq(biClients.companyId, companyId));
    return rows.map(toClient);
  }

  /** List unacknowledged alerts */
  async function listAlerts(companyId: string) {
    const rows = await db
      .select()
      .from(biAlerts)
      .where(eq(biAlerts.companyId, companyId))
      .orderBy(desc(biAlerts.createdAt))
      .limit(20);
    return rows.map(toAlert);
  }

  /** Acknowledge an alert */
  async function acknowledgeAlert(alertId: string) {
    await db.update(biAlerts).set({ acknowledged: true }).where(eq(biAlerts.id, alertId));
  }

  return { getPulse, listClients, listAlerts, acknowledgeAlert };
}
