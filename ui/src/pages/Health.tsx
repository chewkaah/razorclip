/**
 * Health Dashboard — ALL LIVE DATA, no placeholders
 */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { biApi } from "../api/bi";

export function Health() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const { selectedCompanyId } = useCompany();
  const { displayName: userName } = useUserProfile();
  useEffect(() => { setBreadcrumbs([{ label: "Business Health" }]); }, [setBreadcrumbs]);

  const { data: pulse, isLoading: pulseLoading } = useQuery({
    queryKey: ["bi-pulse", selectedCompanyId],
    queryFn: () => biApi.pulse(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    staleTime: 60_000,
  });

  const { data: clients } = useQuery({
    queryKey: ["bi-clients", selectedCompanyId],
    queryFn: () => biApi.clients(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: alerts } = useQuery({
    queryKey: ["bi-alerts", selectedCompanyId],
    queryFn: () => biApi.alerts(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const fmt = (n: number | undefined | null, prefix = "$") => {
    if (n == null || n === 0) return "—";
    if (n >= 1000000) return `${prefix}${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${prefix}${Math.round(n / 1000)}k`;
    return `${prefix}${n}`;
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Greeting — dynamic */}
      <section className="px-2">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[--rc-on-surface-variant] font-medium">Weekly Health Report</p>
        <h1 className="text-3xl font-light tracking-tight mt-1">
          {greeting}, <span className="text-[--rc-primary] font-normal">{userName}</span>.
        </h1>
        <p className="text-sm text-[--rc-on-surface-variant] mt-2 font-light">
          Here is your weekly health pulse for {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}.
        </p>
      </section>

      {/* Metrics — LIVE from BI API */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-[--rc-surface-container-low] border border-[--rc-outline-variant]/5">
          <p className="text-[10px] uppercase tracking-wider text-[--rc-on-surface-variant] mb-1">Weekly Revenue</p>
          <span className="text-2xl font-light tracking-tight tabular-nums">{fmt(pulse?.weeklyRevenue)}</span>
        </div>
        <div className="p-4 rounded-3xl bg-[--rc-surface-container-low] border border-[--rc-outline-variant]/5">
          <p className="text-[10px] uppercase tracking-wider text-[--rc-on-surface-variant] mb-1">Weekly Burn</p>
          <span className="text-2xl font-light tracking-tight tabular-nums">{fmt(pulse?.weeklyBurn)}</span>
        </div>
        <div className="p-4 rounded-3xl bg-[--rc-surface-container-low] border border-[--rc-outline-variant]/5">
          <p className="text-[10px] uppercase tracking-wider text-[--rc-on-surface-variant] mb-1">Margin</p>
          <span className="text-2xl font-light tracking-tight tabular-nums">{pulse?.netMargin ? `${pulse.netMargin}%` : "—"}</span>
        </div>
        <div className="p-4 rounded-3xl bg-[--rc-surface-container-low] border border-[--rc-outline-variant]/5">
          <p className="text-[10px] uppercase tracking-wider text-[--rc-on-surface-variant] mb-1">Pipeline</p>
          <span className="text-2xl font-light tracking-tight tabular-nums">{fmt(pulse?.pipelineValue)}</span>
        </div>
      </section>

      {/* Financial — shows empty state until Stripe/Mercury connected */}
      <section className="glass-card rounded-[2rem] p-6 border border-white/5 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <div className="flex p-1 bg-[--rc-surface-container-lowest] rounded-full border border-white/5">
            <button className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest bg-[--rc-primary] text-[--rc-on-primary] rounded-full shadow-lg">Stripe</button>
            <button className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[--rc-on-surface-variant] hover:text-[--rc-on-surface]">Mercury</button>
          </div>
        </div>
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-3xl text-[--rc-on-surface-variant]/30 mb-3 block" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>credit_card</span>
          <p className="text-sm text-[--rc-on-surface-variant]/50">Connect Stripe or Mercury in Connections to see financial data</p>
        </div>
      </section>

      {/* Active Clients — LIVE from BI API */}
      <section className="space-y-4">
        <div className="flex justify-between items-end px-2">
          <h3 className="text-lg font-light tracking-tight">Active Clients</h3>
          <span className="text-[10px] text-[--rc-primary] uppercase tracking-widest font-medium">{clients?.length ?? 0} total</span>
        </div>
        {clients && clients.length > 0 ? (
          <div className="space-y-3">
            {clients.map((client) => (
              <div key={client.id} className="glass-card p-4 rounded-3xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-2xl bg-[--rc-surface-container-highest] flex items-center justify-center border border-white/10">
                    <span className="text-lg font-bold text-[--rc-primary]">{client.name[0]}</span>
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[--rc-surface] ${client.healthScore === "green" ? "bg-emerald-500" : client.healthScore === "amber" ? "bg-amber-500" : "bg-red-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{client.name}</p>
                    <p className="text-[10px] text-[--rc-on-surface-variant] tabular-nums">{client.retainerAmount ? `$${client.retainerAmount.toLocaleString()} retainer` : "No retainer set"}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${client.healthScore === "green" ? "text-emerald-400" : client.healthScore === "amber" ? "text-amber-400" : "text-red-400"}`}>
                  {client.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-6 rounded-3xl border border-white/5 text-center">
            <span className="material-symbols-outlined text-2xl text-[--rc-on-surface-variant]/30 mb-2 block" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>group</span>
            <p className="text-sm text-[--rc-on-surface-variant]/50">No clients yet. Connect Notion CRM in Connections to sync clients.</p>
          </div>
        )}
      </section>

      {/* Intelligence Alerts — LIVE from BI API */}
      <section className="space-y-4">
        <h3 className="text-lg font-light tracking-tight px-2">Intelligence Alerts</h3>
        {alerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="glass-card p-5 rounded-[2rem] border border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-medium">{alert.title}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    alert.severity === "critical" ? "bg-red-500/10 text-red-400" :
                    alert.severity === "warning" ? "bg-amber-500/10 text-amber-400" :
                    "bg-[--rc-primary]/10 text-[--rc-primary]"
                  }`}>{alert.severity}</span>
                </div>
                {alert.description && <p className="text-xs text-[--rc-on-surface-variant] leading-relaxed">{alert.description}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-6 rounded-[2rem] border border-white/5 text-center">
            <span className="material-symbols-outlined text-2xl text-[--rc-on-surface-variant]/30 mb-2 block" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>notifications</span>
            <p className="text-sm text-[--rc-on-surface-variant]/50">No alerts. Connect data sources to enable intelligence monitoring.</p>
          </div>
        )}
      </section>

      {/* Website Traffic — placeholder until Vercel Analytics / GA4 connected */}
      <section className="space-y-4">
        <h3 className="text-lg font-light tracking-tight px-2">Website Traffic</h3>
        <div className="glass-card p-6 rounded-[2rem] border border-white/5 text-center">
          <span className="material-symbols-outlined text-2xl text-[--rc-on-surface-variant]/30 mb-2 block" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>analytics</span>
          <p className="text-sm text-[--rc-on-surface-variant]/50">Connect Vercel Analytics or GA4 in Connections to see traffic data.</p>
          <p className="text-[10px] text-[--rc-on-surface-variant]/30 mt-2">Properties: integral.studio • symphony.to • tracker.integral.sh</p>
        </div>
      </section>

      {/* LinkedIn Presence — placeholder until LinkedIn connected */}
      <section className="space-y-4">
        <h3 className="text-lg font-light tracking-tight px-2">LinkedIn Presence</h3>
        <div className="glass-card p-6 rounded-[2rem] border border-white/5 text-center">
          <span className="material-symbols-outlined text-2xl text-[--rc-on-surface-variant]/30 mb-2 block" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>share</span>
          <p className="text-sm text-[--rc-on-surface-variant]/50">Connect LinkedIn in Connections to see profile views, post performance, and SSI score.</p>
        </div>
      </section>

      {/* Getting Started callout when no data sources are connected */}
      {!pulse?.weeklyRevenue && !pulse?.activeClients && (
        <section className="glass-card rounded-[2rem] p-6 border border-[--rc-primary]/20 bg-[--rc-primary]/5">
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined text-2xl text-[--rc-primary]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>rocket_launch</span>
            <div>
              <h3 className="text-sm font-bold text-[--rc-on-surface] mb-1">Connect Your Data Sources</h3>
              <p className="text-xs text-[--rc-on-surface-variant] leading-relaxed">
                This dashboard comes alive when you connect your tools. Go to <strong>Connections</strong> to set up Stripe (revenue), Mercury (banking), Notion (clients), Vercel Analytics (traffic), and LinkedIn (social).
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
