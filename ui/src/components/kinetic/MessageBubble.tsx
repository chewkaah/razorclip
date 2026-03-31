import { type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { AGENT_REGISTRY, type AgentSlug } from "./AgentChip";

type MessageVariant = "agent" | "user" | "system";

interface MessageBubbleProps {
  variant: MessageVariant;
  /** Agent slug for accent coloring (agent variant only) */
  agentSlug?: AgentSlug | null;
  /** Sender name */
  name: string;
  /** Badge label (e.g. "AGENT", "SYSTEMS", "ME") */
  badge?: string;
  /** Timestamp string */
  time?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** For threaded/indented replies */
  indented?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * MessageBubble — Kinetic Terminal comment/message component.
 *
 * Three variants:
 * - agent: left-aligned, glass card with colored left border, agent badge
 * - user: right-aligned, primary tinted background, "ME" badge
 * - system: centered action card
 */
export function MessageBubble({
  variant,
  agentSlug,
  name,
  badge,
  time,
  avatarUrl,
  indented = false,
  children,
  className,
}: MessageBubbleProps) {
  const config = agentSlug ? AGENT_REGISTRY[agentSlug] : null;
  const accentColor = config?.color ?? "var(--rc-primary)";

  if (variant === "user") {
    return (
      <div className={cn("flex flex-row-reverse gap-3", indented && "ml-8", className)}>
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-kt-primary-container flex items-center justify-center text-[11px] font-black text-kt-on-primary">
          ME
        </div>
        <div className="flex-1 space-y-1.5 text-right">
          {/* Header */}
          <div className="flex items-center gap-2 justify-end">
            {time && <span className="text-[10px] text-kt-on-surface-variant/60 tabular-nums">{time}</span>}
            <span className="text-sm font-bold text-kt-primary uppercase tracking-wider">{name}</span>
          </div>
          {/* Body */}
          <div className="bg-kt-primary/10 backdrop-blur-md rounded-xl p-3 border border-kt-primary/20 inline-block text-left max-w-[85%]">
            <div className="text-sm leading-relaxed text-[#e2dfff]">{children}</div>
          </div>
        </div>
      </div>
    );
  }

  // Agent variant
  return (
    <div
      className={cn(
        "flex gap-3",
        indented && "ml-8 border-l border-kt-outline-variant/20 pl-4",
        className,
      )}
    >
      {/* Agent Avatar */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 border overflow-hidden"
        style={{ borderColor: `${accentColor}33` }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-[11px] font-bold"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
          >
            {name[0]}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-1.5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-kt-on-surface uppercase tracking-wider">{name}</span>
          {time && <span className="text-[10px] text-kt-on-surface-variant/60 tabular-nums">{time}</span>}
          {badge && (
            <div
              className="px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: `${accentColor}10`,
                borderColor: `${accentColor}33`,
              }}
            >
              <span
                className="text-[9px] font-bold uppercase tracking-tighter"
                style={{ color: config?.colorLight ?? "var(--rc-on-surface-variant)" }}
              >
                {badge}
              </span>
            </div>
          )}
        </div>
        {/* Body */}
        <div
          className="bg-kt-surface-container-high/60 backdrop-blur-md rounded-xl p-3 border-l-4"
          style={{ borderLeftColor: accentColor }}
        >
          <div className="text-sm leading-relaxed text-kt-on-surface-variant">{children}</div>
        </div>
      </div>
    </div>
  );
}
