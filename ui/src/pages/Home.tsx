/**
 * Home / Command Center — pixel-perfect from Stitch home_command_center/code.html
 *
 * Content renders inside RazorclipShell's <main> area.
 * Desktop: sidebar provides nav. This is just the content.
 */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { agentsApi } from "../api/agents";
import { queryKeys } from "../lib/queryKeys";
import { AGENT_REGISTRY, type AgentSlug } from "../components/kinetic/AgentChip";

/** Home page agent avatar images from Stitch */
const HOME_AVATARS: Record<AgentSlug, string> = {
  dante: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLuriebWn3lMiulmrlkNqFjx0n8dj9_QaKveGF1dBdHOvh8fx0WmmBt8zkXk4cOsyan8p-bY3Dqanyk3nJvOJca1B9VZ0bVFRGKoKTtTGq6sYxQoseH0nxiWJxfG3qPBvi1E7Umg3A2mna9pYOvdY1D7CoytZXNqiNCLGc3X5f-j5sezt96Rgb4QKxvP7Mdn_F7PPvzp61ISnPBPfGymWlCUOLGoOC4kiTg3Y0ngTMoKv4yd7dgebhbvTiFwOQuL4eEwcDTlbL88c",
  brent: "https://lh3.googleusercontent.com/aida-public/AB6AXuCSn-wk4OwSaDvgNuWaxjHcenXClEf5M4UG7PDZLXY6hy7x5RmSgdZYPcQbT2iqnx1PRYsPTSU1hCmwy-ORAb2h-SCq_rY40-iwuwoTRPQFGCEUlWtX1dgFObzJzbbwrkzXwtdLTdg6yVSVUB6xlIdF-eagI4X9ZWB2t_KJv3ON45sdjUmAs9vHfZmAZhVVCAOxXmZJ-bkmKAqGcfGzSgtq2JZME_f_GU0FdNAyKGLUdvrmgQV5mrlRHNPqXeragLijvTXAbCv24Ns",
  rex: "https://lh3.googleusercontent.com/aida-public/AB6AXuAqWoFxgqgZ-jqHqwbJkFS4NgFIUFxz-VASyG4oss9fmTXutlR6_oWQ--qxAPgh5XmyLFOMWfgmnMwiKHWzeJaMWEqlT9DaMkVGU2pj7AR0IkTXyh4qYGaFXh5NnyzTex_w80alC1SdTM9mxqpoa2VpKu67_BiWvxEMkfajuawkFKQlJupExI7_dw56BUFEcqi6SO1KUzfKZut9-fRY1bKzUMXGnnejQ8lMh1t-SwnUcClhPCTlvsHzvYr_GBgEZcbJV1dBR9T3LyA",
  scout: "https://lh3.googleusercontent.com/aida-public/AB6AXuA0Oi3HQrfP4mpbcl0gMtTis--FgNpRhPXb_hZnlWypWyHy5N6zTjIWqd1bRIefrswLMU0ZQfqHluP4M_cmvaqzT_uQEeKcj4KCb4xG4KkvGgVmFVDRuI8xOYxlHCUeUoyJ3e_1rWzI_sRFHZj0fyIgz9jY8EstoYelnidJpOFY3Il8ViAVMraeYgUSZesYmqCkmaA2qwmxj3-B-WrdmlwsP95bHaoKcy-Z2WsVllbHXMaCTAFcUVnne5G_ATa5uS1_cOI5voqBXu8",
  nova: "https://lh3.googleusercontent.com/aida-public/AB6AXuAUhpMshB7axOeeuDWZC2ou7GUMGNpOiX6xwLXGz_TH-_OdQuk7FVVbk2RNN0sHpN0NUF-_0otbib8mx11D4GPgWEtYN_ZZw2q0O7TFCfITO7OcgyFvThVTKgiFU1P1zmW2Z-O2DSNjORtTv1Xg61kxN4IY-IEqIDGTtn80sCejetfrRmteYKqCw48x1D7EFE3Cu-IzcZbvXRzsjxD4dCUFs4yxdMDafQLOa8DNbw8S0PpQyC0E9jz5Nn0bdbAIOHW5jWXeRVwHDyQ",
  victor: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLeuwv6RmW-13TCLqBuzw5VecVR0ARie2zo7YqTR3QpR1I7qXATINWXMwp0FnszEqD0Y0rc16aFwBz7YbNzxtBBWyOpJPCq3q4qX0EnYRqcyxcDxLSVgh3jCP2Y1VllUkfv1a_rpSoLXm32Xv_-a8L2IQHzLvYkgbBrs6RbR90qd3bR6MNN_FG6QbMrW1RvJSqxn3GTdruof8JvDw9_kXOxiwWQ4v62f9lZbBSfGMbGoP2L_sghW6QSbk6xGGGlvdMK3jwmfirZhA",
};

