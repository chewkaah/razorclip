/**
 * InstanceShell — Razorclip-styled shell for instance-level settings pages.
 *
 * Mirrors the RazorclipShell's visual treatment (dark surface, sidebar, top bar)
 * but works without a company context. Provides a minimal sidebar with instance-scoped links.
 */
import { NavLink, Outlet, useNavigate } from "@/lib/router";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

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

const instanceNav = [
  { to: "/instance/settings/general", label: "General", icon: "settings" },
  { to: "/instance/settings/heartbeats", label: "Heartbeats", icon: "timer" },
  { to: "/instance/settings/experimental", label: "Experimental", icon: "science" },
  { to: "/instance/settings/plugins", label: "Plugins", icon: "extension" },
];

function SideLink({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200",
          isActive
            ? "text-[--rc-primary] bg-[--rc-primary]/10 font-semibold border-r-2 border-[--rc-primary]"
            : "text-[--rc-on-surface-variant] hover:text-[--rc-on-surface] hover:bg-[--rc-primary]/5",
        )
      }
    >
      <MI icon={icon} />
      <span>{label}</span>
    </NavLink>
  );
}

export function InstanceShell() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="razorclip-shell bg-[--rc-surface] text-[--rc-on-surface] font-['Inter'] h-[100dvh] overflow-hidden selection:bg-[--rc-primary]/30">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 h-14 flex items-center justify-between px-4 z-50 bg-[--rc-topbar-bg] backdrop-blur-xl border-b border-[--rc-primary]/10">
        <h1 className="text-sm font-thin tracking-tighter text-[--rc-primary] uppercase">Instance Settings</h1>
        <button onClick={() => navigate("/")} className="text-[--rc-on-surface-variant] hover:text-[--rc-primary] transition-colors">
          <MI icon="home" />
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full flex-col py-6 bg-[--rc-sidebar-bg] backdrop-blur-3xl w-64 border-r border-[--rc-primary]/10 tabular-nums tracking-tight font-medium text-sm shadow-[20px_0_40px_-12px_rgba(0,255,170,0.05)] z-50">
        <div className="px-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-[--rc-primary] bg-[--rc-primary]/10 shrink-0">
              <MI icon="settings" />
            </div>
            <h1 className="text-xl font-thin tracking-tighter text-[--rc-primary] uppercase">Instance</h1>
          </div>
          <NavLink
            to="/"
            className="flex items-center gap-2 mt-2 w-full px-2 py-1.5 rounded-lg hover:bg-[--rc-primary]/5 transition-colors text-[10px] text-[--rc-on-surface-variant] tracking-[0.15em] uppercase no-underline"
          >
            <MI icon="arrow_back" className="!text-xs" />
            <span>Back to Dashboard</span>
          </NavLink>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
          {instanceNav.map((item) => (
            <SideLink key={item.to} {...item} />
          ))}
        </nav>

        <div className="px-3 pt-4 border-t border-[--rc-outline-variant]/10 space-y-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-[--rc-on-surface-variant] hover:text-[--rc-on-surface] hover:bg-[--rc-primary]/5 transition-colors duration-200 w-full"
          >
            <MI icon={theme === "dark" ? "light_mode" : "dark_mode"} />
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>
      </aside>

      {/* Desktop top bar */}
      <header className="hidden md:flex fixed top-0 right-0 left-64 h-16 justify-between items-center px-8 z-40 bg-[--rc-topbar-bg] backdrop-blur-xl border-b border-[--rc-primary]/10 font-medium text-xs uppercase tracking-widest">
        <span className="text-[--rc-on-surface-variant]">Instance Settings</span>
        <NavLink to="/" className="text-[--rc-on-surface-variant] hover:text-[--rc-primary] transition-all no-underline flex items-center gap-2">
          <MI icon="arrow_back" className="!text-sm" />
          Dashboard
        </NavLink>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[--rc-surface-container-low] backdrop-blur-xl border-t border-[--rc-outline-variant]/10" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex justify-around py-2">
          {instanceNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 min-w-[60px] min-h-[44px] justify-center no-underline transition-colors",
                  isActive ? "text-[--rc-primary]" : "text-[--rc-on-surface-variant]",
                )
              }
            >
              <MI icon={item.icon} className="!text-xl" />
              <span className="text-[9px] uppercase tracking-wider">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="md:ml-64 pt-20 md:pt-24 pb-24 md:pb-12 px-4 md:px-8 overflow-y-auto" style={{ height: "100dvh" }}>
        <Outlet />
      </main>
    </div>
  );
}
