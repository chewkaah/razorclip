/**
 * Home / Command Center — ALL LIVE DATA, no placeholders
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { agentsApi } from "../api/agents";
import { activityApi } from "../api/activity";
import { queryKeys } from "../lib/queryKeys";
import { relativeTime, agentUrl } from "../lib/utils";
import { AGENT_REGISTRY, type AgentSlug } from "../components/kinetic/AgentChip";
import { useUserProfile } from "../hooks/useUserProfile";
import { biApi } from "../api/bi";
import type { Agent, ActivityEvent } from "@paperclipai/shared";
import { getAgentAvatar } from "../components/kinetic/agent-avatars";
import { Link } from "@/lib/router";


const agentAvatarList: { slug: AgentSlug; gradient: string }[] = [
  { slug: "dante", gradient: "from-[#8B5CF6] to-[#D8B4FE]" },
  { slug: "brent", gradient: "from-[#3B82F6] to-[#93C5FD]" },
  { slug: "rex", gradient: "from-[#10B981] to-[#6EE7B7]" },
  { slug: "scout", gradient: "from-[#F59E0B] to-[#FCD34D]" },
  { slug: "nova", gradient: "from-[#EC4899] to-[#FBCFE8]" },
  { slug: "victor", gradient: "from-[#EAB308] to-[#FEF08A]" },
];

function resolveSlug(name: string): AgentSlug | null {
  const s = name.toLowerCase().trim();
  return s in AGENT_REGISTRY ? (s as AgentSlug) : null;
}

export function Home() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { displayName: userName } = useUserProfile();

  const [pulsePeriod, setPulsePeriod] = useState<"D" | "W" | "M" | "Q">("M");
  useEffect(() => { setBreadcrumbs([{ label: "Command Center" }]); }, [setBreadcrumbs]);

  // Real BI pulse
  const { data: pulse } = useQuery({
    queryKey: ["bi-pulse", selectedCompanyId],
    queryFn: () => biApi.pulse(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    staleTime: 60_000,
  });

  // Real agents
  const { data: agentList } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  // Real activity feed
  const { data: activityData } = useQuery({
    queryKey: queryKeys.activity(selectedCompanyId!),
    queryFn: () => activityApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 15_000,
  });

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agentList ?? []) m.set(a.id, a);
    return m;
  }, [agentList]);

  const onlineCount = (agentList ?? []).filter((a: Agent) => a.status === "running" || a.status === "idle" || a.status === "active").length;

  // Build activity feed from real events
  const activityFeed = useMemo(() => {
    if (!activityData) return [];
    return (activityData as ActivityEvent[]).slice(0, 10).map((event) => {
      const agent = event.agentId ? agentMap.get(event.agentId) : null;
      const slug = agent ? resolveSlug(agent.name) : null;
      const config = slug ? AGENT_REGISTRY[slug] : null;
      const actionLabel = event.action.replace(/\./g, " ").replace(/^(issue|agent|approval) /, "");
      return {
        id: event.id,
        agentName: agent?.name ?? "System",
        color: config?.color ?? "var(--rc-on-surface-variant)",
        text: (event as any).metadata?.description || (event as any).metadata?.commentBody || actionLabel,
        time: relativeTime(event.createdAt),
        tag: event.action.includes("completed") ? "SUCCESS" : "",
        avatarUrl: slug ? getAgentAvatar(slug) : null,
      };
    });
  }, [activityData, agentMap]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Morning";
    if (h < 17) return "Afternoon";
    return "Evening";
  })();

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Greeting — dynamic from user profile */}
      <section className="mt-4">
        <h1 className="text-3xl font-light tracking-tight text-[--rc-on-surface]">
          {greeting}, <span className="font-bold text-[--rc-primary]">{userName}</span>
        </h1>
        <p className="text-[--rc-on-surface-variant] text-sm mt-1 tracking-wide uppercase">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} • Command Center
        </p>
      </section>

      {/* Business Pulse — LIVE from BI API */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-[--rc-on-surface-variant]">Business Pulse</h2>
          <div className="flex items-center gap-1 bg-[--rc-surface-container] rounded-lg p-0.5">
            {(["D", "W", "M", "Q"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPulsePeriod(p)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                  pulsePeriod === p
                    ? "bg-[--rc-primary] text-[--rc-on-primary] shadow-sm"
                    : "text-[--rc-on-surface-variant] hover:text-[--rc-on-surface]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col justify-between h-24 relative overflow-hidden">
            <div className="absolute -right-2 -top-2 w-12 h-12 bg-emerald-500/10 blur-2xl rounded-full" />
            <span className="text-[10px] font-medium text-[--rc-on-surface-variant] uppercase tracking-wider">Active Clients</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums">{pulse?.activeClients ?? "—"}</span>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col justify-between h-24 relative overflow-hidden">
            <div className="absolute -right-2 -top-2 w-12 h-12 bg-emerald-500/10 blur-2xl rounded-full" />
            <span className="text-[10px] font-medium text-[--rc-on-surface-variant] uppercase tracking-wider">{pulsePeriod === "D" ? "Daily" : pulsePeriod === "W" ? "Weekly" : pulsePeriod === "Q" ? "Quarterly" : "Monthly"} Revenue</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums">{pulse?.weeklyRevenue ? `$${Math.round(pulse.weeklyRevenue / 1000)}k` : "—"}</span>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col justify-between h-24 relative overflow-hidden">
            <div className="absolute -right-2 -top-2 w-12 h-12 bg-amber-500/10 blur-2xl rounded-full" />
            <span className="text-[10px] font-medium text-[--rc-on-surface-variant] uppercase tracking-wider">{pulsePeriod === "D" ? "Daily" : pulsePeriod === "W" ? "Weekly" : pulsePeriod === "Q" ? "Quarterly" : "Monthly"} Burn</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums">{pulse?.weeklyBurn ? `$${(pulse.weeklyBurn / 1000).toFixed(1)}k` : "—"}</span>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col justify-between h-24 relative overflow-hidden">
            <div className="absolute -right-2 -top-2 w-12 h-12 bg-[--rc-primary]/10 blur-2xl rounded-full" />
            <span className="text-[10px] font-medium text-[--rc-on-surface-variant] uppercase tracking-wider">Net Margin</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums">{pulse?.netMargin ? `${pulse.netMargin}%` : "—"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Agents — LIVE from agents API, clickable with status */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-[--rc-on-surface-variant]">Active Agents</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-500">{onlineCount} ONLINE</span>
          </div>
        </div>
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
          {agentAvatarList.map(({ slug, gradient }) => {
            const config = AGENT_REGISTRY[slug];
            const agent = agentList?.find((a: Agent) => a.name.toLowerCase() === slug);
            const status = agent?.status ?? "unknown";
            const statusColor = status === "idle" ? "#10B981" : status === "running" ? "#3B82F6" : status === "error" ? "#EF4444" : status === "paused" ? "#F59E0B" : "#6B7280";
            const statusLabel = status === "idle" ? "Online" : status === "running" ? "Running" : status === "error" ? "Error" : status === "paused" ? "Paused" : "Offline";
            return (
              <Link key={slug} to={agent ? agentUrl(agent) + "/profile" : `agents/grid`} className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer">
                <div className={`relative p-1 rounded-full bg-gradient-to-br ${gradient} group-hover:scale-105 transition-transform duration-200`}>
                  <div className="bg-[--rc-surface] rounded-full p-0.5">
                    <div className="w-14 h-14 rounded-full overflow-hidden">
                      <img className="w-full h-full object-cover" src={getAgentAvatar(slug) ?? undefined} alt={config.label} />
                    </div>
                  </div>
                  {/* Status dot */}
                  <span
                    className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[--rc-surface]"
                    style={{ backgroundColor: statusColor }}
                    title={statusLabel}
                  />
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase group-hover:opacity-80 transition-opacity" style={{ color: config.color }}>
                  {config.label}
                </span>
                <span className="text-[8px] uppercase tracking-wider font-medium -mt-1" style={{ color: statusColor }}>
                  {statusLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Live Activity Feed — REAL from activity API */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-[--rc-on-surface-variant]">Live Activity</h2>
          <span className="material-symbols-outlined text-[--rc-primary] text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>reorder</span>
        </div>
        <div className="space-y-3">
          {activityFeed.length > 0 ? activityFeed.map((item) => (
            <div key={item.id} className="glass-card rounded-2xl p-4 border border-white/5 flex items-start gap-4 transition-all hover:bg-white/10">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border overflow-hidden"
                style={{ backgroundColor: `${item.color}20`, borderColor: `${item.color}30` }}
              >
                {item.avatarUrl ? (
                  <img className="w-full h-full object-cover" src={item.avatarUrl} alt={item.agentName} />
                ) : (
                  <span className="text-xs font-bold" style={{ color: item.color }}>{item.agentName[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-[13px] text-[--rc-on-surface] leading-snug">
                    <span className="font-bold" style={{ color: item.color }}>{item.agentName}:</span>{" "}
                    {item.text}
                  </p>
                  <span className="text-[10px] text-[--rc-on-surface-variant] font-medium tabular-nums ml-2">{item.time}</span>
                </div>
                {item.tag && (
                  <div className="mt-2 flex gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                      {item.tag}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="glass-card rounded-2xl p-6 border border-white/5 text-center">
              <p className="text-sm text-[--rc-on-surface-variant]/50">No recent activity</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
