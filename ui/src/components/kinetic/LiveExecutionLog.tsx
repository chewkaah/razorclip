import { type ReactNode } from "react";
import { Terminal, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { AGENT_REGISTRY, type AgentSlug } from "./AgentChip";

interface LogLine {
  timestamp?: string;
  text: string;
  status?: "success" | "error" | "info";
}

interface LiveExecutionLogProps {
  /** Agent running the execution */
  agentSlug?: AgentSlug | null;
  agentName?: string;
  /** Terminal output lines */
  lines: LogLine[];
  /** Whether execution is ongoing */
  isLive?: boolean;
  /** Completion percentage */
  progress?: number;
  /** Collapsed by default */
  defaultCollapsed?: boolean;
  className?: string;
}

const statusColors: Record<string, string> = {
  success: "text-emerald-400",
  error: "text-kt-danger",
  info: "text-kt-on-surface-variant/70",
};

/**
 * LiveExecutionLog — Streaming terminal output component.
 *
 * Matches Stitch active_ticket_thread_live_state "DANTE OUTPUT LOG" pattern.
 * Monospace dark bg, colored status lines, optional progress bar.
 */
export function LiveExecutionLog({
  agentSlug,
  agentName = "Agent",
  lines,
  isLive = false,
  progress,
  defaultCollapsed = false,
  className,
}: LiveExecutionLogProps) {
  const config = agentSlug ? AGENT_REGISTRY[agentSlug] : null;
  const accentColor = config?.color ?? "#c2c1ff";

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5" style={{ color: accentColor }} />
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: accentColor }}
          >
            {agentName} Output Log
          </span>
          {isLive && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-400 uppercase">Live</span>
            </div>
          )}
        </div>
        {progress != null && (
          <span className="text-[10px] font-bold text-kt-on-surface-variant tabular-nums">
            {progress}% Complete
          </span>
        )}
      </div>

      {/* Progress bar */}
      {progress != null && (
        <div className="w-full h-1 bg-kt-surface-container-highest rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${accentColor}, ${config?.colorLight ?? accentColor})`,
            }}
          />
        </div>
      )}

      {/* Terminal output */}
      <div className="bg-kt-surface-container-lowest rounded-xl p-3 border border-kt-outline-variant/10 font-mono text-xs leading-relaxed max-h-48 overflow-y-auto no-scrollbar">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2">
            {line.timestamp && (
              <span className="text-kt-on-surface-variant/30 shrink-0 tabular-nums">
                [{line.timestamp}]
              </span>
            )}
            <span className={cn(statusColors[line.status ?? "info"])}>
              {line.status === "success" && "✓ "}
              {line.status === "error" && "✗ "}
              {line.text}
            </span>
          </div>
        ))}
        {isLive && (
          <div className="flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-kt-primary animate-pulse" />
            <span className="text-kt-primary/50">_</span>
          </div>
        )}
      </div>
    </div>
  );
}
