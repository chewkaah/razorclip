import { useEffect, useMemo } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "../api/agents";
import { heartbeatsApi } from "../api/heartbeats";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { cn, agentUrl } from "../lib/utils";
// Layout provided by RazorclipShell via router — no wrapper needed here
import { AGENT_REGISTRY, type AgentSlug } from "../components/kinetic/AgentChip";
import { AGENT_ROLE_LABELS, type Agent, type HeartbeatRun } from "@paperclipai/shared";
import { getAgentAvatar } from "../components/kinetic/agent-avatars";

const roleLabels = AGENT_ROLE_LABELS as Record<string, string>;

/**
 * Build 8-week activity sparkline data (weekly run counts) for each agent.
 * Returns a Map of agentId -> array of 8 numbers (oldest week first).
 */
function buildWeeklyActivity(runs: HeartbeatRun[]): Map<string, number[]> {
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const map = new Map<string, number[]>();

  for (const run of runs) {
    const agentId = run.agentId;
    if (!agentId) continue;
    const startedAt = run.startedAt ? new Date(run.startedAt as any).getTime() : new Date(run.createdAt as any).getTime();
    if (!startedAt) continue;
    const weeksAgo = Math.floor((now - startedAt) / WEEK_MS);
    if (weeksAgo < 0 || weeksAgo >= 8) continue;
    const weekIndex = 7 - weeksAgo; // 0 = oldest, 7 = most recent
    if (!map.has(agentId)) map.set(agentId, [0, 0, 0, 0, 0, 0, 0, 0]);
    const arr = map.get(agentId)!;
    arr[weekIndex]++;
  }
  return map;
}

/**
 * Derive a task snippet from the most recent run for an agent.
 */
function getTaskSnippet(
  agentRuns: HeartbeatRun[],
  agentId: string,
  isActive: boolean,
  isError: boolean,
): { text: string; progress: number } {
  const agentRunsSorted = agentRuns
    .filter((r) => r.agentId === agentId)
    .sort((a, b) => {
      const aTime = a.startedAt ? new Date(a.startedAt as any).getTime() : 0;
      const bTime = b.startedAt ? new Date(b.startedAt as any).getTime() : 0;
      return bTime - aTime;
    });

  const latest = agentRunsSorted[0];
  if (!latest) return { text: isActive ? "Idle" : "Awaiting next task", progress: 0 };

  const status = latest.status;
  if (isError) {
    const errMsg = latest.error || latest.stderrExcerpt || "Connection timed out";
    return { text: errMsg.slice(0, 80), progress: 12 };
  }
  if (status === "running" || status === "queued") {
    const source = latest.invocationSource ?? "task";
    const detail = latest.triggerDetail;
    const snippet = detail
      ? `${source}: ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 60)}`
      : `Running ${source} task...`;
    return { text: snippet.slice(0, 80), progress: 65 };
  }
  if (status === "succeeded") {
    const excerpt = latest.stdoutExcerpt;
    return { text: excerpt ? excerpt.slice(0, 80) : "Last run succeeded", progress: 100 };
  }
  if (status === "failed") {
    const errMsg = latest.error || latest.stderrExcerpt || "Run failed";
    return { text: errMsg.slice(0, 80), progress: 12 };
  }
  return { text: isActive ? "Idle" : "Awaiting next task", progress: 0 };
}

function resolveAgentSlug(name: string): AgentSlug | null {
  const slug = name.toLowerCase().trim();
  if (slug in AGENT_REGISTRY) return slug as AgentSlug;
  return null;
}

/** Agent avatar URLs from the Stitch designs */

/** Status labels from Stitch designs */
function getStatusLabel(status: string): { label: string; color: string; bgColor: string } {
  switch (status) {
    case "running":
    case "active":
      return { label: "Active", color: "#D8B4FE", bgColor: "rgba(139, 92, 246, 0.1)" };
    case "idle":
      return { label: "Standby", color: "#93C5FD", bgColor: "rgba(59, 130, 246, 0.1)" };
    case "error":
      return { label: "Error", color: "#ffb4ab", bgColor: "rgba(255, 180, 171, 0.1)" };
    case "paused":
      return { label: "Offline", color: "#FBCFE8", bgColor: "rgba(236, 72, 153, 0.1)" };
    default:
      return { label: status, color: "var(--rc-on-surface-variant)", bgColor: "rgba(199, 196, 215, 0.1)" };
  }
}

