import { and, eq, gte, sql, desc } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { costEvents, agents, rateLimitSnapshots } from "@paperclipai/db";

export interface UsageByModel {
  modelFamily: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  totalTokens: number;
  runCount: number;
  costCents: number;
}

export interface AgentUsage {
  agentId: string;
  agentName: string;
  inputTokens: number;
  outputTokens: number;
  runCount: number;
}

export interface RateLimitStatus {
  modelFamily: string;
  limitTokens: number | null;
  usedTokens: number | null;
  remainingTokens: number | null;
  utilizationPercent: number;
  resetAt: Date | null;
  source: string;
  capturedAt: Date;
}

export interface ThrottleRecommendation {
  action: "none" | "warn" | "throttle_non_critical" | "pause_all";
  reason: string;
  utilizationPercent: number;
  affectedAgents: string[];
}

const THROTTLE_THRESHOLDS = {
  warn: 50,
  throttle: 75,
  pause: 90,
};

const PRIORITY_NEVER_THROTTLE = 2;

function normalizeModelFamily(model: string): string {
  const lower = model.toLowerCase();
  if (lower.includes("opus")) return "opus";
  if (lower.includes("sonnet")) return "sonnet";
  if (lower.includes("haiku")) return "haiku";
  return "other";
}

export function usageAggregatorService(db: Db) {
  return {
    async aggregateUsage(
      companyId: string,
      window: "hour" | "day" | "week" = "hour"
    ): Promise<{ byModel: UsageByModel[]; topAgents: AgentUsage[] }> {
      const now = new Date();
      const windowMs = { hour: 3600000, day: 86400000, week: 604800000 }[window];
      const since = new Date(now.getTime() - windowMs);

      const modelRows = await db
        .select({
          model: costEvents.model,
          inputTokens: sql<number>`coalesce(sum(${costEvents.inputTokens}), 0)::int`,
          outputTokens: sql<number>`coalesce(sum(${costEvents.outputTokens}), 0)::int`,
          cachedInputTokens: sql<number>`coalesce(sum(${costEvents.cachedInputTokens}), 0)::int`,
          costCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)::int`,
          runCount: sql<number>`count(distinct ${costEvents.heartbeatRunId})::int`,
        })
        .from(costEvents)
        .where(and(eq(costEvents.companyId, companyId), gte(costEvents.occurredAt, since)))
        .groupBy(costEvents.model);

      const byFamily: Record<string, UsageByModel> = {};
      for (const row of modelRows) {
        const family = normalizeModelFamily(row.model);
        if (!byFamily[family]) {
          byFamily[family] = {
            modelFamily: family,
            inputTokens: 0,
            outputTokens: 0,
            cachedInputTokens: 0,
            totalTokens: 0,
            runCount: 0,
            costCents: 0,
          };
        }
        byFamily[family].inputTokens += Number(row.inputTokens);
        byFamily[family].outputTokens += Number(row.outputTokens);
        byFamily[family].cachedInputTokens += Number(row.cachedInputTokens);
        byFamily[family].costCents += Number(row.costCents);
        byFamily[family].runCount += Number(row.runCount);
      }
      for (const f of Object.values(byFamily)) {
        f.totalTokens = f.inputTokens + f.outputTokens;
      }

      const agentRows = await db
        .select({
          agentId: costEvents.agentId,
          agentName: agents.name,
          inputTokens: sql<number>`coalesce(sum(${costEvents.inputTokens}), 0)::int`,
          outputTokens: sql<number>`coalesce(sum(${costEvents.outputTokens}), 0)::int`,
          runCount: sql<number>`count(distinct ${costEvents.heartbeatRunId})::int`,
        })
        .from(costEvents)
        .leftJoin(agents, eq(costEvents.agentId, agents.id))
        .where(and(eq(costEvents.companyId, companyId), gte(costEvents.occurredAt, since)))
        .groupBy(costEvents.agentId, agents.name)
        .orderBy(sql`sum(${costEvents.inputTokens} + ${costEvents.outputTokens}) desc`)
        .limit(10);

      return {
        byModel: Object.values(byFamily),
        topAgents: agentRows.map((r) => ({
          agentId: r.agentId,
          agentName: r.agentName ?? "Unknown",
          inputTokens: Number(r.inputTokens),
          outputTokens: Number(r.outputTokens),
          runCount: Number(r.runCount),
        })),
      };
    },

    async getLatestRateLimits(companyId: string): Promise<RateLimitStatus[]> {
      const snapshots = await db
        .selectDistinctOn([rateLimitSnapshots.modelFamily])
        .from(rateLimitSnapshots)
        .where(eq(rateLimitSnapshots.companyId, companyId))
        .orderBy(rateLimitSnapshots.modelFamily, desc(rateLimitSnapshots.capturedAt))
        .limit(5);

      return snapshots.map((s) => {
        const limit = s.limitTokens ?? 0;
        const used = s.usedTokens ?? 0;
        return {
          modelFamily: s.modelFamily,
          limitTokens: s.limitTokens,
          usedTokens: s.usedTokens,
          remainingTokens: s.remainingTokens,
          utilizationPercent: limit > 0 ? (used / limit) * 100 : 0,
          resetAt: s.resetAt,
          source: s.source,
          capturedAt: s.capturedAt,
        };
      });
    },

    async storeRateLimitSnapshot(
      companyId: string,
      data: {
        modelFamily: string;
        limitTokens?: number;
        usedTokens?: number;
        remainingTokens?: number;
        resetAt?: Date;
        source: string;
        rawHeaders?: Record<string, unknown>;
      }
    ) {
      await db.insert(rateLimitSnapshots).values({
        companyId,
        modelFamily: data.modelFamily,
        windowType: "minute",
        limitTokens: data.limitTokens,
        usedTokens: data.usedTokens,
        remainingTokens: data.remainingTokens,
        resetAt: data.resetAt,
        source: data.source,
        rawHeaders: data.rawHeaders,
      });
    },

    evaluateThrottle(rateLimits: RateLimitStatus[]): ThrottleRecommendation {
      const opus = rateLimits.find((r) => r.modelFamily === "opus");
      if (!opus) {
        return { action: "none", reason: "No Opus rate limit data", utilizationPercent: 0, affectedAgents: [] };
      }

      const util = opus.utilizationPercent;

      if (util >= THROTTLE_THRESHOLDS.pause) {
        return {
          action: "pause_all",
          reason: `Opus at ${util.toFixed(0)}% - pause all non-critical agents`,
          utilizationPercent: util,
          affectedAgents: [],
        };
      }
      if (util >= THROTTLE_THRESHOLDS.throttle) {
        return {
          action: "throttle_non_critical",
          reason: `Opus at ${util.toFixed(0)}% - downgrade non-critical to Sonnet`,
          utilizationPercent: util,
          affectedAgents: [],
        };
      }
      if (util >= THROTTLE_THRESHOLDS.warn) {
        return {
          action: "warn",
          reason: `Opus at ${util.toFixed(0)}% - warning threshold`,
          utilizationPercent: util,
          affectedAgents: [],
        };
      }

      return { action: "none", reason: "Normal", utilizationPercent: util, affectedAgents: [] };
    },

    shouldThrottleAgent(
      agentPriority: number,
      throttleRec: ThrottleRecommendation
    ): { shouldThrottle: boolean; downgradeToSonnet: boolean; shouldPause: boolean } {
      if (agentPriority <= PRIORITY_NEVER_THROTTLE) {
        return { shouldThrottle: false, downgradeToSonnet: false, shouldPause: false };
      }

      if (throttleRec.action === "pause_all") {
        return { shouldThrottle: true, downgradeToSonnet: false, shouldPause: true };
      }
      if (throttleRec.action === "throttle_non_critical") {
        return { shouldThrottle: true, downgradeToSonnet: true, shouldPause: false };
      }

      return { shouldThrottle: false, downgradeToSonnet: false, shouldPause: false };
    },
  };
}
