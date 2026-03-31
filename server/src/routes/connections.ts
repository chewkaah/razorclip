import { Router } from "express";
import { execSync } from "child_process";
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

  /** POST /companies/:companyId/connections — create a new connection */
  router.post("/companies/:companyId/connections", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const { slug, displayName, category, connectionType, authMechanism, status } = req.body;
    if (!slug || !displayName) {
      res.status(400).json({ error: "slug and displayName are required" });
      return;
    }

    const cleanSlug = (slug || displayName).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");

    // If it looks like an npm package, try to add it as an MCP via Claude CLI
    const isNpmPackage = cleanSlug.startsWith("@") || cleanSlug.includes("/") || slug?.includes("@");
    let mcpInstalled = false;

    if (isNpmPackage && slug) {
      try {
        // Use claude mcp add to register the MCP server
        execSync(`claude mcp add "${cleanSlug}" -- npx -y "${slug}"`, {
          timeout: 30000,
          stdio: "pipe",
        });
        mcpInstalled = true;
      } catch (err) {
        // MCP install is best-effort — still create the DB record
        console.warn(`MCP install failed for ${slug}:`, (err as Error).message);
      }
    }

    const created = await svc.create(companyId, {
      slug: cleanSlug,
      displayName,
      category: category || "Custom",
      connectionType: connectionType || (isNpmPackage ? "mcp_server" : "api_key"),
      authMechanism: authMechanism || "api_key",
      status: mcpInstalled ? "connected" : undefined,
    });
    res.status(201).json({ ...created, mcpInstalled });
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
