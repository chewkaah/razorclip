import { type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "subtle" | "interactive";
  /** Optional colored left border accent (agent color hex) */
  accentBorder?: string;
  onClick?: () => void;
}

/**
 * GlassCard — Kinetic Terminal frosted glass surface.
 *
 * Design rules:
 * - No 1px solid borders for sectioning (use tonal shifts)
 * - Ghost border at 15% opacity for accessibility
 * - backdrop-blur: 24px for glassmorphism
 */
export function GlassCard({
  children,
  className,
  variant = "default",
  accentBorder,
  onClick,
}: GlassCardProps) {
  const base =
    variant === "subtle"
      ? "glass-card-subtle"
      : "glass-card";

  return (
    <div
      className={cn(
        base,
        "rounded-2xl border border-white/5",
        variant === "interactive" &&
          "transition-all duration-200 hover:bg-white/10 hover:border-[--rc-primary]/30 cursor-pointer active:scale-[0.98]",
        className,
      )}
      style={accentBorder ? { borderLeftWidth: 2, borderLeftColor: accentBorder } : undefined}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
