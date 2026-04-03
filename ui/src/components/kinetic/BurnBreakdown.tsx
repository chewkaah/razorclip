/**
 * BurnBreakdown -- Horizontal stacked-bar cost breakdown by agent.
 *
 * Kinetic Terminal styling: glass-card + --rc-* CSS variables.
 * Pure CSS/SVG -- no chart library.
 */
import { useQuery } from "@tanstack/react-query";
import { costsApi } from "../../api/costs";
import { queryKeys } from "../../lib/queryKeys";
import { formatCents } from "../../lib/utils";
import { AGENT_REGISTRY, type AgentSlug } from "./AgentChip";

interface BurnBreakdownProps {
  companyId: string;
}

function resolveAgentColor(name: string | null): { bg: string; light: string } {
  if (!name) return { bg: "var(--rc-primary)", light: "var(--rc-on-surface-variant)" };
  const slug = name.toLowerCase().trim() as AgentSlug;
  const config = AGENT_REGISTRY[slug];
  if (config) return { bg: config.color, light: config.colorLight };
  // Fallback: hash-based hue
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return { bg: `hsl(${hue}, 55%, 55%)`, light: `hsl(${hue}, 65%, 80%)` };
}

export function BurnBreakdown({ companyId }: BurnBreakdownProps) {
  const { data: byAgent, isLoading } = useQuery({
    queryKey: [...queryKeys.costs(companyId), "by-agent"],
    queryFn: () => costsApi.byAgent(companyId),
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6 animate-pulse">
        <div className="h-4 w-32 bg-[--rc-surface-container-high] rounded mb-4" />
        <div className="h-8 bg-[--rc-surface-container-high] rounded-full" />
      </div>
    );
  }

  const rows = (byAgent ?? []).filter((r) => r.costCents > 0);
  const totalCents = rows.reduce((s, r) => s + r.costCents, 0);

  if (rows.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6">
        <h3 className="uppercase tracking-widest text-[10px] font-bold text-[--rc-on-surface-variant] opacity-60 mb-3">
          Burn Breakdown
        </h3>
        <p className="text-sm text-[--rc-on-surface-variant]/50">No cost data yet</p>
      </div>
    );
  }

  // Sort descending by cost
  const sorted = [...rows].sort((a, b) => b.costCents - a.costCents);

  return (
    <div className="glass-card rounded-xl p-6">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="uppercase tracking-widest text-[10px] font-bold text-[--rc-on-surface-variant] opacity-60">
          Burn Breakdown
        </h3>
        <span className="text-2xl font-extralight tracking-tight tabular-nums text-[--rc-on-surface]">
          {formatCents(totalCents)}
        </span>
      </div>

      {/* Stacked bar */}
      <div className="h-7 rounded-full overflow-hidden flex bg-[--rc-surface-container-low]">
        {sorted.map((row) => {
          const pct = (row.costCents / totalCents) * 100;
          const { bg } = resolveAgentColor(row.agentName);
          return (
            <div
              key={row.agentId}
              className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full relative group"
              style={{
                width: `${pct}%`,
                backgroundColor: bg,
                minWidth: pct > 0 ? "3px" : 0,
              }}
              title={`${row.agentName ?? row.agentId}: ${formatCents(row.costCents)} (${pct.toFixed(1)}%)`}
            >
              {/* Hover tooltip */}
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-[--rc-surface-container-highest] text-[--rc-on-surface] text-[10px] px-2 py-1 rounded shadow-lg z-10 border border-[--rc-outline-variant]/20">
                {row.agentName ?? row.agentId}: {formatCents(row.costCents)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
        {sorted.map((row) => {
          const pct = (row.costCents / totalCents) * 100;
          const { bg, light } = resolveAgentColor(row.agentName);
          return (
            <div key={row.agentId} className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: bg }}
              />
              <span className="text-[11px] font-medium truncate" style={{ color: light }}>
                {row.agentName ?? row.agentId}
              </span>
              <span className="text-[10px] tabular-nums text-[--rc-on-surface-variant] ml-auto shrink-0">
                {formatCents(row.costCents)}
              </span>
              <span className="text-[9px] tabular-nums text-[--rc-outline] shrink-0">
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