/** Activity feed avatar images from Stitch */
const ACTIVITY_AVATARS: Record<string, string> = {
  dante: "https://lh3.googleusercontent.com/aida-public/AB6AXuAdPcgXocqw3w_TtLwdYc1kUwLdFErfvQyq4o0lxepSnwEXMSFzzmiY173A1WiFCTbC4XYNExa6V18fk3HAF-y6W4Mdg2gm0Fr7Ds6RFtxL9lIY-ANNFwvdOtxKYbS5Tr2Tte9zof7hRyCpJtnAsRRbN56TPhPz1tnc83ciq-fDcrTx_VRgu-LbJ8G9ptQRC86SZtmzQ16YWgPX-wnO3dZbLgX7DFXiAbjPFCh4kolPmyLOza3CdVgd8J293jh0RVgvG91CLWTwemU",
  rex: "https://lh3.googleusercontent.com/aida-public/AB6AXuC8pAnY_Zi31D15-CZjPfssJLwonoB-5J5TdfVqrxyqYubWIEGw5IJmyCgkjh6E0PwTqjpD4WGuk1Bx6V53QVdQZUDETyAc2y_B3XwaOlEXx_vHbtMHcmV0tKkUOjhu-_dBXhmWT-_fmtb0SVT5wsUQEneKcQMz3rGmDa7fQzVH6_mKse2NzwpRuCVcpt9q7FN_yRqC0Rjl6KgXUSIdSUVBr5mnsnDixahqqQVce4V2nRXyAx9btUqtyw4qiMpp2DFJfG6l27QSL4E",
  brent: "https://lh3.googleusercontent.com/aida-public/AB6AXuDjHKmHXy1nwD9KGUyZIMVoL4gWySFXXeIRFZQWXFX-M88rCC9uoWPs5pijVUVIB7dwyIUIFHrZmpurrgkKy-57BLCjDe5ff2MLymxZFK-F3bt3bBLwYKDewu5SFgrkI5IJRuMZZ0IfdznxMvBEykOCR_LVb3ZVqXngkvqs7gHGyDUR5QqnnSIA1SQZY1kti_uH3BzMAhwIZvhj3z04wjKTmlufX4dZH820hE3tBxPXPOs6TcLl0bQ2VizIuCfGEZcxuuQ2GoKGJsA",
  nova: "https://lh3.googleusercontent.com/aida-public/AB6AXuAEAWwfvIaBehf79tmD-gDjroQNpGrhLd4ORuklAVVHHuGxuRjmu3FZpZt0STmFC549rFg58d_1sUuNHUUhkyip08wZMiYpCnMD2bP3odDm6nP9N5JKDw9ljdhnVGN6u1Qs4IZiOeSlO4MSSYPS0cnwPvG_fgFStSMU2O6lWOcjEOuiFd-FNs1zAqmGDeIIGsOH6QuiNYNy3-RZu5NyTgS9xKNo92TKPuiGHrlpLvcpwQpL-GuLiizyBo7f7YeZLIPto1s8izzet-k",
};

const agents: { slug: AgentSlug; gradient: string }[] = [
  { slug: "dante", gradient: "from-[#8B5CF6] to-[#D8B4FE]" },
  { slug: "brent", gradient: "from-[#3B82F6] to-[#93C5FD]" },
  { slug: "rex", gradient: "from-[#10B981] to-[#6EE7B7]" },
  { slug: "scout", gradient: "from-[#F59E0B] to-[#FCD34D]" },
  { slug: "nova", gradient: "from-[#EC4899] to-[#FBCFE8]" },
  { slug: "victor", gradient: "from-[#EAB308] to-[#FEF08A]" },
];

