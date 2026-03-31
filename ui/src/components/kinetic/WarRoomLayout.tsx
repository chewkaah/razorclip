import { type ReactNode } from "react";
import { NavLink, useLocation } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { cn } from "@/lib/utils";

interface WarRoomLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/home", label: "Dashboard", icon: "dashboard" },
  { to: "/chat", label: "Chat", icon: "chat_bubble" },
  { to: "/inbox/mine", label: "Inbox", icon: "inbox" },
  { to: "/issues", label: "Issues", icon: "error" },
  { to: "/routines", label: "Routines", icon: "sync" },
  { to: "/goals", label: "Goals", icon: "target" },
  { to: "/agents/grid", label: "Agents", icon: "smart_toy" },
];

const bottomItems = [
  { to: "/connections", label: "Settings", icon: "settings" },
  { to: "/company/settings", label: "Support", icon: "help_outline" },
];

/**
 * WarRoomLayout — The Kinetic Terminal full-page shell.
 *
 * Matches the Stitch desktop designs exactly:
 * - Fixed left sidebar: "WAR ROOM / GLOBAL ORCHESTRATION"
 * - Fixed top bar: search (CMD+K), System Status / Network / Logs, notifications
 * - Main content area offset by sidebar + top bar
 */
export function WarRoomLayout({ children }: WarRoomLayoutProps) {
  const location = useLocation();

  return (
    <div className="bg-[--rc-surface] text-[--rc-on-surface] font-['Inter'] min-h-screen">
      {/* Side Nav Bar */}
      <aside className="fixed left-0 top-0 h-full flex flex-col py-6 bg-[--rc-surface]/80 backdrop-blur-3xl w-64 border-r border-[--rc-primary]/10 font-medium text-sm shadow-[20px_0_40px_-12px_rgba(0,255,170,0.05)] z-50">
        <div className="px-6 mb-8">
          <h1 className="text-xl font-thin tracking-tighter text-[--rc-primary] uppercase">War Room</h1>
          <p className="text-[10px] text-[--rc-on-surface-variant] tracking-[0.2em] uppercase opacity-60">Global Orchestration</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200",
                  isActive
                    ? "text-[--rc-primary] bg-[--rc-primary]/10 font-semibold border-r-2 border-[--rc-primary]"
                    : "text-[--rc-on-surface-variant] hover:text-[--rc-on-surface] hover:bg-[--rc-primary]/5",
                )
              }
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pt-4 border-t border-[#464554]/10 space-y-1">
          {bottomItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200",
                  isActive
                    ? "text-[--rc-primary] bg-[--rc-primary]/10 font-semibold"
                    : "text-[--rc-on-surface-variant] hover:text-[--rc-on-surface] hover:bg-[--rc-primary]/5",
                )
              }
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </aside>

      {/* Top Nav Bar */}
      <header className="fixed top-0 right-0 left-64 h-16 flex justify-between items-center px-8 z-40 bg-[--rc-surface]/60 backdrop-blur-xl border-b border-[--rc-primary]/10 font-medium text-xs uppercase tracking-widest">
        <div className="flex items-center gap-6">
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[--rc-on-surface-variant] text-sm"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
            >
              search
            </span>
            <input
              className="bg-transparent border-none focus:ring-0 focus:outline-none text-[10px] w-64 pl-10 text-[--rc-on-surface] placeholder:text-[--rc-on-surface-variant]/40"
              placeholder="CMD + K TO SEARCH..."
              type="text"
            />
          </div>
          <nav className="hidden md:flex gap-8">
            <a className="text-[--rc-on-surface-variant] hover:text-[--rc-primary] transition-all cursor-pointer">System Status</a>
            <a className="text-[--rc-on-surface-variant] hover:text-[--rc-primary] transition-all cursor-pointer">Network</a>
            <a className="text-[--rc-on-surface-variant] hover:text-[--rc-primary] transition-all cursor-pointer">Logs</a>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-[--rc-primary]">
          <button className="material-symbols-outlined p-2 scale-95 active:opacity-80 transition-all">
            notifications
          </button>
          <button className="material-symbols-outlined p-2 scale-95 active:opacity-80 transition-all">
            terminal
          </button>
          <div className="h-8 w-8 rounded-full bg-[#282a30] border border-[#464554]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-sm">account_circle</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-64 pt-24 pb-12 px-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
