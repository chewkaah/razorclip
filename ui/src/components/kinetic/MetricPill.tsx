import { type ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../lib/utils";

interface MetricPillProps {
  label: string;
  value: string;
  /** Positive = green up arrow, negative = red down arrow, null = neutral */
  trend?: "up" | "down" | "stable" | null;
  trendLabel?: string;
  /** Accent glow color (hex), defaults to emerald */
  accentColor?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * MetricPill — Compact metric card for the Business Pulse strip.
 *
 * Design: Glass card, label-sm uppercase, display-lg value, tabular nums.
 * Trend arrows: green for up-good, red for down-bad, amber for stable.
 */
export function MetricPill({
  label,
  value,
  trend,
  trendLabel,
  accentColor,
  className,
  onClick,
}: MetricPillProps) {
  const glowColor = accentColor ?? (trend === "down" ? "#ffb4ab" : trend === "stable" ? "#F59E0B" : "#10B981");

  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-4 border border-white/5 flex flex-col justify-between h-24 relative overflow-hidden",
        onClick && "cursor-pointer hover:bg-white/10 transition-all active:scale-[0.98]",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Ambient corner glow */}
      <div
        className="absolute -right-2 -top-2 w-12 h-12 blur-2xl rounded-full pointer-events-none"
        style={{ backgroundColor: `${glowColor}15` }}
      />

      <span className="text-[10px] font-medium text-kt-on-surface-variant uppercase tracking-wider relative z-10">
        {label}
      </span>

      <div className="flex items-baseline gap-1.5 relative z-10">
        <span className="text-2xl font-semibold tabular-nums text-kt-on-surface">{value}</span>
        {trend === "up" && (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
        )}
        {trend === "down" && (
          <TrendingDown className="w-3.5 h-3.5 text-kt-danger" />
        )}
        {trendLabel && (
          <span
            className={cn(
              "text-[10px] font-bold",
              trend === "up" && "text-emerald-400",
              trend === "down" && "text-kt-danger",
              trend === "stable" && "text-kt-warning",
              !trend && "text-kt-on-surface-variant",
            )}
          >
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  );
}
