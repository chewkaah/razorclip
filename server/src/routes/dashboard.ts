import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { dashboardService } from "../services/dashboard.js";
import { usageAggregatorService } from "../services/usage-aggregator.js";
import { assertCompanyAccess } from "./authz.js";

export function dashboardRoutes(db: Db) {
  const router = Router();
  const svc = dashboardService(db);
  const usageAgg = usageAggregatorService(db);

  router.get("/companies/:companyId/dashboard", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const includeUsage = req.query.includeUsage === "true";
    const summary = includeUsage
      ? await svc.summaryWithUsage(companyId, true)
      : await svc.summary(companyId);
    res.json(summary);
  });

  router.post("/companies/:companyId/usage/external", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const { source, model, inputTokens, outputTokens, sessionId } = req.body;
    const modelFamily = model?.toLowerCase().includes("opus") ? "opus" : "sonnet";
    await usageAgg.storeRateLimitSnapshot(companyId, {
      modelFamily,
      usedTokens: (inputTokens ?? 0) + (outputTokens ?? 0),
      source: source ?? "external",
      rawHeaders: { sessionId, inputTokens, outputTokens },
    });
    res.json({ ok: true });
  });

  router.get("/companies/:companyId/usage/rate-limits", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const limits = await usageAgg.getLatestRateLimits(companyId);
    const throttle = usageAgg.evaluateThrottle(limits);
    res.json({ rateLimits: limits, throttle });
  });

  router.get("/companies/:companyId/usage/aggregation", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const window = (req.query.window as "hour" | "day" | "week") ?? "hour";
    const usage = await usageAgg.aggregateUsage(companyId, window);
    res.json(usage);
  });

  return router;
}
