/**
 * MobileBottomNav — Legacy Layout shell bottom nav.
 *
 * NOTE: The primary mobile nav is in RazorclipShell. This version exists
 * only for the instance-settings Layout shell. Kept in sync with the
 * RazorclipShell nav targets for consistency.
 */
import { useMemo } from "react";
import { NavLink } from "@/lib/router";
import {
  House,
  MessageSquare,
  Users,
  HeartPulse,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "../lib/utils";

interface MobileBottomNavProps {
  visible: boolean;
}

interface MobileNavItem {
  to: string;
  label: string;
  icon: typeof House;
  badge?: number;
}

export function MobileBottomNav({ visible }: MobileBottomNavProps) {
  const items = useMemo<MobileNavItem[]>(
    () => [
      { to: "/home", label: "Home", icon: House },
      { to: "/chat", label: "Chat", icon: MessageSquare },
      { to: "/agents/grid", label: "Agents", icon: Users },
      { to: "/health", label: "Health", icon: HeartPulse },
      { to: "/inbox/mine", label: "More", icon: MoreHorizontal },
    ],
    [],
  );

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 bg-[--rc-surface]/90 backdrop-blur-2xl rounded-t-3xl transition-transform duration-200 ease-out md:hidden pb-[env(safe-area-inset-bottom)]",
        visible ? "translate-y-0" : "translate-y-full",
      )}
      aria-label="Mobile navigation"
    >
      {/* Top gradient line */}
      <div className="bg-gradient-to-r from-transparent via-[--rc-primary]/20 to-transparent h-px" />

      <div className="grid h-16 grid-cols-5 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium uppercase tracking-[0.05em] transition-all",
                  isActive
                    ? "text-[--rc-primary] bg-[--rc-primary]/10"
                    : "text-[--rc-on-surface-variant]/50 hover:text-[--rc-primary]",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon className={cn("h-[18px] w-[18px]", isActive && "stroke-[2.3]")} />
                    {item.badge != null && item.badge > 0 && (
                      <span className="absolute -right-2 -top-2 rounded-full bg-kt-primary px-1.5 py-0.5 text-[10px] leading-none text-kt-on-primary">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </span>
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
