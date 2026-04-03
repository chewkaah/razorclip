import { Router } from "express";
import { execSync } from "child_process";
import type { Db } from "@paperclipai/db";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { connectionsService } from "../services/connections.js";
import { checkStripeHealth } from "../services/stripe-bi.js";
import { checkMercuryHealth } from "../services/mercury-bi.js";
import { checkNotionHealth } from "../services/notion-bi.js";
import { checkVercelHealth } from "../services/vercel-bi.js";
import { checkLinkedInHealth } from "../services/linkedin-bi.js";

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

    const conn = await svc.getBySlug(companyId, slug);
    if (!conn) { res.status(404).json({ error: "Connection not found" }); return; }

    // Route health check by slug
    const meta = (conn.metadata ?? {}) as Record<string, unknown>;
    const apiKey = (meta.apiKey as string) ?? undefined;

    if (slug === "stripe-bi" || slug === "stripe-mcp") {
      const key = apiKey ?? process.env.STRIPE_SECRET_KEY;
      if (!key) {
        const updated = await svc.updateStatus(companyId, slug, "error", { lastError: "No API key configured", errorCode: "invalid_credentials" });
        res.json(updated);
        return;
      }
      const result = await checkStripeHealth(key);
      if (result.ok) {
        const updated = await svc.updateStatus(companyId, slug, "connected", { metadata: { ...meta, accountName: result.accountName } });
        res.json(updated);
      } else {
        const updated = await svc.updateStatus(companyId, slug, "error", { lastError: result.error, errorCode: "invalid_credentials" });
        res.json(updated);
      }
      return;
    }

    if (slug === "mercury") {
      const key = apiKey ?? process.env.MERCURY_API_KEY;
      if (!key) {
        const updated = await svc.updateStatus(companyId, slug, "error", { lastError: "No API key configured", errorCode: "invalid_credentials" });
        res.json(updated);
        return;
      }
      const result = await checkMercuryHealth(key);
      if (result.ok) {
        const updated = await svc.updateStatus(companyId, slug, "connected", { metadata: { ...meta, accountCount: result.accountCount } });
        res.json(updated);
      } else {
        const updated = await svc.updateStatus(companyId, slug, "error", { lastError: result.error, errorCode: "invalid_credentials" });
        res.json(updated);
      }
      return;
    }

    if (slug === "notion" || slug === "notion-crm") {
      const key = apiKey ?? (meta.bearerToken as string) ?? process.env.NOTION_INTEGRATION_TOKEN;
      if (!key) {
        const updated = await svc.updateStatus(companyId, slug, "error", { lastError: "No integration token configured", errorCode: "invalid_credentials" });
        res.json(updated);
        return;
      }
      const result = await checkNotionHealth(key);
      if (result.ok) {
        const updated = await svc.updateStatus(companyId, slug, "connected", { metadata: { ...meta, userName: result.userName } });
        res.json(updated);
      } else {
        const updated = await svc.updateStatus(companyId, slug, "error", { lastError: result.error, errorCode: "invalid_credentials" });
        res.json(updated);
      }
      return;
    }

    if (slug === "vercel-analytics" || slug === "vercel") {
      const key = (meta.bearerToken as string) ?? apiKey ?? process.env.VERCEL_API_TOKEN;
      if (!key) {
        const updated = await svc.updateStatus(companyId, slug, "error", { lastError: "No API token configured", errorCode: "invalid_credentials" });
        res.json(updated);
        return;
      }
      const result = await checkVercelHealth(key);
      if (result.ok) {
        const updated = await svc.updateStatus(companyId, slug, "connected", { metadata: { ...meta, userName: result.userName } });
        res.json(updated);
      } else {
        const updated = await svc.updateStatus(companyId, slug, "error", { lastError: result.error, errorCode: "invalid_credentials" });
        res.json(updated);
      }
      return;
    }

    if (slug === "linkedin") {
      const key = (meta.oauthToken as string) ?? (meta.bearerToken as string) ?? apiKey;
      if (!key) {
        const updated = await svc.updateStatus(companyId, slug, "error", { lastError: "No access token configured", errorCode: "invalid_credentials" });
        res.json(updated);
        return;
      }
      const result = await checkLinkedInHealth(key);
      if (result.ok) {
        const updated = await svc.updateStatus(companyId, slug, "connected", { metadata: { ...meta, profileName: result.name } });
        res.json(updated);
      } else {
        const updated = await svc.updateStatus(companyId, slug, "error", { lastError: result.error, errorCode: "invalid_credentials" });
        res.json(updated);
      }
      return;
    }

    // Generic: if there's an API key stored, mark connected; otherwise error
    if (apiKey) {
      const updated = await svc.updateStatus(companyId, slug, "connected");
      res.json(updated);
    } else {
      const updated = await svc.updateStatus(companyId, slug, "error", { lastError: "No credentials configured", errorCode: "invalid_credentials" });
      res.json(updated);
    }
  });

  /** POST /companies/:companyId/connections/:slug/configure — save API key / credentials */
  router.post("/companies/:companyId/connections/:slug/configure", async (req, res) => {
    assertBoard(req);
    const { companyId, slug } = req.params;
    assertCompanyAccess(req, companyId);

    const conn = await svc.getBySlug(companyId, slug);
    if (!conn) { res.status(404).json({ error: "Connection not found" }); return; }

    const { apiKey, bearerToken, oauthToken, secretRef } = req.body;
    if (!apiKey && !bearerToken && !oauthToken && !secretRef) {
      res.status(400).json({ error: "Provide apiKey, bearerToken, oauthToken, or secretRef (op:// reference)" });
      return;
    }

    const { databaseId, organizationId, propertyId, projectId, teamId } = req.body;

    const existingMeta = (conn.metadata ?? {}) as Record<string, unknown>;
    const newMeta = { ...existingMeta };
    if (apiKey) newMeta.apiKey = apiKey;
    if (bearerToken) newMeta.bearerToken = bearerToken;
    if (oauthToken) newMeta.oauthToken = oauthToken;
    if (databaseId) newMeta.databaseId = databaseId;
    if (organizationId) newMeta.organizationId = organizationId;
    if (propertyId) newMeta.propertyId = propertyId;
    if (projectId) newMeta.projectId = projectId;
    if (teamId) newMeta.teamId = teamId;

    // If a 1Password op:// reference is provided, store it in secretRef column
    // and don't store the raw key in metadata
    const updateOpts: { metadata: Record<string, unknown>; secretRef?: string } = { metadata: newMeta };
    if (secretRef && typeof secretRef === "string" && secretRef.startsWith("op://")) {
      updateOpts.secretRef = secretRef;
    }

    const updated = await svc.updateStatus(companyId, slug, "connected", updateOpts);
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
