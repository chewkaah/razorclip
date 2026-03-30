import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { connectionsService } from "../services/connections.js";

export function connectionRoutes(db: Db) {
  const router = Router();
  const svc = connectionsService(db);

  /** GET /companies/:companyId/connections — list all connections (seeds defaults on first call) */
  router.get("/companies/:companyId/connections", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    // Seed defaults if this is the first time
    await svc.seedDefaults(companyId);

    const conns = await svc.list(companyId);
    res.json(conns);
  });

  /** GET /companies/:companyId/connections/:slug — single connection detail */
  router.get("/companies/:companyId/connections/:slug", async (req, res) => {
    assertBoard(req);
    const { companyId, slug } = req.params;
    assertCompanyAccess(req, companyId);

    const conn = await svc.getBySlug(companyId, slug);
    if (!conn) { res.status(404).json({ error: "Connection not found" }); return; }
    res.json(conn);
  });

  /** POST /companies/:companyId/connections/:slug/enable */
  router.post("/companies/:companyId/connections/:slug/enable", async (req, res) => {
    assertBoard(req);
    const { companyId, slug } = req.params;
    assertCompanyAccess(req, companyId);

    const updated = await svc.enable(companyId, slug);
    if (!updated) { res.status(404).json({ error: "Connection not found" }); return; }
    res.json(updated);
  });

  /** POST /companies/:companyId/connections/:slug/disable */
  router.post("/companies/:companyId/connections/:slug/disable", async (req, res) => {
    assertBoard(req);
    const { companyId, slug } = req.params;
    assertCompanyAccess(req, companyId);

    const updated = await svc.disable(companyId, slug);
    if (!updated) { res.status(404).json({ error: "Connection not found" }); return; }
    res.json(updated);
  });

  /** POST /companies/:companyId/connections/:slug/test — health check */
  router.post("/companies/:companyId/connections/:slug/test", async (req, res) => {
    assertBoard(req);
    const { companyId, slug } = req.params;
    assertCompanyAccess(req, companyId);

    // TODO: implement actual health check per adapter
    const updated = await svc.updateStatus(companyId, slug, "connected");
    if (!updated) { res.status(404).json({ error: "Connection not found" }); return; }
    res.json(updated);
  });

  /** GET /companies/:companyId/connections/:slug/sync-logs — recent sync history */
  router.get("/companies/:companyId/connections/:slug/sync-logs", async (req, res) => {
    assertBoard(req);
    const { companyId, slug } = req.params;
    assertCompanyAccess(req, companyId);

    const conn = await svc.getBySlug(companyId, slug);
    if (!conn) { res.status(404).json({ error: "Connection not found" }); return; }

    const logs = await svc.getSyncLogs(conn.id);
    res.json(logs);
  });

  return router;
}
