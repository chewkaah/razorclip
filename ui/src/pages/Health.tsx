import { useEffect } from "react";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { GlassCard, MetricPill, SectionHeader } from "../components/kinetic";

export function Health() {
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Business Health" }]);
  }, [setBreadcrumbs]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="kt-page min-h-full pb-24 px-4 pt-4 space-y-8 max-w-2xl mx-auto">
      {/* Hero */}
      <section className="mt-2">
        <p className="text-[10px] uppercase tracking-[0.15em] text-kt-primary font-bold mb-1">
          Weekly Health Report
        </p>
        <h1 className="text-3xl font-light tracking-tight text-kt-on-surface">
          {greeting}, <span className="font-bold text-kt-primary">Chuka</span>.
        </h1>
        <p className="text-kt-on-surface-variant text-sm mt-1">
          Here is your weekly health pulse for {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}
        </p>
      </section>

      {/* Hero Metrics */}
      <section className="space-y-4">
        <SectionHeader title="Financial Overview" />
        <div className="grid grid-cols-2 gap-3">
          <MetricPill label="Weekly Revenue" value="—" />
          <MetricPill label="Weekly Burn" value="—" trend="stable" trendLabel="—" />
          <MetricPill label="Net Margin" value="—" />
          <MetricPill label="Cash Position" value="—" />
        </div>
        <p className="text-[10px] text-kt-on-surface-variant/50 text-center">
          Connect Stripe or Mercury in Connections to see live data
        </p>
      </section>

      {/* Cash Position */}
      <section className="space-y-4">
        <SectionHeader title="Cash Position" />
        <GlassCard className="p-6 text-center">
          <p className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant mb-2">Mercury Balance</p>
          <p className="text-4xl font-light tabular-nums text-kt-on-surface">—</p>
          <p className="text-xs text-kt-on-surface-variant mt-2">Connect Mercury to see live balance</p>
        </GlassCard>
      </section>

      {/* Active Clients */}
      <section className="space-y-4">
        <SectionHeader title="Active Clients" />
        <GlassCard className="p-4">
          <p className="text-sm text-kt-on-surface-variant text-center py-6">
            Connect Notion CRM in Connections to sync clients
          </p>
        </GlassCard>
      </section>

      {/* Traffic */}
      <section className="space-y-4">
        <SectionHeader title="Website Traffic" />
        <GlassCard className="p-4">
          <p className="text-sm text-kt-on-surface-variant text-center py-6">
            Connect Vercel Analytics or GA4 to see traffic data
          </p>
        </GlassCard>
      </section>

      {/* LinkedIn */}
      <section className="space-y-4">
        <SectionHeader title="LinkedIn Presence" />
        <GlassCard className="p-4">
          <p className="text-sm text-kt-on-surface-variant text-center py-6">
            Connect LinkedIn in Connections to see social metrics
          </p>
        </GlassCard>
      </section>
    </div>
  );
}
