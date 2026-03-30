import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "../api/agents";
import { heartbeatsApi } from "../api/heartbeats";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { cn, agentUrl } from "../lib/utils";
import {
  GlassCard,
  AgentAvatar,
  AgentChip,
  StatusDot,
  SectionHeader,
  AGENT_REGISTRY,
  type AgentSlug,
} from "../components/kinetic";
import { LayoutGrid, List, MessageSquare } from "lucide-react";
import { AGENT_ROLE_LABELS, type Agent } from "@paperclipai/shared";

const roleLabels = AGENT_ROLE_LABELS as Record<string, string>;

/** Try to match an agent name to our Kinetic Terminal agent registry */
function resolveAgentSlug(name: string): AgentSlug | null {
  const slug = name.toLowerCase().trim();
  if (slug in AGENT_REGISTRY) return slug as AgentSlug;
  return null;
}

type ViewMode = "grid" | "list";

export function AgentGrid() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("grid");

  useEffect(() => {
    setBreadcrumbs([{ label: "Agents" }]);
  }, [setBreadcrumbs]);

  const { data: agents, isLoading } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: runs } = useQuery({
    queryKey: queryKeys.heartbeats(selectedCompanyId!),
    queryFn: () => heartbeatsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 15_000,
  });

  const liveRunByAgent = useMemo(() => {
    const map = new Map<string, { runId: string; liveCount: number }>();
    for (const r of runs ?? []) {
      if (r.status !== "running" && r.status !== "queued") continue;
      const existing = map.get(r.agentId);
      if (existing) {
        existing.liveCount += 1;
      } else {
        map.set(r.agentId, { runId: r.id, liveCount: 1 });
      }
    }
    return map;
  }, [runs]);

  const sorted = useMemo(() => {
    return [...(agents ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  }, [agents]);

  const onlineCount = sorted.filter(
    (a) => a.status === "running" || a.status === "idle" || a.status === "active",
  ).length;
  const errorCount = sorted.filter((a) => a.status === "error").length;

  if (isLoading) {
    return (
      <div className="kt-page min-h-full pb-4 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4 mt-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl h-20 border border-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="kt-page min-h-full pb-4 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-kt-primary font-bold mb-1">
              Active Cluster
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-kt-on-surface">Agent Grid</h1>
          </div>
          {/* View toggle */}
          <div className="flex glass-card rounded-lg border border-white/5 overflow-hidden">
            <button
              className={cn(
                "p-2 transition-all",
                view === "grid" ? "bg-kt-primary/10 text-kt-primary" : "text-kt-on-surface-variant/50 hover:text-kt-primary",
              )}
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              className={cn(
                "p-2 transition-all",
                view === "list" ? "bg-kt-primary/10 text-kt-primary" : "text-kt-on-surface-variant/50 hover:text-kt-primary",
              )}
              onClick={() => setView("list")}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {/* Status counts */}
        <div className="flex items-center gap-3">
          {onlineCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-500">{onlineCount} ONLINE</span>
            </div>
          )}
          {errorCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-kt-danger" />
              <span className="text-[10px] font-semibold text-kt-danger">{errorCount} ERRORED</span>
            </div>
          )}
        </div>
      </section>

      {/* Grid View */}
      {view === "grid" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {sorted.map((agent) => (
            <AgentCardGrid key={agent.id} agent={agent} liveRun={liveRunByAgent.get(agent.id)} />
          ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="space-y-2">
          {sorted.map((agent) => (
            <AgentCardList key={agent.id} agent={agent} liveRun={liveRunByAgent.get(agent.id)} />
          ))}
        </div>
      )}

      {/* Footer Metrics Bar (desktop) */}
      {sorted.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/5 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-6 md:gap-10">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Total Agents</p>
              <p className="text-lg font-bold tabular-nums text-kt-on-surface">{sorted.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Core Utilization</p>
              <p className="text-lg font-bold tabular-nums text-kt-on-surface">
                {onlineCount > 0 ? Math.round((onlineCount / sorted.length) * 100) : 0}
                <span className="text-sm text-kt-on-surface-variant/50">%</span>
              </p>
            </div>
            <div className="hidden md:block">
              <p className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Error Rate</p>
              <p className="text-lg font-bold tabular-nums text-kt-on-surface">
                {errorCount > 0 ? Math.round((errorCount / sorted.length) * 100) : 0}
                <span className="text-sm text-kt-on-surface-variant/50">%</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-kt-on-surface-variant/30">
            <span>Last synced: just now</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** 2x3 card grid item — matches Stitch agent_grid_2 */
function AgentCardGrid({
  agent,
  liveRun,
}: {
  agent: Agent;
  liveRun?: { runId: string; liveCount: number };
}) {
  const slug = resolveAgentSlug(agent.name);
  const config = slug ? AGENT_REGISTRY[slug] : null;
  const isActive = agent.status === "running" || agent.status === "active" || agent.status === "idle";
  const isError = agent.status === "error";

  return (
    <Link to={agentUrl(agent)} className="no-underline text-inherit">
      <GlassCard
        variant="interactive"
        className={cn(
          "p-4 flex flex-col gap-3 min-h-[140px]",
          isActive && config && config.glowClass,
          isActive && "kt-ambient-glow",
        )}
      >
        {/* Avatar + Status */}
        <div className="flex items-start justify-between">
          {slug ? (
            <AgentAvatar agent={slug} size="sm" showRing={isActive} />
          ) : (
            <div className="w-10 h-10 rounded-full bg-kt-surface-container-high flex items-center justify-center border border-white/10">
              <span className="text-xs font-bold text-kt-on-surface-variant">{agent.name[0]}</span>
            </div>
          )}
          <StatusDot
            status={isError ? "error" : isActive ? "active" : "idle"}
            size="sm"
          />
        </div>

        {/* Name + Role */}
        <div>
          <p className="text-sm font-bold text-kt-on-surface truncate">{agent.name}</p>
          <p
            className="text-[10px] uppercase tracking-wider truncate"
            style={{ color: config?.color ?? "#c7c4d7" }}
          >
            {agent.title || roleLabels[agent.role] || agent.role}
          </p>
        </div>

        {/* Task Snippet (desktop shows more detail) */}
        <div className="mt-auto space-y-2">
          {liveRun ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] uppercase tracking-wider text-kt-on-surface-variant/40">Task Snippet</span>
                <span className="text-[10px] font-bold tabular-nums text-kt-primary">
                  {liveRun.liveCount > 1 ? `${liveRun.liveCount} tasks` : "Running"}
                </span>
              </div>
              <div className="w-full h-1 bg-kt-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-kt-primary-container to-kt-primary w-[60%] rounded-full animate-pulse" />
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-kt-on-surface-variant/60 truncate">
              {agent.status === "error"
                ? "Connection Timed Out"
                : agent.status === "idle" || agent.status === "active"
                  ? "Idle"
                  : agent.status}
            </p>
          )}

          {/* 8W Activity sparkline (desktop) */}
          <div className="hidden md:block">
            <p className="text-[9px] uppercase tracking-wider text-kt-on-surface-variant/30 mb-1">8W Activity</p>
            <div className="flex gap-0.5 h-4 items-end">
              {[...Array(8)].map((_, i) => {
                const h = isActive ? Math.random() * 80 + 20 : Math.random() * 30 + 5;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-sm transition-all"
                    style={{
                      height: `${h}%`,
                      backgroundColor: isActive
                        ? config?.color ?? "#c2c1ff"
                        : "rgba(199, 196, 215, 0.15)",
                      opacity: isActive ? 0.6 + (i / 8) * 0.4 : 0.3,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}

/** Full-width list row — matches Stitch agent_grid_1 */
function AgentCardList({
  agent,
  liveRun,
}: {
  agent: Agent;
  liveRun?: { runId: string; liveCount: number };
}) {
  const slug = resolveAgentSlug(agent.name);
  const config = slug ? AGENT_REGISTRY[slug] : null;
  const isActive = agent.status === "running" || agent.status === "active" || agent.status === "idle";
  const isError = agent.status === "error";

  return (
    <Link to={agentUrl(agent)} className="no-underline text-inherit">
      <GlassCard
        variant="interactive"
        className="p-4 flex items-center gap-4"
        accentBorder={isActive ? config?.color : undefined}
      >
        {/* Avatar */}
        {slug ? (
          <AgentAvatar agent={slug} size="sm" showRing={isActive} />
        ) : (
          <div className="w-10 h-10 rounded-full bg-kt-surface-container-high flex items-center justify-center border border-white/10 shrink-0">
            <span className="text-xs font-bold text-kt-on-surface-variant">{agent.name[0]}</span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-kt-on-surface truncate">{agent.name}</p>
            {liveRun && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase">Live</span>
              </span>
            )}
          </div>
          <p
            className="text-[11px] truncate"
            style={{ color: config?.color ?? "#c7c4d7" }}
          >
            {agent.title || roleLabels[agent.role] || agent.role}
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "text-[10px] font-bold uppercase px-2 py-1 rounded-full",
              isActive && "bg-emerald-500/10 text-emerald-400",
              isError && "bg-kt-danger/10 text-kt-danger",
              !isActive && !isError && "bg-white/5 text-kt-on-surface-variant/50",
            )}
          >
            {agent.status}
          </span>
        </div>
      </GlassCard>
    </Link>
  );
}
