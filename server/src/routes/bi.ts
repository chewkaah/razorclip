import { Router } from "express";
import { eq, and } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { connections } from "@paperclipai/db";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { biService } from "../services/bi.js";
import { fetchVercelTraffic } from "../services/vercel-bi.js";

export function biRoutes(db: Db) {
  const router = Router();
  const svc = biService(db);

  /** GET /companies/:companyId/bi/pulse — hero metrics */
  router.get("/companies/:companyId/bi/pulse", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const pulse = await svc.getPulse(companyId);
    res.json(pulse);
  });

  /** GET /companies/:companyId/bi/clients — client list */
  router.get("/companies/:companyId/bi/clients", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const clients = await svc.listClients(companyId);
    res.json(clients);
  });

  /** GET /companies/:companyId/bi/alerts — intelligence alerts */
  router.get("/companies/:companyId/bi/alerts", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const alerts = await svc.listAlerts(companyId);
    res.json(alerts);
  });

  /** GET /companies/:companyId/bi/traffic — website traffic from Vercel Analytics */
  router.get("/companies/:companyId/bi/traffic", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    // Resolve Vercel token from connections or env
    const rows = await db
      .select({ metadata: connections.metadata, status: connections.status })
      .from(connections)
      .where(and(eq(connections.companyId, companyId), eq(connections.slug, "vercel-analytics")))
      .limit(1);
    const conn = rows[0];
    const meta = (conn?.metadata ?? {}) as Record<string, unknown>;
    const token = (meta.bearerToken as string) ?? (meta.apiKey as string) ?? process.env.VERCEL_API_TOKEN;

    if (!token || conn?.status !== "connected") {
      res.json({ connected: false, data: null });
      return;
    }

    // projectId and teamId stored in connection metadata during configure
    const projectId = (meta.projectId as string) ?? undefined;
    const teamId = (meta.teamId as string) ?? undefined;

    if (!projectId) {
      res.json({ connected: true, data: null, error: "No projectId configured in connection metadata" });
      return;
    }

    try {
      const traffic = await fetchVercelTraffic(token, projectId, teamId);
      res.json({ connected: true, data: traffic });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      res.json({ connected: true, data: null, error: msg });
    }
  });

  /** POST /companies/:companyId/bi/alerts/:alertId/acknowledge */
  router.post("/companies/:companyId/bi/alerts/:alertId/acknowledge", async (req, res) => {
    assertBoard(req);
    const { companyId, alertId } = req.params;
    assertCompanyAccess(req, companyId);
    await svc.acknowledgeAlert(alertId);
    res.json({ ok: true });
  });

  return router;
}
