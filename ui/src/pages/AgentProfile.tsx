/**
 * AgentProfile — pixel-perfect from Stitch agent_profile_desktop/code.html
 *
 * 3-column layout: Hero Profile | Performance + Terminal | History + CTA
 */
import { useEffect, useMemo } from "react";
import { useParams, Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "../api/agents";
import { heartbeatsApi } from "../api/heartbeats";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { cn, formatCents, relativeTime, agentUrl } from "../lib/utils";
import { AGENT_REGISTRY, type AgentSlug } from "../components/kinetic/AgentChip";
import { AGENT_ROLE_LABELS, type Agent } from "@paperclipai/shared";
import { getAgentAvatar } from "../components/kinetic/agent-avatars";

const roleLabels = AGENT_ROLE_LABELS as Record<string, string>;

function resolveSlug(name: string): AgentSlug | null {
  const s = name.toLowerCase().trim();
  return s in AGENT_REGISTRY ? (s as AgentSlug) : null;
}


export function AgentProfile() {
  const { agentId } = useParams<{ agentId: string }>();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  const { data: allAgents, isLoading } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const agent = useMemo(() => {
    if (!allAgents || !agentId) return null;
    return allAgents.find((a: any) =>
      a.id === agentId || a.urlKey === agentId ||
      a.name.toLowerCase().replace(/\s+/g, "-") === agentId.toLowerCase() ||
      a.name.toLowerCase() === agentId.toLowerCase()
    ) ?? null;
  }, [allAgents, agentId]) as Agent | null;

  const { data: runs } = useQuery({
    queryKey: queryKeys.heartbeats(selectedCompanyId!, agent?.id),
    queryFn: () => heartbeatsApi.list(selectedCompanyId!, agent?.id),
    enabled: !!selectedCompanyId && !!agent?.id,
    refetchInterval: 10_000,
  });

  const agentData = agent as any;
  const name = agentData?.name ?? "Agent";
  const slug = resolveSlug(name);
  const config = slug ? AGENT_REGISTRY[slug] : null;
  const accentColor = config?.color ?? "#c2c1ff";
  const accentLight = config?.colorLight ?? "#c7c4d7";
  const avatarUrl = getAgentAvatar(name);
  const totalCost = agentData?.totalSpendCents ? formatCents(agentData.totalSpendCents) : "$0.42";
  const totalRuns = (runs ?? []).length;
  const recentRuns = useMemo(() => (runs ?? []).filter((r: any) => r.status === "completed" || r.status === "failed").slice(0, 3), [runs]);

  useEffect(() => {
    if (agentData) setBreadcrumbs([{ label: "Agents", href: "/agents/grid" }, { label: agentData.name }]);
  }, [agentData, setBreadcrumbs]);

  if (isLoading) return <div className="animate-pulse h-96 glass-card rounded-xl" />;
  if (!agentData) return <p className="text-[--rc-on-surface-variant]">Agent not found</p>;

  return (
    <div className="-m-8 flex gap-0 h-[calc(100vh-4rem)]">
      {/* Left Column: Hero Profile — from Stitch */}
      <section className="w-[380px] h-full border-r border-[--rc-outline-variant]/10 flex flex-col p-8 overflow-y-auto shrink-0">
        {/* Avatar with status ring */}
        <div className="relative group mb-10">
          <div className="w-48 h-48 mx-auto relative">
            <div className="absolute inset-0 rounded-full border-[3px] animate-pulse" style={{ borderColor: `${accentColor}15` }} />
            <div className="absolute inset-2 rounded-full border" style={{ borderColor: `${accentColor}30` }} />
            <div className="absolute -inset-1 rounded-full opacity-40 blur-sm" style={{ background: `linear-gradient(to top right, ${accentColor}, transparent, ${accentLight})` }} />
            {avatarUrl ? (
              <img className="w-full h-full object-cover rounded-full grayscale hover:grayscale-0 transition-all duration-700 p-4 relative z-10" src={avatarUrl} alt={name} />
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center p-4 relative z-10 bg-[--rc-surface-container-low] text-4xl font-light" style={{ color: accentColor }}>{name[0]}</div>
            )}
            <div className="absolute bottom-4 right-4 w-5 h-5 rounded-full border-4 border-[#111319] z-20 shadow-[0_0_15px_rgba(139,92,246,0.6)]" style={{ background: `linear-gradient(to top right, ${accentColor}, ${accentLight})` }} />
          </div>
        </div>

        <div className="space-y-6">
          {/* Name + Role */}
          <div className="text-center">
            <h1 className="text-4xl font-extralight tracking-tighter text-[--rc-on-surface] uppercase mb-1">{name}</h1>
            <div className="inline-flex items-center px-3 py-1 rounded-full border" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}20` }}>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: accentLight }}>{agentData.title || roleLabels[agentData.role] || agentData.role}</span>
            </div>
          </div>

          {/* Personality */}
          <div className="space-y-4">
            <h3 className="text-[--rc-on-surface-variant] uppercase tracking-widest text-[10px] font-bold opacity-60">Personality Profile</h3>
            <p className="text-sm leading-relaxed text-[--rc-on-surface-variant] font-light">
              Analytical yet expressive. Specialized in trend forecasting and strategic operations for complex multi-agent workflows.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="bg-[--rc-surface-container-low] px-3 py-2 rounded-lg">
                <p className="text-[9px] uppercase tracking-wider text-[--rc-outline] mb-1">Adapter</p>
                <p className="text-xs font-medium">{agentData.adapterType}</p>
              </div>
              <div className="bg-[--rc-surface-container-low] px-3 py-2 rounded-lg">
                <p className="text-[9px] uppercase tracking-wider text-[--rc-outline] mb-1">Status</p>
                <p className="text-xs font-medium capitalize">{agentData.status}</p>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="pt-8 space-y-4">
            <h3 className="text-[--rc-on-surface-variant] uppercase tracking-widest text-[10px] font-bold opacity-60">Neural Core Skills</h3>
            <div className="flex flex-wrap gap-2">
              {(agentData.title || name).split(/[,&\-]/).map((s: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-[--rc-surface-container-high] rounded-full text-[10px] font-medium border border-[--rc-outline-variant]/30">{s.trim()}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Middle Column: Performance + Terminal — from Stitch */}
      <section className="flex-1 bg-[--rc-surface-container-lowest]/30 flex flex-col min-w-0">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-0 border-b border-[--rc-outline-variant]/10">
          <div className="p-8 border-r border-[--rc-outline-variant]/10">
            <p className="text-[--rc-on-surface-variant] uppercase tracking-widest text-[10px] font-bold mb-2">Tasks Orchestrated</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extralight tracking-tight tabular-nums">{totalRuns.toLocaleString()}</span>
              <span className="text-[10px] text-[--rc-primary]">+12.4%</span>
            </div>
          </div>
          <div className="p-8 border-r border-[--rc-outline-variant]/10">
            <p className="text-[--rc-on-surface-variant] uppercase tracking-widest text-[10px] font-bold mb-2">Cost Optimization</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extralight tracking-tight tabular-nums">{totalCost}</span>
              <span className="text-[10px] text-[--rc-outline]">total</span>
            </div>
          </div>
          <div className="p-8">
            <p className="text-[--rc-on-surface-variant] uppercase tracking-widest text-[10px] font-bold mb-2">Status</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extralight tracking-tight capitalize">{agentData.status}</span>
            </div>
          </div>
        </div>

        {/* Terminal — from Stitch */}
        <div className="flex-1 flex flex-col p-8 gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[--rc-primary] text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>terminal</span>
              <h2 className="uppercase tracking-[0.2em] text-[11px] font-bold">Live Neural Stream</h2>
            </div>
            <div className="flex gap-2 items-center">
              <div className="w-2 h-2 rounded-full bg-[#ffb4ab] animate-pulse" />
              <span className="text-[9px] uppercase tracking-widest text-[--rc-outline]">Live Execution</span>
            </div>
          </div>
          <div className="flex-1 bg-[--rc-surface-container-lowest] border border-[--rc-outline-variant]/10 rounded-xl p-6 font-mono text-[11px] leading-relaxed overflow-y-auto no-scrollbar shadow-inner">
            <p className="text-[--rc-on-surface-variant]/40 mb-1">[{new Date().toLocaleTimeString("en-US", { hour12: false })}] Agent {name} - Status: {agentData.status}</p>
            <p className="text-[--rc-on-surface-variant]/40 mb-1">Adapter: {agentData.adapterType} | Model: {agentData.model || "default"}</p>
            <p className="text-[--rc-on-surface-variant]/40 mb-1">Total runs: {totalRuns} | Last active: {agentData.lastHeartbeatAt ? new Date(agentData.lastHeartbeatAt).toLocaleString() : "never"}</p>
            {recentRuns.length > 0 && recentRuns.slice(0, 3).map((run: any) => (
              <p key={run.id} className={run.status === "completed" ? "text-emerald-400/70 mb-1" : "text-[#ffb4ab]/70 mb-1"}>
                [{new Date(run.completedAt || run.createdAt).toLocaleTimeString("en-US", { hour12: false })}] Run {run.id.slice(0, 8)} — {run.status}
              </p>
            ))}
            <p className="text-[--rc-on-surface-variant]/30 mb-1">Awaiting next directive...</p>
            <div className="flex items-center gap-2 animate-pulse mt-2" style={{ color: accentColor }}>
              <span>_</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Column: History + CTA — from Stitch */}
      <section className="w-[340px] h-full border-l border-[--rc-outline-variant]/10 flex flex-col bg-[--rc-surface-container-lowest]/50 shrink-0">
        <div className="p-8 flex-1 overflow-y-auto no-scrollbar">
          <h3 className="text-[--rc-on-surface-variant] uppercase tracking-widest text-[10px] font-bold opacity-60 mb-6">Recent Completions</h3>
          <div className="space-y-4">
            {recentRuns.length > 0 ? recentRuns.map((run: any) => (
              <div key={run.id} className="group bg-[--rc-surface-container-low]/50 hover:bg-[--rc-surface-container-high] transition-all p-4 rounded-xl border border-[--rc-outline-variant]/10 hover:border-[#c2c1ff]/20">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[--rc-primary]">{run.status === "completed" ? "Deployment" : "Error"}</span>
                  <span className="text-[9px] tabular-nums text-[--rc-outline]">{relativeTime(run.completedAt || run.createdAt)}</span>
                </div>
                <p className="text-xs font-medium mb-1">Run {run.id.slice(0, 8)}</p>
                <p className="text-[11px] text-[--rc-on-surface-variant] leading-tight mb-3">Task execution {run.status}</p>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[--rc-primary]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}>
                    {run.status === "completed" ? "check_circle" : "cancel"}
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[--rc-outline]">{run.status}</span>
                </div>
              </div>
            )) : (
              <p className="text-xs text-[--rc-on-surface-variant]/40">No recent completions</p>
            )}
          </div>

          {/* System Insight */}
          <div className="mt-10 pt-8 border-t border-[--rc-outline-variant]/10">
            <div className="p-6 rounded-2xl border" style={{ background: `linear-gradient(to bottom right, ${accentColor}20, transparent)`, borderColor: `${accentColor}30` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: accentLight }}>System Insight</p>
              <p className="text-xs text-[--rc-on-surface] italic leading-relaxed">
                "{name}'s efficiency is currently at peak levels. Consider delegating high-variance tasks to maximize output."
              </p>
            </div>
          </div>
        </div>

        {/* Chat CTA — from Stitch */}
        <div className="p-8 bg-[--rc-surface-container-low]/30 backdrop-blur-md">
          <Link
            to="/chat"
            className="no-underline w-full bg-[--rc-primary] hover:bg-[#e2dfff] text-[--rc-on-primary] font-bold py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3 group shadow-[0_20px_40px_-12px_rgba(194,193,255,0.2)]"
          >
            <span className="material-symbols-outlined group-hover:rotate-12 transition-transform" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chat_bubble</span>
            <span className="uppercase tracking-widest text-xs">Chat with {name}</span>
          </Link>
        </div>
      </section>

      {/* Background glows — from Stitch */}
      <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: `${accentColor}10` }} />
      <div className="fixed bottom-0 left-64 -z-10 w-[400px] h-[400px] bg-[#3B82F6]/5 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2" />
    </div>
  );
}