function getGlowClass(slug: AgentSlug | null, status: string): string {
  if (status === "error" || status === "paused") return "";
  switch (slug) {
    case "dante": return "active-glow-purple";
    case "brent": return "active-glow-blue";
    case "rex": return "active-glow-green";
    case "scout": return "active-glow-orange";
    default: return "";
  }
}

export function AgentGrid() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

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
    const map = new Map<string, number>();
    for (const r of runs ?? []) {
      if ((r as any).status !== "running" && (r as any).status !== "queued") continue;
      map.set((r as any).agentId, (map.get((r as any).agentId) ?? 0) + 1);
    }
    return map;
  }, [runs]);

  // Real 8-week activity sparklines per agent
  const weeklyActivity = useMemo(() => buildWeeklyActivity(runs ?? []), [runs]);

  const sorted = useMemo(() => {
    return [...(agents ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  }, [agents]);

  const onlineCount = sorted.filter(
    (a) => a.status === "running" || a.status === "idle" || a.status === "active",
  ).length;

  return (
    <>
      {/* Header Section — pixel-perfect from Stitch */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-4xl font-light tracking-tight text-[--rc-on-surface] mb-1">Active Agents</h2>
          <div className="flex items-center gap-3 text-[--rc-on-surface-variant] text-[10px] uppercase tracking-[0.2em]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              {onlineCount} Systems Nominal
            </span>
            <span className="w-1 h-1 rounded-full bg-[#918fa0]/30" />
            <span className="tabular-nums">
              Last synced: {new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        </div>
        <button className="group flex items-center gap-2 px-5 py-2.5 bg-[--rc-surface-container-high] hover:bg-[--rc-surface-container-highest] border border-[--rc-outline-variant]/10 rounded-xl transition-all duration-300">
          <span
            className="material-symbols-outlined text-lg group-hover:rotate-180 transition-transform duration-500"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
          >
            refresh
          </span>
          <span className="text-[10px] uppercase tracking-widest">Manual Refresh</span>
        </button>
      </div>

      {/* Agent Grid — pixel-perfect card layout from Stitch */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sorted.map((agent) => {
          const slug = resolveAgentSlug(agent.name);
          const config = slug ? AGENT_REGISTRY[slug] : null;
          const accentColor = config?.color ?? "var(--rc-primary)";
          const accentLight = config?.colorLight ?? "var(--rc-on-surface-variant)";
          const avatarUrl = slug ? getAgentAvatar(agent.name) : null;
          const status = getStatusLabel(agent.status);
          const glowClass = getGlowClass(slug, agent.status);
          const liveCount = liveRunByAgent.get(agent.id) ?? 0;
          const isError = agent.status === "error";
          const isActive = agent.status === "running" || agent.status === "idle" || agent.status === "active";
          const taskSnippet = getTaskSnippet(runs ?? [], agent.id, isActive, isError);
          const taskProgress = taskSnippet.progress;
          const sparklineData = weeklyActivity.get(agent.id) ?? [0, 0, 0, 0, 0, 0, 0, 0];
          const sparklineMax = Math.max(...sparklineData, 1);

          return (
            <Link
              key={agent.id}
              to={agentUrl(agent)}
              className="no-underline text-inherit"
            >
              <div
                className={cn(
                  "glass-card group p-6 rounded-xl border border-[--rc-outline-variant]/10 transition-all duration-500 hover:scale-[1.02] relative overflow-hidden",
                  glowClass,
                )}
              >
                {/* Top gradient line */}
                <div
                  className="absolute top-0 left-0 w-full h-1 opacity-40"
                  style={{
                    background: isError
                      ? "#ffb4ab"
                      : `linear-gradient(to right, ${accentColor}, ${accentLight})`,
                  }}
                />

                {/* Avatar + Status */}
                <div className="flex justify-between items-start mb-6">
                  <div className="relative">
                    <div
                      className="w-16 h-16 rounded-full p-1 border-2"
                      style={{ borderColor: isError ? "#ffb4ab" : accentColor }}
                    >
                      {avatarUrl ? (
                        <img
                          alt={`${agent.name} Avatar`}
                          className="w-full h-full rounded-full bg-[--rc-surface-container-low]"
                          src={avatarUrl}
                        />
                      ) : (
                        <div
                          className="w-full h-full rounded-full flex items-center justify-center text-lg font-bold"
                          style={{ backgroundColor: "var(--rc-surface-container-low)", color: accentColor }}
                        >
                          {agent.name[0]}
                        </div>
                      )}
                    </div>
                    <span
                      className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[--rc-surface]"
                      style={{
                        backgroundColor: isError ? "#ffb4ab" : isActive ? "#10B981" : "#918fa0",
                      }}
                    />
                  </div>
                  <div className="flex flex-col items-end">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest mb-2"
                      style={{ backgroundColor: status.bgColor, color: status.color }}
                    >
                      {status.label}
                    </span>
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums border",
                        isError
                          ? "bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/30"
                          : "bg-[--rc-primary]/20 text-[--rc-primary] border-[--rc-primary]/30",
                      )}
                    >
                      {liveCount || (isError ? "!" : "0")}
                    </div>
                  </div>
                </div>

                {/* Name + Role */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-[--rc-on-surface]">{agent.name}</h3>
                  <p className="text-xs text-[--rc-on-surface-variant] uppercase tracking-widest opacity-70">
                    {agent.title || roleLabels[agent.role] || agent.role}
                  </p>
                </div>

                {/* Task Snippet */}
                <div className="space-y-4">
                  <div
                    className={cn(
                      "p-3 rounded-lg",
                      isError
                        ? "bg-[#93000a]/10 border border-[#ffb4ab]/20"
                        : "bg-[--rc-surface-container-lowest]/50",
                    )}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className={cn("text-[10px] uppercase", isError ? "text-[#ffb4ab]" : "text-[--rc-on-surface-variant]")}>
                        {isError ? "Critical Failure" : "Task Snippet"}
                      </span>
                      <span
                        className="text-[10px] tabular-nums font-medium"
                        style={{ color: isError ? "#ffb4ab" : "var(--rc-primary)" }}
                      >
                        {taskProgress}%
                      </span>
                    </div>
                    <p className={cn("text-xs mb-3 line-clamp-1", isError ? "text-[#ffb4ab]/80" : "text-[--rc-on-surface]/80")}>
                      {taskSnippet.text}
                    </p>
                    <div className={cn("h-1 w-full rounded-full overflow-hidden", isError ? "bg-[#ffb4ab]/20" : "bg-[#464554]/20")}>
                      <div
                        className="h-full"
                        style={{
                          width: `${taskProgress}%`,
                          background: isError
                            ? "#ffb4ab"
                            : `linear-gradient(to right, ${accentColor}, ${accentLight})`,
                        }}
                      />
                    </div>
                  </div>

                  {/* 8W Activity Sparkline — wired to real weekly run counts */}
                  <div>
                    <span className="text-[10px] uppercase text-[--rc-on-surface-variant] mb-2 block">8w Activity</span>
                    <div className="flex items-end gap-1 h-8">
                      {sparklineData.map((count, i) => {
                        const h = sparklineMax > 0 ? Math.max(4, (count / sparklineMax) * 100) : 4;
                        const isLast = i === 7;
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-t-sm transition-all duration-300"
                            style={{
                              height: `${h}%`,
                              backgroundColor: isError && i >= 6
                                ? `rgba(255, 180, 171, ${isLast ? 0.6 : 0.4})`
                                : `rgba(0,255,170, ${isLast ? 0.4 : 0.15 + (count > 0 ? 0.15 : 0)})`,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer Stats Banner — LIVE data */}
      <div className="mt-16 glass-card rounded-2xl p-4 md:p-8 border border-[--rc-outline-variant]/10 flex flex-wrap gap-4 md:gap-12 items-center justify-between">
        <div className="flex gap-4 md:gap-12 flex-wrap">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant] opacity-60 block mb-2">
              Total Agents
            </span>
            <div className="text-2xl font-light tabular-nums">
              {sorted.length}
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant] opacity-60 block mb-2">
              Online
            </span>
            <div className="text-2xl font-light tabular-nums">
              {onlineCount} <span className="text-sm text-emerald-400 opacity-70">active</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant] opacity-60 block mb-2">
              Error Rate
            </span>
            <div className="text-2xl font-light tabular-nums">
              {sorted.length > 0 ? Math.round((sorted.filter(a => a.status === "error").length / sorted.length) * 100) : 0} <span className="text-sm text-[--rc-on-surface-variant] opacity-70">%</span>
            </div>
          </div>
        </div>
        <button className="px-6 py-3 bg-[--rc-primary] text-[--rc-on-primary] font-semibold rounded-xl text-xs uppercase tracking-widest transition-transform hover:scale-105 active:scale-95">
          Deploy New Agent
        </button>
      </div>
    </>
  );
}
