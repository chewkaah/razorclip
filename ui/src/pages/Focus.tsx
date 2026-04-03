/**
 * Focus — Aperture attention engine.
 *
 * Deterministic 3-lane view: NOW / NEXT / AMBIENT.
 * Issues are sorted into lanes based on status + priority,
 * with explainability text under each card.
 */
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { relativeTime, cn } from "../lib/utils";
import { AGENT_REGISTRY, type AgentSlug } from "../components/kinetic/AgentChip";
import { Link } from "@/lib/router";
import { GlassCard } from "../components/kinetic/GlassCard";
import type { Issue, Agent } from "@paperclipai/shared";

/* ── Lane definitions ──────────────────────────────────── */

interface LaneDef {
  key: "now" | "next" | "ambient";
  title: string;
  icon: string;
  accent: string;
  filter: (issue: Issue) => boolean;
  explain: (issue: Issue) => string;
}

const LANES: LaneDef[] = [
  {
    key: "now",
    title: "Now",
    icon: "priority",
    accent: "#EF4444",
    filter: (i) =>
      i.status === "in_progress" ||
      (i as any).priority === "urgent" ||
      (i as any).priority === "high",
    explain: (i) => {
      if (i.status === "in_progress" && ((i as any).priority === "urgent" || (i as any).priority === "high"))
        return "High priority, actively worked on";
      if (i.status === "in_progress") return "Actively in progress";
      if ((i as any).priority === "urgent") return "Urgent priority";
      return "High priority";
    },
  },
  {
    key: "next",
    title: "Next",
    icon: "schedule",
    accent: "#F59E0B",
    filter: (i) => i.status === "todo" && (i as any).priority === "normal",
    explain: () => "Queued, normal priority",
  },
  {
    key: "ambient",
    title: "Ambient",
    icon: "visibility",
    accent: "#6366F1",
    filter: () => true, // catch-all — applied after other lanes claim issues
    explain: (i) => {
      if ((i as any).priority === "low") return "Low priority, no recent activity";
      if (i.status === "backlog") return "Backlog item, monitoring";
      return "Background awareness";
    },
  },
];

/* ── Confidence heuristic ──────────────────────────────── */

function confidenceColor(issue: Issue): string {
  const p = (issue as any).priority as string | undefined;
  if (issue.status === "in_progress" || p === "urgent" || p === "high") return "#22C55E"; // green
  if (p === "normal" || issue.status === "todo") return "#F59E0B"; // amber
  return "#F59E0B"; // amber default
}

/* ── Helpers ───────────────────────────────────────────── */

function resolveSlug(name: string): AgentSlug | null {
  const s = name.toLowerCase().trim();
  return s in AGENT_REGISTRY ? (s as AgentSlug) : null;
}

function MI({ icon, className, style }: { icon: string; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={cn("material-symbols-outlined text-lg", className)}
      style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24", ...style }}
    >
      {icon}
    </span>
  );
}

/* ── Component ─────────────────────────────────────────── */

export function Focus() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Focus" }]);
  }, [setBreadcrumbs]);

  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>();
    agents?.forEach((a) => m.set(a.id, a));
    return m;
  }, [agents]);

  /* Partition issues into lanes — each issue goes to the FIRST matching lane */
  const laneBuckets = useMemo(() => {
    const buckets: Record<string, Issue[]> = { now: [], next: [], ambient: [] };
    const claimed = new Set<string>();

    const openIssues = (issues ?? []).filter(
      (i) => i.status !== "done" && i.status !== "cancelled",
    );

    // Sort by updatedAt descending so most-recent appears first in each lane
    const sorted = [...openIssues].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    for (const lane of LANES) {
      if (lane.key === "ambient") continue; // ambient is catch-all
      for (const issue of sorted) {
        if (claimed.has(issue.id)) continue;
        if (lane.filter(issue)) {
          buckets[lane.key].push(issue);
          claimed.add(issue.id);
        }
      }
    }

    // Ambient = everything not claimed
    for (const issue of sorted) {
      if (!claimed.has(issue.id)) {
        buckets.ambient.push(issue);
      }
    }

    return buckets;
  }, [issues]);

  /* ── Render ──────────────────────────────────────────── */

  if (issuesLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl tracking-tight text-[--rc-on-surface]">
          Attention <span className="font-bold">Focus</span>
        </h1>
        <p className="mt-1 text-sm text-[--rc-on-surface-variant]">
          Deterministic attention engine — issues prioritized into now, next, and ambient lanes.
        </p>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {LANES.map((lane) => {
          const items = laneBuckets[lane.key];
          return (
            <GlassCard key={lane.key} className="p-0 overflow-hidden">
              {/* Lane header */}
              <div
                className="flex items-center gap-3 px-5 py-4 border-b border-white/5"
                style={{ borderBottomColor: `${lane.accent}20` }}
              >
                <MI icon={lane.icon} style={{ color: lane.accent }} />
                <span
                  className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: lane.accent }}
                >
                  {lane.title}
                </span>
                <span
                  className="ml-auto inline-flex items-center justify-center rounded-full text-xs font-medium min-w-[22px] h-[22px] px-1.5"
                  style={{ backgroundColor: `${lane.accent}20`, color: lane.accent }}
                >
                  {items.length}
                </span>
              </div>

              {/* Issue list */}
              <div className="p-3 space-y-2 max-h-[65vh] overflow-y-auto">
                {items.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <MI
                      icon={lane.icon}
                      className="text-3xl mb-2"
                      style={{ color: `${lane.accent}40` }}
                    />
                    <p className="text-xs text-[--rc-on-surface-variant]">
                      No issues in {lane.title.toLowerCase()} lane
                    </p>
                  </div>
                )}

                {items.map((issue) => {
                  const agent = issue.assigneeAgentId
                    ? agentMap.get(issue.assigneeAgentId)
                    : null;
                  const slug = agent ? resolveSlug(agent.name) : null;
                  const agentCfg = slug ? AGENT_REGISTRY[slug] : null;
                  const prefix = (issue as any).issuePrefix;
                  const num = (issue as any).issueNumber;

                  return (
                    <Link
                      key={issue.id}
                      to={`/issues/${issue.id}`}
                      className="block group"
                    >
                      <div className="relative rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.06] transition-all duration-200 overflow-hidden">
                        {/* Confidence bar */}
                        <div
                          className="absolute top-0 left-0 right-0 h-[2px]"
                          style={{ backgroundColor: confidenceColor(issue) }}
                        />

                        <div className="px-4 py-3 pt-4 space-y-1.5">
                          {/* Prefix + title */}
                          <div className="flex items-start gap-2">
                            {prefix && (
                              <span className="shrink-0 text-[11px] font-mono text-[--rc-on-surface-variant]">
                                {prefix}-{num}
                              </span>
                            )}
                            <span className="text-sm text-[--rc-on-surface] line-clamp-2 group-hover:text-white transition-colors">
                              {issue.title}
                            </span>
                          </div>

                          {/* Agent chip + time */}
                          <div className="flex items-center gap-2 text-xs text-[--rc-on-surface-variant]">
                            {agent && agentCfg && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                                style={{
                                  backgroundColor: `${agentCfg.color}20`,
                                  color: agentCfg.color,
                                }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: agentCfg.color }}
                                />
                                {agentCfg.label}
                              </span>
                            )}
                            <span className="ml-auto">
                              {relativeTime(issue.updatedAt)}
                            </span>
                          </div>

                          {/* Explainability */}
                          <p className="text-[10px] text-[--rc-on-surface-variant]/60 italic">
                            {lane.explain(issue)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
