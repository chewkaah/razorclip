import { cn } from "../../lib/utils";

export type AgentSlug = "dante" | "brent" | "rex" | "scout" | "nova" | "victor";

interface AgentConfig {
  color: string;
  colorLight: string;
  label: string;
  gradient: string;
  glowClass: string;
}

export const AGENT_REGISTRY: Record<AgentSlug, AgentConfig> = {
  dante: {
    color: "#8B5CF6",
    colorLight: "#D8B4FE",
    label: "Dante",
    gradient: "from-[#8B5CF6] to-[#D8B4FE]",
    glowClass: "agent-glow-dante",
  },
  brent: {
    color: "#3B82F6",
    colorLight: "#93C5FD",
    label: "Brent",
    gradient: "from-[#3B82F6] to-[#93C5FD]",
    glowClass: "agent-glow-brent",
  },
  rex: {
    color: "#10B981",
    colorLight: "#6EE7B7",
    label: "Rex",
    gradient: "from-[#10B981] to-[#6EE7B7]",
    glowClass: "agent-glow-rex",
  },
  scout: {
    color: "#F59E0B",
    colorLight: "#FCD34D",
    label: "Scout",
    gradient: "from-[#F59E0B] to-[#FCD34D]",
    glowClass: "agent-glow-scout",
  },
  nova: {
    color: "#EC4899",
    colorLight: "#FBCFE8",
    label: "Nova",
    gradient: "from-[#EC4899] to-[#FBCFE8]",
    glowClass: "agent-glow-nova",
  },
  victor: {
    color: "#EAB308",
    colorLight: "#FEF08A",
    label: "Victor",
    gradient: "from-[#EAB308] to-[#FEF08A]",
    glowClass: "agent-glow-victor",
  },
};

interface AgentChipProps {
  agent: AgentSlug;
  /** Show as active (pulsing dot + glow) */
  active?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * AgentChip — Pill-shaped agent identifier with accent color.
 *
 * Design: 10% opacity fill of agent gradient, 4px solid pulse of agent primary color.
 */
export function AgentChip({ agent, active = false, size = "sm", className }: AgentChipProps) {
  const config = AGENT_REGISTRY[agent];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border",
        size === "sm" ? "py-1 px-2.5" : "py-1.5 px-3",
        active && config.glowClass,
        className,
      )}
      style={{
        backgroundColor: `${config.color}10`,
        borderColor: `${config.color}33`,
      }}
    >
      <span
        className={cn(
          "rounded-full shrink-0",
          size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
          active && "animate-pulse",
        )}
        style={{ backgroundColor: config.color }}
      />
      <span
        className={cn(
          "font-bold tracking-wide uppercase",
          size === "sm" ? "text-[10px]" : "text-[11px]",
        )}
        style={{ color: config.colorLight }}
      >
        {config.label}
      </span>
    </div>
  );
}
