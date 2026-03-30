import { useEffect, useMemo } from "react";
import { useParams, Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "../api/agents";
import { heartbeatsApi } from "../api/heartbeats";
import { issuesApi } from "../api/issues";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useSidebar } from "../context/SidebarContext";
import { queryKeys } from "../lib/queryKeys";
import { cn, formatCents, relativeTime, agentUrl } from "../lib/utils";
import {
  GlassCard,
  AgentAvatar,
  SectionHeader,
  StatusDot,
  LiveExecutionLog,
  AGENT_REGISTRY,
  type AgentSlug,
} from "../components/kinetic";
import { MessageSquare, Zap, Clock, DollarSign, Target, Activity } from "lucide-react";
import { AGENT_ROLE_LABELS, type Agent } from "@paperclipai/shared";

const roleLabels = AGENT_ROLE_LABELS as Record<string, string>;

function resolveAgentSlug(name: string): AgentSlug | null {
  const slug = name.toLowerCase().trim();
  if (slug in AGENT_REGISTRY) return slug as AgentSlug;
  return null;
}

export function AgentProfile() {
  const { agentId } = useParams<{ agentId: string }>();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { isMobile } = useSidebar();

  // agentId from route may be a UUID or a slug/urlKey — fetch the full list and resolve
  const { data: allAgents, isLoading: agentsLoading } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  // Resolve the agent from the route param (could be UUID, urlKey, or name slug)
  const agent = useMemo(() => {
    if (!allAgents || !agentId) return null;
    return allAgents.find((a: any) =>
      a.id === agentId ||
      a.urlKey === agentId ||
      a.name.toLowerCase().replace(/\s+/g, "-") === agentId.toLowerCase() ||
      a.name.toLowerCase() === agentId.toLowerCase()
    ) ?? null;
  }, [allAgents, agentId]);

  const isLoading = agentsLoading;

  const resolvedAgentId = (agent as any)?.id ?? null;

  const { data: runs } = useQuery({
    queryKey: queryKeys.heartbeats(selectedCompanyId!, resolvedAgentId),
    queryFn: () => heartbeatsApi.list(selectedCompanyId!, resolvedAgentId),
    enabled: !!selectedCompanyId && !!resolvedAgentId,
    refetchInterval: 10_000,
  });

  const agentData = agent as any;
  const agentName = agentData?.name ?? "Agent";
  const slug = resolveAgentSlug(agentName);
  const config = slug ? AGENT_REGISTRY[slug] : null;
  const accentColor = config?.color ?? "#c2c1ff";
  const isActive = agentData?.status === "running" || agentData?.status === "idle" || agentData?.status === "active";
  const isError = agentData?.status === "error";

  const liveRuns = useMemo(() => {
    return (runs ?? []).filter((r: any) => r.status === "running" || r.status === "queued");
  }, [runs]);

  const recentRuns = useMemo(() => {
    return (runs ?? [])
      .filter((r: any) => r.status === "completed" || r.status === "failed")
      .slice(0, 5);
  }, [runs]);

  const totalCost = agentData?.totalSpendCents ? formatCents(agentData.totalSpendCents) : "—";

  useEffect(() => {
    if (agentData) {
      setBreadcrumbs([
        { label: "Agents", href: "/agents/grid" },
        { label: agentData.name },
      ]);
    }
  }, [agentData, setBreadcrumbs]);

  if (isLoading) {
    return (
      <div className="kt-page min-h-full pb-4 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6 pt-4">
          <div className="glass-card rounded-2xl h-48 border border-white/5" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl h-32 border border-white/5" />
            <div className="glass-card rounded-2xl h-32 border border-white/5" />
            <div className="glass-card rounded-2xl h-32 border border-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (!agentData) {
    return (
      <div className="kt-page min-h-full flex items-center justify-center">
        <p className="text-kt-on-surface-variant">Agent not found</p>
      </div>
    );
  }

  return (
    <div className="kt-page min-h-full pb-4 space-y-6 max-w-5xl mx-auto">
      {/* Hero Card */}
      <div
        className="relative rounded-2xl overflow-hidden border border-white/5"
        style={{
          background: `linear-gradient(135deg, ${accentColor}08, ${accentColor}03, transparent)`,
        }}
      >
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
          {/* Avatar */}
          {slug ? (
            <AgentAvatar agent={slug} size="lg" showRing={isActive} />
          ) : (
            <div className="w-20 h-20 rounded-full bg-kt-surface-container-high flex items-center justify-center border border-white/10">
              <span className="text-2xl font-bold text-kt-on-surface-variant">{agentName[0]}</span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight text-kt-on-surface">{agentName}</h1>
              <StatusDot status={isError ? "error" : isActive ? "active" : "idle"} size="lg" />
            </div>
            <p
              className="text-sm font-bold uppercase tracking-wider mb-3"
              style={{ color: accentColor }}
            >
              {agentData.title || roleLabels[agentData.role] || agentData.role}
            </p>
            {agentData.personality && (
              <p className="text-sm text-kt-on-surface-variant/70 max-w-xl leading-relaxed italic">
                "{agentData.personality}"
              </p>
            )}
          </div>

          {/* Quick stats (desktop) */}
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Status</p>
              <p className={cn(
                "text-sm font-bold uppercase",
                isActive && "text-emerald-400",
                isError && "text-kt-danger",
                !isActive && !isError && "text-kt-on-surface-variant",
              )}>
                {agentData.status}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Cost</p>
              <p className="text-sm font-bold tabular-nums text-kt-on-surface">{totalCost}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-3.5 h-3.5 text-kt-on-surface-variant/40" />
            <span className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Tasks</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-kt-on-surface">
            {(runs ?? []).length}
          </p>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-kt-on-surface-variant/40" />
            <span className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Cost</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-kt-on-surface">{totalCost}</p>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-3.5 h-3.5 text-kt-on-surface-variant/40" />
            <span className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Live Runs</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-kt-on-surface">{liveRuns.length}</p>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-kt-on-surface-variant/40" />
            <span className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Last Active</span>
          </div>
          <p className="text-sm font-bold text-kt-on-surface">
            {agentData.lastHeartbeatAt ? relativeTime(agentData.lastHeartbeatAt) : "—"}
          </p>
        </GlassCard>
      </div>

      {/* Main Content — 2 columns on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column (2/3) */}
        <div className="md:col-span-2 space-y-6">
          {/* Live Execution */}
          {liveRuns.length > 0 && (
            <section className="space-y-3">
              <SectionHeader title="Live Execution" />
              <LiveExecutionLog
                agentSlug={slug}
                agentName={agentName}
                isLive
                lines={[
                  { timestamp: "...", text: "Waiting for output stream...", status: "info" },
                ]}
              />
            </section>
          )}

          {/* Recent Runs */}
          <section className="space-y-3">
            <SectionHeader
              title="Recent Completions"
              trailing={
                <Link
                  to={agentUrl(agentData)}
                  className="text-[10px] text-kt-primary font-bold uppercase tracking-wider hover:text-kt-primary/80"
                >
                  View All →
                </Link>
              }
            />
            {recentRuns.length > 0 ? (
              <div className="space-y-2">
                {recentRuns.map((run: any) => (
                  <GlassCard key={run.id} variant="interactive" className="p-4 flex items-center gap-4">
                    <StatusDot
                      status={run.status === "completed" ? "connected" : "error"}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-kt-on-surface truncate">
                        Run {run.id.slice(0, 8)}
                      </p>
                      <p className="text-[10px] text-kt-on-surface-variant/50 tabular-nums">
                        {relativeTime(run.completedAt || run.createdAt)}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                      run.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-kt-danger/10 text-kt-danger",
                    )}>
                      {run.status}
                    </span>
                  </GlassCard>
                ))}
              </div>
            ) : (
              <GlassCard className="p-4">
                <p className="text-sm text-kt-on-surface-variant/50 text-center py-4">No recent runs</p>
              </GlassCard>
            )}
          </section>
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-6">
          {/* Agent Config */}
          <section className="space-y-3">
            <SectionHeader title="Configuration" />
            <GlassCard className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Adapter</span>
                <span className="text-xs font-mono text-kt-on-surface">{agentData.adapterType}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Model</span>
                <span className="text-xs font-mono text-kt-on-surface">{agentData.model || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Role</span>
                <span className="text-xs text-kt-on-surface">{roleLabels[agentData.role] || agentData.role}</span>
              </div>
              {agentData.reportsToAgentId && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Reports To</span>
                  <span className="text-xs text-kt-primary">{agentData.reportsToAgentId.slice(0, 8)}</span>
                </div>
              )}
            </GlassCard>
          </section>

          {/* Skills / Capabilities */}
          <section className="space-y-3">
            <SectionHeader title="Capabilities" />
            <GlassCard className="p-4">
              <div className="flex flex-wrap gap-2">
                {agentData.title ? (
                  agentData.title.split(/[,&]/).map((skill: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                      style={{
                        backgroundColor: `${accentColor}10`,
                        borderColor: `${accentColor}25`,
                        color: config?.colorLight ?? "#c7c4d7",
                      }}
                    >
                      {skill.trim()}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-kt-on-surface-variant/40">No capabilities defined</p>
                )}
              </div>
            </GlassCard>
          </section>

          {/* Chat CTA */}
          <Link
            to={`/chat`}
            className="block w-full py-3 rounded-2xl bg-kt-primary text-kt-on-primary text-center text-sm font-bold uppercase tracking-wider active:scale-95 transition-transform no-underline hover:opacity-90"
          >
            <div className="flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat with {agentName}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
