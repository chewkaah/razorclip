import { cn } from "../../lib/utils";
import { type AgentSlug, AGENT_REGISTRY } from "./AgentChip";

interface AgentAvatarProps {
  agent: AgentSlug;
  /** Image URL for avatar (falls back to initial) */
  src?: string;
  size?: "sm" | "md" | "lg";
  /** Show gradient status ring */
  showRing?: boolean;
  /** Show label below avatar */
  showLabel?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { outer: "w-10 h-10", inner: "w-8 h-8", text: "text-xs" },
  md: { outer: "w-16 h-16", inner: "w-14 h-14", text: "text-sm" },
  lg: { outer: "w-20 h-20", inner: "w-[72px] h-[72px]", text: "text-base" },
};

/**
 * AgentAvatar — Circular avatar with gradient ring (Instagram stories style).
 *
 * Design: outer gradient ring using agent colors, inner bg-surface gap, avatar inside.
 */
export function AgentAvatar({
  agent,
  src,
  size = "md",
  showRing = true,
  showLabel = false,
  className,
}: AgentAvatarProps) {
  const config = AGENT_REGISTRY[agent];
  const s = sizeMap[size];

  return (
    <div className={cn("flex flex-col items-center gap-2 shrink-0", className)}>
      <div
        className={cn(
          "relative rounded-full p-[3px]",
          showRing ? `bg-gradient-to-br ${config.gradient}` : "bg-transparent",
          s.outer,
        )}
      >
        <div className="bg-kt-surface rounded-full p-[2px] w-full h-full">
          <div className={cn("rounded-full overflow-hidden flex items-center justify-center w-full h-full", !src && "bg-kt-surface-container-high")}>
            {src ? (
              <img src={src} alt={config.label} className="w-full h-full object-cover" />
            ) : (
              <span className={cn("font-bold", s.text)} style={{ color: config.color }}>
                {config.label[0]}
              </span>
            )}
          </div>
        </div>
      </div>
      {showLabel && (
        <span
          className="text-[10px] font-bold tracking-widest uppercase"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}
