import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { agentsApi } from "../api/agents";
import { queryKeys } from "../lib/queryKeys";
import {
  GlassCard,
  MetricPill,
  AgentAvatar,
  SectionHeader,
  type AgentSlug,
} from "../components/kinetic";
import { cn } from "../lib/utils";

// Map agent names to slugs (will be dynamic once agent_persona table exists)
function agentSlug(name: string): AgentSlug | null {
  const map: Record<string, AgentSlug> = {
    dante: "dante", brent: "brent", rex: "rex",
    scout: "scout", nova: "nova", victor: "victor",
  };
  return map[name.toLowerCase()] ?? null;
}

export function Home() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Command Center" }]);
  }, [setBreadcrumbs]);

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Morning";
    if (h < 17) return "Afternoon";
    return "Evening";
  })();

  const activeAgents = agents?.filter((a: any) => a.status === "running" || a.status === "idle") ?? [];

  return (
    <div className="kt-page min-h-full pb-4 space-y-6 max-w-2xl mx-auto">
      {/* Hero Greeting */}
      <section>
        <h1 className="text-3xl font-light tracking-tight text-kt-on-surface">
          {greeting}, <span className="font-bold text-kt-primary">Chuka</span>
        </h1>
        <p className="text-kt-on-surface-variant text-sm mt-1 font-medium tracking-wide uppercase">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} • Command Center
        </p>
      </section>

      {/* Business Pulse Strip */}
      <section className="space-y-4">
        <SectionHeader
          title="Business Pulse"
          trailing={
            <span className="text-[10px] text-kt-primary/60 font-medium tabular-nums uppercase">
              Real-time • Weekly
            </span>
          }
        />
        <div className="grid grid-cols-2 gap-3">
          <MetricPill label="Active Clients" value="—" trend={null} trendLabel="" />
          <MetricPill label="Weekly Revenue" value="—" trend={null} trendLabel="" />
          <MetricPill label="Weekly Burn" value="—" trend="stable" trendLabel="—" />
          <MetricPill label="Net Margin" value="—" trend={null} trendLabel="" />
        </div>
        <p className="text-[10px] text-kt-on-surface-variant/50 text-center">
          Connect Stripe or Mercury in Connections to see live data
        </p>
      </section>

      {/* Agent Avatars Row */}
      <section className="space-y-4">
        <SectionHeader
          title="Agents"
          trailing={
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-500">
                {activeAgents.length} ONLINE
              </span>
            </div>
          }
        />
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
          {(["dante", "brent", "rex", "scout", "nova", "victor"] as AgentSlug[]).map((slug) => (
            <AgentAvatar key={slug} agent={slug} size="md" showLabel />
          ))}
        </div>
      </section>

      {/* Live Activity Feed */}
      <section className="space-y-4">
        <SectionHeader title="Live Activity" />
        <div className="space-y-3">
          <GlassCard className="p-4">
            <p className="text-sm text-kt-on-surface-variant text-center py-6">
              Activity feed will populate as agents run tasks
            </p>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