const activityFeed = [
  { agent: "dante", color: "#8B5CF6", text: "Generated DMP for Drake", time: "2m ago", tag: "FINANCE-V3", tagColor: "" },
  { agent: "rex", color: "#10B981", text: "Optimized ad-spend for Nike Campaign", time: "14m ago", tag: "SUCCESS", tagColor: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  { agent: "brent", color: "#3B82F6", text: "Ingested 42 new leads from Intercom", time: "41m ago", tag: "", tagColor: "" },
  { agent: "nova", color: "#EC4899", text: "Scheduled 5 executive reviews", time: "1h ago", tag: "", tagColor: "" },
];

export function Home() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Command Center" }]);
  }, [setBreadcrumbs]);

  const { data: agentList } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const onlineCount = (agentList ?? []).filter((a: any) => a.status === "running" || a.status === "idle" || a.status === "active").length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Morning";
    if (h < 17) return "Afternoon";
    return "Evening";
  })();

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Hero Greeting — exact from Stitch */}
      <section className="mt-4">
        <h1 className="text-3xl font-light tracking-tight text-[--rc-on-surface]">
          {greeting}, <span className="font-bold text-[--rc-primary]">Chuka</span>
        </h1>
        <p className="text-[--rc-on-surface-variant] text-sm mt-1 tracking-wide uppercase">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} • Command Center
        </p>
      </section>

      {/* Business Pulse — exact from Stitch */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-[--rc-on-surface-variant]">Business Pulse</h2>
          <span className="text-[10px] text-[--rc-primary]/60 font-medium tabular-nums uppercase">Real-time • Weekly</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Active Clients */}
          <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col justify-between h-24 relative overflow-hidden">
            <div className="absolute -right-2 -top-2 w-12 h-12 bg-emerald-500/10 blur-2xl rounded-full" />
            <span className="text-[10px] font-medium text-[--rc-on-surface-variant] uppercase tracking-wider">Active Clients</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums">8</span>
              <span className="text-[10px] text-emerald-400 font-bold">+2</span>
            </div>
          </div>
          {/* Weekly Revenue */}
          <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col justify-between h-24 relative overflow-hidden">
            <div className="absolute -right-2 -top-2 w-12 h-12 bg-emerald-500/10 blur-2xl rounded-full" />
            <span className="text-[10px] font-medium text-[--rc-on-surface-variant] uppercase tracking-wider">Weekly Revenue</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums">$124k</span>
              <span className="material-symbols-outlined text-emerald-400 text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>trending_up</span>
            </div>
          </div>
          {/* Weekly Burn */}
          <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col justify-between h-24 relative overflow-hidden">
            <div className="absolute -right-2 -top-2 w-12 h-12 bg-amber-500/10 blur-2xl rounded-full" />
            <span className="text-[10px] font-medium text-[--rc-on-surface-variant] uppercase tracking-wider">Weekly Burn</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums">$18.5k</span>
              <span className="text-[10px] text-amber-400 font-bold">STABLE</span>
            </div>
          </div>
          {/* Net Margin */}
          <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col justify-between h-24 relative overflow-hidden">
            <div className="absolute -right-2 -top-2 w-12 h-12 bg-[--rc-primary]/10 blur-2xl rounded-full" />
            <span className="text-[10px] font-medium text-[--rc-on-surface-variant] uppercase tracking-wider">Net Margin</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums">85%</span>
              <span className="material-symbols-outlined text-[--rc-primary] text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>auto_awesome</span>
            </div>
          </div>
        </div>
      </section>

      {/* Syncing Agents — exact from Stitch */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-[--rc-on-surface-variant]">Syncing Agents</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-500">{onlineCount || 6} ONLINE</span>
          </div>
        </div>
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
          {agents.map(({ slug, gradient }) => {
            const config = AGENT_REGISTRY[slug];
            return (
              <div key={slug} className="flex flex-col items-center gap-2 shrink-0">
                <div className={`relative p-1 rounded-full bg-gradient-to-br ${gradient}`}>
                  <div className="bg-[--rc-surface] rounded-full p-0.5">
                    <div className="w-14 h-14 rounded-full overflow-hidden">
                      <img className="w-full h-full object-cover" src={HOME_AVATARS[slug]} alt={config.label} />
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: config.color }}>
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live Activity Feed — exact from Stitch */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-[--rc-on-surface-variant]">Live Activity</h2>
          <span className="material-symbols-outlined text-[--rc-primary] text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>reorder</span>
        </div>
        <div className="space-y-3">
          {activityFeed.map((item, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 border border-white/5 flex items-start gap-4 transition-all hover:bg-white/10">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border overflow-hidden"
                style={{ backgroundColor: `${item.color}20`, borderColor: `${item.color}30` }}
              >
                <img className="w-full h-full object-cover" src={ACTIVITY_AVATARS[item.agent]} alt={item.agent} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-[13px] text-[--rc-on-surface] leading-snug">
                    <span className="font-bold" style={{ color: item.color }}>{item.agent.charAt(0).toUpperCase() + item.agent.slice(1)}:</span>{" "}
                    {item.text}
                  </p>
                  <span className="text-[10px] text-[--rc-on-surface-variant] font-medium tabular-nums ml-2">{item.time}</span>
                </div>
                {item.tag && (
                  <div className="mt-2 flex gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter border ${item.tagColor || "bg-white/5 border-white/5 text-[--rc-on-surface-variant]"}`}>
                      {item.tag}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
