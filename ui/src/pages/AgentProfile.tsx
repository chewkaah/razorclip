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

const roleLabels = AGENT_ROLE_LABELS as Record<string, string>;

function resolveSlug(name: string): AgentSlug | null {
  const s = name.toLowerCase().trim();
  return s in AGENT_REGISTRY ? (s as AgentSlug) : null;
}

const PROFILE_AVATARS: Record<string, string> = {
  dante: "https://lh3.googleusercontent.com/aida-public/AB6AXuC6RhnqdeMdr3US0jHlsCJLZHpSPb8e5GIHC6Dg2TV0xKHg91x0dZ5S25YaTxRhBoUXzpiS8I0KC55tcfSaVRk3vG7pcAhE741ztCuHuRaGd_-QMxbRzffy5uihTSTcwturS7Ug0hFXBd1c686tLXa07gKquULnnXZc2K8hv96dz5AibPG0tV9z0lpQYEUav9wzW_Lhc4Ib554azHx8ZoNDcD5Jm7-ow5CvmI3rwbRXr5oawf9G0CimcUoIq04cAwZ4SBcUJ04Sbtc",
};

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
  const avatarUrl = slug ? PROFILE_AVATARS[slug] : null;
  const totalCost = agentData?.totalSpendCents ? formatCents(agentData.totalSpendCents) : "$0.42";
  const totalRuns = (runs ?? []).length;
  const recentRuns = useMemo(() => (runs ?? []).filter((r: any) => r.status === "completed" || r.status === "failed").slice(0, 3), [runs]);

  useEffect(() => {
    if (agentData) setBreadcrumbs([{ label: "Agents", href: "/agents/grid" }, { label: agentData.name }]);
  }, [agentData, setBreadcrumbs]);

  if (isLoading) return <div className="animate-pulse h-96 glass-card rounded-xl" />;
  if (!agentData) return <p className="text-[#c7c4d7]">Agent not found</p>;

  return (
    <div className="-m-8 flex gap-0 h-[calc(100vh-4rem)]">
      {/* Left Column: Hero Profile — from Stitch */}
      <section className="w-[380px] h-full border-r border-[#464554]/10 flex flex-col p-8 overflow-y-auto shrink-0">
        {/* Avatar with status ring */}
        <div className="relative group mb-10">
          <div className="w-48 h-48 mx-auto relative">
            <div className="absolute inset-0 rounded-full border-[3px] animate-pulse" style={{ borderColor: `${accentColor}15` }} />
            <div className="absolute inset-2 rounded-full border" style={{ borderColor: `${accentColor}30` }} />
            <div className="absolute -inset-1 rounded-full opacity-40 blur-sm" style={{ background: `linear-gradient(to top right, ${accentColor}, transparent, ${accentLight})` }} />
            {avatarUrl ? (
              <img className="w-full h-full object-cover rounded-full grayscale hover:grayscale-0 transition-all duration-700 p-4 relative z-10" src={avatarUrl} alt={name} />
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center p-4 relative z-10 bg-[#191b22] text-4xl font-light" style={{ color: accentColor }}>{name[0]}</div>
            )}
            <div className="absolute bottom-4 right-4 w-5 h-5 rounded-full border-4 border-[#111319] z-20 shadow-[0_0_15px_rgba(139,92,246,0.6)]" style={{ background: `linear-gradient(to top right, ${accentColor}, ${accentLight})` }} />
          </div>
        </div>

        <div className="space-y-6">
          {/* Name + Role */}
          <div className="text-center">
            <h1 className="text-4xl font-extralight tracking-tighter text-[#e2e2eb] uppercase mb-1">{name}</h1>
            <div className="inline-flex items-center px-3 py-1 rounded-full border" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}20` }}>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: accentLight }}>{agentData.title || roleLabels[agentData.role] || agentData.role}</span>
            </div>
          </div>

          {/* Personality */}
          <div className="space-y-4">
            <h3 className="text-[#c7c4d7] uppercase tracking-widest text-[10px] font-bold opacity-60">Personality Profile</h3>
            <p className="text-sm leading-relaxed text-[#c7c4d7] font-light">
              Analytical yet expressive. Specialized in trend forecasting and strategic operations for complex multi-agent workflows.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="bg-[#191b22] px-3 py-2 rounded-lg">
                <p className="text-[9px] uppercase tracking-wider text-[#918fa0] mb-1">Adapter</p>
                <p className="text-xs font-medium">{agentData.adapterType}</p>
              </div>
              <div className="bg-[#191b22] px-3 py-2 rounded-lg">
                <p className="text-[9px] uppercase tracking-wider text-[#918fa0] mb-1">Status</p>
                <p className="text-xs font-medium capitalize">{agentData.status}</p>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="pt-8 space-y-4">
            <h3 className="text-[#c7c4d7] uppercase tracking-widest text-[10px] font-bold opacity-60">Neural Core Skills</h3>
            <div className="flex flex-wrap gap-2">
              {(agentData.title || name).split(/[,&\-]/).map((s: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-[#282a30] rounded-full text-[10px] font-medium border border-[#464554]/30">{s.trim()}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Middle Column: Performance + Terminal — from Stitch */}
      <section className="flex-1 bg-[#0c0e14]/30 flex flex-col min-w-0">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-0 border-b border-[#464554]/10">
          <div className="p-8 border-r border-[#464554]/10">
            <p className="text-[#c7c4d7] uppercase tracking-widest text-[10px] font-bold mb-2">Tasks Orchestrated</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extralight tracking-tight tabular-nums">{totalRuns.toLocaleString()}</span>
              <span className="text-[10px] text-[#c2c1ff]">+12.4%</span>
            </div>
          </div>
          <div className="p-8 border-r border-[#464554]/10">
            <p className="text-[#c7c4d7] uppercase tracking-widest text-[10px] font-bold mb-2">Cost Optimization</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extralight tracking-tight tabular-nums">{totalCost}</span>
              <span className="text-[10px] text-[#918fa0]">total</span>
            </div>
          </div>
          <div className="p-8">
            <p className="text-[#c7c4d7] uppercase tracking-widest text-[10px] font-bold mb-2">Revenue Attribution</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extralight tracking-tight tabular-nums">$1.2M</span>
              <span className="text-[10px] text-[#c2c1ff]">ROI 314%</span>
            </div>
          </div>
        </div>

        {/* Terminal — from Stitch */}
        <div className="flex-1 flex flex-col p-8 gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#c2c1ff] text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>terminal</span>
              <h2 className="uppercase tracking-[0.2em] text-[11px] font-bold">Live Neural Stream</h2>
            </div>
            <div className="flex gap-2 items-center">
              <div className="w-2 h-2 rounded-full bg-[#ffb4ab] animate-pulse" />
              <span className="text-[9px] uppercase tracking-widest text-[#918fa0]">Live Execution</span>
            </div>
          </div>
          <div className="flex-1 bg-[#0c0e14] border border-[#464554]/10 rounded-xl p-6 font-mono text-[11px] leading-relaxed overflow-y-auto no-scrollbar shadow-inner">
            <p className="mb-1" style={{ color: accentColor }}>[SYSTEM]: Initializing {name}.Core.v4.2.1...</p>
            <p className="text-[#c7c4d7]/40 mb-1">09:41:22 - Connecting to API services...</p>
            <p className="text-[#c7c4d7]/40 mb-1">09:41:23 - Authenticated. Node-ID: {name.toUpperCase()}_01</p>
            <p className="text-[#c2c1ff] mb-1">09:41:25 - Analyzing current task queue...</p>
            <p className="text-[#c2c1ff] mb-1">09:41:28 - Processing active workload</p>
            <p className="text-[#c7c4d7]/40 mb-1">09:41:32 - Fetching latest data...</p>
            <p className="mb-1" style={{ color: accentColor }}>09:41:35 - Optimization complete</p>
            <p className="text-[#eac400] mb-1">09:42:01 - WARNING: Threshold check triggered</p>
            <p className="text-[#c2c1ff] mb-1">09:42:03 - Adjusting parameters</p>
            <p className="text-[#c7c4d7]/40 mb-1">09:42:08 - Re-streaming buffer...</p>
            <p className="text-[#c7c4d7]/40 mb-1">09:42:15 - Sync pulse sent to [Victor_Agent_Primary]</p>
            <p className="text-[#c2c1ff]/80 mb-1">09:42:44 - SUCCESS: Alignment verified. 98.4% match.</p>
            <p className="text-[#c7c4d7]/40 mb-1">09:43:01 - Awaiting next directive...</p>
            <div className="flex items-center gap-2 animate-pulse mt-2" style={{ color: accentColor }}>
              <span>_</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Column: History + CTA — from Stitch */}
      <section className="w-[340px] h-full border-l border-[#464554]/10 flex flex-col bg-[#0c0e14]/50 shrink-0">
        <div className="p-8 flex-1 overflow-y-auto no-scrollbar">
          <h3 className="text-[#c7c4d7] uppercase tracking-widest text-[10px] font-bold opacity-60 mb-6">Recent Completions</h3>
          <div className="space-y-4">
            {recentRuns.length > 0 ? recentRuns.map((run: any) => (
              <div key={run.id} className="group bg-[#191b22]/50 hover:bg-[#282a30] transition-all p-4 rounded-xl border border-[#464554]/10 hover:border-[#c2c1ff]/20">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff]">{run.status === "completed" ? "Deployment" : "Error"}</span>
                  <span className="text-[9px] tabular-nums text-[#918fa0]">{relativeTime(run.completedAt || run.createdAt)}</span>
                </div>
                <p className="text-xs font-medium mb-1">Run {run.id.slice(0, 8)}</p>
                <p className="text-[11px] text-[#c7c4d7] leading-tight mb-3">Task execution {run.status}</p>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#c2c1ff]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}>
                    {run.status === "completed" ? "check_circle" : "cancel"}
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#918fa0]">{run.status}</span>
                </div>
              </div>
            )) : (
              <p className="text-xs text-[#c7c4d7]/40">No recent completions</p>
            )}
          </div>

          {/* System Insight */}
          <div className="mt-10 pt-8 border-t border-[#464554]/10">
            <div className="p-6 rounded-2xl border" style={{ background: `linear-gradient(to bottom right, ${accentColor}20, transparent)`, borderColor: `${accentColor}30` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: accentLight }}>System Insight</p>
              <p className="text-xs text-[#e2e2eb] italic leading-relaxed">
                "{name}'s efficiency is currently at peak levels. Consider delegating high-variance tasks to maximize output."
              </p>
            </div>
          </div>
        </div>

        {/* Chat CTA — from Stitch */}
        <div className="p-8 bg-[#191b22]/30 backdrop-blur-md">
          <Link
            to="/chat"
            className="no-underline w-full bg-[#c2c1ff] hover:bg-[#e2dfff] text-[#1800a7] font-bold py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3 group shadow-[0_20px_40px_-12px_rgba(194,193,255,0.2)]"
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
