import { type ReactNode } from "react";
import { Zap } from "lucide-react";
import { cn } from "../../lib/utils";
import { AGENT_REGISTRY, type AgentSlug } from "./AgentChip";

interface SystemActionCardProps {
  /** Description of the system action */
  description: string;
  /** Agent who triggered it */
  agentSlug?: AgentSlug | null;
  /** Action button label */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * SystemActionCard — Inline system event card for ticket threads and chat.
 *
 * Design: centered card with bolt icon, description, optional action button.
 * Matches Stitch ticket_feed_comments "System Action" pattern.
 */
export function SystemActionCard({
  description,
  agentSlug,
  actionLabel = "Review",
  onAction,
  className,
}: SystemActionCardProps) {
  const config = agentSlug ? AGENT_REGISTRY[agentSlug] : null;
  const accentColor = config?.color ?? "var(--rc-primary)";

  return (
    <div className={cn("mx-4", className)}>
      <div className="bg-kt-surface-container-highest/40 border border-kt-outline-variant/10 rounded-xl p-3 flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accentColor}10` }}
        >
          <Zap className="w-4 h-4" style={{ color: config?.colorLight ?? "var(--rc-on-surface-variant)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-kt-on-surface-variant uppercase tracking-wider mb-0.5">
            System Action
          </p>
          <p className="text-sm text-kt-on-surface leading-tight truncate">{description}</p>
        </div>
        {onAction && (
          <button
            className="bg-kt-primary text-kt-on-primary px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-transform shrink-0"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
