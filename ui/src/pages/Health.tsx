/**
 * Health Dashboard — pixel-perfect from Stitch business_health_dashboard_updated/code.html
 */
import { useEffect } from "react";
import { useBreadcrumbs } from "../context/BreadcrumbContext";

export function Health() {
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => { setBreadcrumbs([{ label: "Business Health" }]); }, [setBreadcrumbs]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Founder Greeting — from Stitch */}
      <section className="px-2">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#c7c4d7] font-medium">Founder's Morning Briefing</p>
        <h1 className="text-3xl font-light tracking-tight mt-1">
          {greeting}, <span className="text-[#c2c1ff] font-normal">Chuka</span>.
        </h1>
        <p className="text-sm text-[#c7c4d7] mt-2 font-light">
          Here is your weekly health pulse for {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}.
        </p>
      </section>

      {/* Founder's Schedule — from Stitch */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-lg font-light tracking-tight">Founder's Schedule</h3>
          <span className="text-[10px] text-[#c2c1ff] uppercase tracking-widest font-medium">Today</span>
        </div>
        <div className="glass-card rounded-3xl border border-white/5 divide-y divide-white/5">
          <div className="p-4 flex items-center justify-between">
            <div className="flex gap-4">
              <div className="flex flex-col items-center justify-center min-w-[3rem]">
                <span className="text-xs font-semibold tabular-nums">09:00</span>
                <span className="text-[10px] text-[#c7c4d7] uppercase">AM</span>
              </div>
              <div>
                <p className="text-sm font-medium">Board Strategy Sync</p>
                <p className="text-[10px] text-[#c7c4d7] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>location_on</span> Zoom
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#c2c1ff]/10 text-[#c2c1ff] text-[9px] font-bold uppercase tracking-wider border border-[#c2c1ff]/20">Ongoing</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex gap-4">
              <div className="flex flex-col items-center justify-center min-w-[3rem]">
                <span className="text-xs font-semibold tabular-nums">11:30</span>
                <span className="text-[10px] text-[#c7c4d7] uppercase">AM</span>
              </div>
              <div>
                <p className="text-sm font-medium">Product Roadmap Review</p>
                <p className="text-[10px] text-[#c7c4d7] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>location_on</span> HQ Conference Room
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#33343b] text-[#c7c4d7] text-[9px] font-bold uppercase tracking-wider">Upcoming</span>
          </div>
        </div>
      </section>

      {/* Weekly Top Metrics — from Stitch */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-[#191b22] border border-[#464554]/5">
          <p className="text-[10px] uppercase tracking-wider text-[#c7c4d7] mb-1">Weekly Revenue</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-light tracking-tight tabular-nums">$124k</span>
            <span className="text-[10px] text-[#eac400]">+12%</span>
          </div>
        </div>
        <div className="p-4 rounded-3xl bg-[#191b22] border border-[#464554]/5">
          <p className="text-[10px] uppercase tracking-wider text-[#c7c4d7] mb-1">Weekly Burn</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-light tracking-tight tabular-nums">$18.5k</span>
            <span className="text-[10px] text-[#ffb4ab]">-2%</span>
          </div>
        </div>
        <div className="p-4 rounded-3xl bg-[#191b22] border border-[#464554]/5">
          <p className="text-[10px] uppercase tracking-wider text-[#c7c4d7] mb-1">Margin</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-light tracking-tight tabular-nums">85%</span>
            <span className="material-symbols-outlined text-[12px] text-[#c2c1ff]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>trending_up</span>
          </div>
        </div>
        <div className="p-4 rounded-3xl bg-[#191b22] border border-[#464554]/5">
          <p className="text-[10px] uppercase tracking-wider text-[#c7c4d7] mb-1">Pipeline</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-light tracking-tight tabular-nums">$2.1M</span>
            <span className="text-[10px] text-[#c7c4d7]">Active</span>
          </div>
        </div>
      </section>

      {/* Stripe / Mercury — from Stitch */}
      <section className="glass-card rounded-[2rem] p-6 border border-white/5 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <div className="flex p-1 bg-[#0c0e14] rounded-full border border-white/5">
            <button className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest bg-[#c2c1ff] text-[#1800a7] rounded-full shadow-lg">Stripe</button>
            <button className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#c7c4d7] hover:text-[#e2e2eb]">Mercury</button>
          </div>
          <span className="material-symbols-outlined text-[#c7c4d7]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>more_vert</span>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] text-[#c7c4d7]">Total MRR</p>
            <h2 className="text-4xl font-extralight tracking-tighter tabular-nums mt-1">$420,000</h2>
          </div>
          <div className="h-16 flex items-end gap-1.5">
            <div className="flex-1 bg-[#c2c1ff]/10 rounded-t-lg h-1/2" />
            <div className="flex-1 bg-[#c2c1ff]/20 rounded-t-lg h-2/3" />
            <div className="flex-1 bg-[#c2c1ff]/10 rounded-t-lg h-3/4" />
            <div className="flex-1 bg-[#c2c1ff]/40 rounded-t-lg h-full" />
            <div className="flex-1 bg-[#c2c1ff]/20 rounded-t-lg h-5/6" />
            <div className="flex-1 bg-[#c2c1ff]/60 rounded-t-lg h-3/4" />
            <div className="flex-1 bg-[#c2c1ff] rounded-t-lg h-[90%]" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div>
              <p className="text-[10px] text-[#c7c4d7]">Weekly Collections</p>
              <p className="text-lg font-light tabular-nums">$32,104</p>
            </div>
            <div>
              <p className="text-[10px] text-[#c7c4d7]">Failed Payments</p>
              <p className="text-lg font-light tabular-nums text-[#ffb4ab]">4 <span className="text-[10px] text-[#c7c4d7]">($1.2k)</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Intelligence — from Stitch */}
      <section className="space-y-4">
        <div className="flex justify-between items-end px-2">
          <h3 className="text-lg font-light tracking-tight">Recent Intelligence</h3>
          <span className="text-[10px] text-[#c7c4d7] uppercase tracking-widest font-medium">Via Fireflies.ai</span>
        </div>
        <div className="space-y-3">
          <div className="glass-card p-5 rounded-[2rem] border border-white/5">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#6366F1]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px] text-[#6366F1]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>mic</span>
                </div>
                <h4 className="text-sm font-medium">Series A Investor Prep</h4>
              </div>
              <span className="text-[10px] text-[#c7c4d7] tabular-nums">2h ago</span>
            </div>
            <p className="text-xs font-light text-[#c7c4d7] leading-relaxed line-clamp-2">
              Discussed valuation multiples and growth projections for Q4. Team aligned on aggressive hiring plan for engineering.
            </p>
            <div className="mt-4 flex gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">Positive Sentiment</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#c2c1ff]/10 border border-[#c2c1ff]/20">
                <span className="text-[9px] font-bold text-[#c2c1ff] uppercase tracking-tighter">3 Action Items</span>
              </div>
            </div>
          </div>
          <div className="glass-card p-5 rounded-[2rem] border border-white/5">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#6366F1]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px] text-[#6366F1]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>mic</span>
                </div>
                <h4 className="text-sm font-medium">Integral Studio Kickoff</h4>
              </div>
              <span className="text-[10px] text-[#c7c4d7] tabular-nums">Yesterday</span>
            </div>
            <p className="text-xs font-light text-[#c7c4d7] leading-relaxed line-clamp-2">
              Explored automation workflows for creative delivery. Client impressed with Dante's initial performance benchmarks.
            </p>
            <div className="mt-4 flex gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">High Engagement</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Clients — from Stitch */}
      <section className="space-y-4">
        <div className="flex justify-between items-end px-2">
          <h3 className="text-lg font-light tracking-tight">Active Clients</h3>
          <span className="text-[10px] text-[#c2c1ff] uppercase tracking-widest font-medium">View All</span>
        </div>
        <div className="space-y-3">
          <div className="glass-card p-4 rounded-3xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-2xl bg-[#33343b] flex items-center justify-center border border-white/10">
                <span className="text-lg font-bold text-[#c2c1ff]">IS</span>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#10B981] rounded-full border-2 border-[#111319] animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium">Integral Studio</p>
                <p className="text-[10px] text-[#c7c4d7] tabular-nums">$12,500 retainer</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
              <span className="text-[10px] font-bold text-[#D8B4FE] tracking-tighter">Dante</span>
            </div>
          </div>
          <div className="glass-card p-4 rounded-3xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-2xl bg-[#33343b] flex items-center justify-center border border-white/10">
                <span className="text-lg font-bold text-[#c2c1ff]">S</span>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#10B981] rounded-full border-2 border-[#111319]" />
              </div>
              <div>
                <p className="text-sm font-medium">Symphony.to</p>
                <p className="text-[10px] text-[#c7c4d7] tabular-nums">$28,000 retainer</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
              <span className="text-[10px] font-bold text-[#93C5FD] tracking-tighter">Brent</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
