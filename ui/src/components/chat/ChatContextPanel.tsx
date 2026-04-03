/**
 * ChatContextPanel -- right-side context panel showing the thread's assigned agent profile.
 *
 * Only rendered on lg+ breakpoints via the parent ChatLayout.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/lib/router";
import { agentsApi } from "@/api/agents";
import { queryKeys } from "@/lib/queryKeys";
import { AGENT_REGISTRY, type AgentSlug } from "../kinetic/AgentChip";
import { getAgentAvatar } from "../kinetic/agent-avatars";

interface ChatContextPanelProps {
  companyId: string;
  thread: {
    id: string;
    adapterType: string;
    adapterConfig: Record<string, unknown>;
    model?: string | null;
  } | null;
}

function agentSlug(name: string): AgentSlug | null {
  const slug = name.toLowerCase().trim() as AgentSlug;
  return slug in AGENT_REGISTRY ? slug : null;
}

export function ChatContextPanel({ companyId, thread }: ChatContextPanelProps) {
  const chatAgentId = thread?.adapterConfig?.chatAgentId as string | undefined;

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
  });

  const agent = chatAgentId
    ? (agents ?? []).find((a) => a.id === chatAgentId)
    : null;

  const slug = agent ? agentSlug(agent.name) : null;
  const config = slug ? AGENT_REGISTRY[slug] : null;
  const accentColor = config?.color ?? "#888";
  const avatar = agent ? getAgentAvatar(agent.name) : null;

  return (
    <div className="h-full flex flex-col bg-[--rc-surface-container-lowest]/50 border-l border-[--rc-outline-variant]/10 backdrop-blur-xl">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-[--rc-outline-variant]/5">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[--rc-on-surface-variant]/40">
          Agent Context
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar">
        {agent ? (
          <div className="flex flex-col items-center gap-5">
            {/* Avatar */}
            <div
              className="relative w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              {avatar ? (
                <img src={avatar} alt={agent.name} className="w-full h-full object-cover" />
              ) : (
                <span
                  className="text-2xl font-bold"
                  style={{ color: accentColor }}
                >
                  {agent.name.charAt(0).toUpperCase()}
                </span>
              )}
              {/* Status indicator */}
              <span
                className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-[--rc-surface-container-lowest] ${
                  agent.status === "active" ? "bg-emerald-400" : "bg-zinc-500"
                }`}
              />
            </div>

            {/* Name + role */}
            <div className="text-center space-y-1">
              <h4 className="text-sm font-semibold text-[--rc-on-surface] tracking-tight">
                {agent.name}
              </h4>
              {agent.title && (
                <p className="text-xs text-[--rc-on-surface-variant]/60">{agent.title}</p>
              )}
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                {agent.role}
              </div>
            </div>

            {/* Quick stats */}
            <div className="w-full space-y-2 mt-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[--rc-on-surface-variant]/30 mb-2">
                Quick Stats
              </div>
              <StatRow label="Status" value={agent.status} color={agent.status === "active" ? "#10B981" : "#888"} />
              <StatRow label="Adapter" value={agent.adapterType} />
              <StatRow label="Model" value={(thread?.model as string) ?? "default"} />
            </div>

            {/* View profile link */}
            <Link
              to={`/agents/${agent.id}/profile`}
              className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl
                bg-[--rc-primary]/10 border border-[--rc-primary]/15
                text-[--rc-primary] text-xs font-bold uppercase tracking-wider
                hover:bg-[--rc-primary]/20 active:scale-[0.98] transition-all"
            >
              <span
                className="material-symbols-outlined text-sm"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
              >
                person
              </span>
              View Profile
            </Link>
          </div>
        ) : (
          /* No agent assigned placeholder */
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div
              className="w-14 h-14 rounded-2xl bg-[--rc-on-surface-variant]/5 flex items-center justify-center"
            >
              <span
                className="material-symbols-outlined text-2xl text-[--rc-on-surface-variant]/20"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}
              >
                smart_toy
              </span>
            </div>
            <p className="text-xs text-[--rc-on-surface-variant]/40 max-w-[200px] leading-relaxed">
              Start chatting to assign an agent
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[--rc-surface-container-lowest]/30">
      <span className="text-[10px] text-[--rc-on-surface-variant]/40 uppercase tracking-wider font-medium">
        {label}
      </span>
      <span
        className="text-[11px] font-medium"
        style={{ color: color ?? "var(--rc-on-surface-variant)" }}
      >
        {value}
      </span>
    </div>
  );
}
