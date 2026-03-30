import { cn } from "../../lib/utils";

type StatusType = "connected" | "active" | "idle" | "error" | "pending" | "disconnected";

interface StatusDotProps {
  status: StatusType;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

const statusColors: Record<StatusType, string> = {
  connected: "bg-emerald-400 status-glow-connected",
  active: "bg-emerald-400 status-glow-connected",
  idle: "bg-kt-on-surface-variant/50",
  error: "bg-kt-danger status-glow-error",
  pending: "bg-kt-warning status-glow-pending",
  disconnected: "bg-kt-on-surface-variant/30",
};

const sizeClasses: Record<string, string> = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

/**
 * StatusDot — Colored status indicator with optional pulse and glow.
 */
export function StatusDot({ status, size = "md", pulse, className }: StatusDotProps) {
  const shouldPulse = pulse ?? (status === "active" || status === "pending");

  return (
    <span
      className={cn(
        "inline-block rounded-full shrink-0",
        sizeClasses[size],
        statusColors[status],
        shouldPulse && "animate-pulse",
        className,
      )}
    />
  );
}
