import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { biService } from "../services/bi.js";

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
