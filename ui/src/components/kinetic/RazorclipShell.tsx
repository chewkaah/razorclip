/**
 * RazorclipShell — The full-page shell for Razorclip V1.
 *
 * Translated pixel-perfect from Stitch agent_grid_desktop/code.html
 * with the addition of a collapsible agent list in the sidebar.
 *
 * Replaces the upstream Paperclip Layout for all Razorclip pages.
 * Branding: "Razorclip" (not War Room, not Kinetic Terminal, not Paperclip)
 */
import { type ReactNode, useState, useMemo } from "react";
import { NavLink, useLocation, Outlet } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { agentsApi } from "@/api/agents";
import { heartbeatsApi } from "@/api/heartbeats";
import { queryKeys } from "@/lib/queryKeys";
import { cn, agentRouteRef, agentUrl } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Agent } from "@paperclipai/shared";
import { AGENT_REGISTRY, type AgentSlug } from "./AgentChip";

function resolveSlug(name: string): AgentSlug | null {
  const s = name.toLowerCase().trim();
  return s in AGENT_REGISTRY ? (s as AgentSlug) : null;
}

/* ── Material icon shorthand ─────────────────────────── */
function MI({ icon, className }: { icon: string; className?: string }) {
  return (
    <span
      className={cn("material-symbols-outlined text-lg", className)}
      style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
    >
      {icon}
    </span>
  );
}

/* ── Nav items ───────────────────────────────────────── */
const mainNav = [
  { to: "/home", label: "Dashboard", icon: "dashboard" },
  { to: "/chat", label: "Chat", icon: "chat_bubble" },
  { to: "/inbox/mine", label: "Inbox", icon: "inbox" },
  { to: "/issues", label: "Issues", icon: "error" },
  { to: "/routines", label: "Routines", icon: "sync" },
  { to: "/goals", label: "Goals", icon: "target" },
  { to: "/agents/grid", label: "Agents", icon: "smart_toy" },
];

const bottomNav = [
  { to: "/connections", label: "Settings", icon: "settings" },
  { to: "/health", label: "Health", icon: "monitor_heart" },
];

/* ── Sidebar Link ────────────────────────────────────── */
function SideLink({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200",
          isActive
            ? "text-[#c2c1ff] bg-[#c2c1ff]/10 font-semibold border-r-2 border-[#c2c1ff]"
            : "text-[#c7c4d7] hover:text-[#e2e2eb] hover:bg-[#c2c1ff]/5",
        )
      }
    >
      <MI icon={icon} />
      <span>{label}</span>
    </NavLink>
  );
}

/* ── Sidebar Agent List (collapsible) ────────────────── */
function SidebarAgentList() {
  const [open, setOpen] = useState(true);
  const { selectedCompanyId } = useCompany();

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 10_000,
  });

  const liveCountByAgent = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of liveRuns ?? []) m.set((r as any).agentId, (m.get((r as any).agentId) ?? 0) + 1);
    return m;
  }, [liveRuns]);

  const visible = useMemo(
    () => (agents ?? []).filter((a: Agent) => a.status !== "terminated").sort((a: Agent, b: Agent) => a.name.localeCompare(b.name)),
    [agents],
  );

  return (
    <div className="px-3 mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 w-full px-1 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-[#c7c4d7]/40 hover:text-[#c7c4d7]/70 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>Agents</span>
        <span className="ml-auto tabular-nums text-[#c2c1ff]/40">{visible.length}</span>
      </button>
      {open && (
        <div className="mt-1 space-y-0.5 max-h-48 overflow-y-auto no-scrollbar">
          {visible.map((agent: Agent) => {
            const slug = resolveSlug(agent.name);
            const config = slug ? AGENT_REGISTRY[slug] : null;
            const live = liveCountByAgent.get(agent.id) ?? 0;
            const isError = agent.status === "error";
            const isActive = agent.status === "running" || agent.status === "idle" || agent.status === "active";

            return (
              <NavLink
                key={agent.id}
                to={`${agentUrl(agent)}/profile`}
                className={({ isActive: routeActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-4 py-1.5 rounded-lg text-[12px] transition-colors duration-200",
                    routeActive
                      ? "text-[#e2e2eb] bg-[#c2c1ff]/8"
                      : "text-[#c7c4d7]/70 hover:text-[#e2e2eb] hover:bg-white/3",
                  )
                }
              >
                {/* Status dot */}
                <span
                  className={cn("w-2 h-2 rounded-full shrink-0", live > 0 && "animate-pulse")}
                  style={{
                    backgroundColor: isError ? "#ffb4ab" : isActive ? (config?.color ?? "#10B981") : "#464554",
                  }}
                />
                <span className="flex-1 truncate">{agent.name}</span>
                {live > 0 && (
                  <span className="text-[10px] tabular-nums text-[#c2c1ff]/60">{live}</span>
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main Shell ──────────────────────────────────────── */
export function RazorclipShell() {
  return (
    <div className="bg-[#111319] text-[#e2e2eb] font-['Inter'] min-h-screen selection:bg-[#c2c1ff]/30">
      {/* ─── Sidebar ─── */}
      <aside className="fixed left-0 top-0 h-full flex flex-col py-6 bg-[#111319]/80 backdrop-blur-3xl w-64 border-r border-[#c2c1ff]/10 tabular-nums tracking-tight font-medium text-sm shadow-[20px_0_40px_-12px_rgba(194,193,255,0.05)] z-50">
        {/* Brand */}
        <div className="px-6 mb-8">
          <h1 className="text-xl font-thin tracking-tighter text-[#c2c1ff] uppercase">Razorclip</h1>
          <p className="text-[10px] text-[#c7c4d7] tracking-[0.2em] uppercase opacity-60">
            Agent Command Center
          </p>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
          {mainNav.map((item) => (
            <SideLink key={item.to} {...item} />
          ))}

          {/* Agent list — collapsible, below main nav */}
          <SidebarAgentList />
        </nav>

        {/* Bottom nav */}
        <div className="px-3 pt-4 border-t border-[#464554]/10 space-y-1">
          {bottomNav.map((item) => (
            <SideLink key={item.to} {...item} />
          ))}
        </div>
      </aside>

      {/* ─── Top bar ─── */}
      <header className="fixed top-0 right-0 left-64 h-16 flex justify-between items-center px-8 z-40 bg-[#111319]/60 backdrop-blur-xl border-b border-[#c2c1ff]/10 font-medium text-xs uppercase tracking-widest">
        <div className="flex items-center gap-6">
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#c7c4d7] text-sm"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
            >
              search
            </span>
            <input
              className="bg-transparent border-none focus:ring-0 focus:outline-none text-[10px] w-64 pl-10 text-[#e2e2eb] placeholder:text-[#c7c4d7]/40"
              placeholder="CMD + K TO SEARCH..."
              type="text"
            />
          </div>
          <nav className="hidden md:flex gap-8">
            <a className="text-[#c7c4d7] hover:text-[#c2c1ff] transition-all cursor-pointer">System Status</a>
            <a className="text-[#c7c4d7] hover:text-[#c2c1ff] transition-all cursor-pointer">Network</a>
            <a className="text-[#c7c4d7] hover:text-[#c2c1ff] transition-all cursor-pointer">Logs</a>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-[#c2c1ff]">
          <button
            className="material-symbols-outlined p-2 scale-95 active:opacity-80 transition-all"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
          >
            notifications
          </button>
          <button
            className="material-symbols-outlined p-2 scale-95 active:opacity-80 transition-all"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
          >
            terminal
          </button>
          <div className="h-8 w-8 rounded-full bg-[#282a30] border border-[#464554]/20 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
            >
              account_circle
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main content ─── */}
      <main className="ml-64 pt-24 pb-12 px-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
