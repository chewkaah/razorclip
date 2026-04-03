/**
 * ChatAgentSelector -- agent chip selector in the chat header.
 *
 * Lets the user pick which agent handles the current thread.
 * Persists the choice by patching thread.adapterConfig.chatAgentId.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { agentsApi } from "@/api/agents";
import { chatApi } from "@/api/chat";
import { queryKeys } from "@/lib/queryKeys";
import { AGENT_REGISTRY, type AgentSlug } from "../kinetic/AgentChip";
import { getAgentAvatar } from "../kinetic/agent-avatars";

interface ChatAgentSelectorProps {
  threadId: string;
  companyId: string;
  chatAgentId: string | undefined;
}

export function ChatAgentSelector({ threadId, companyId, chatAgentId }: ChatAgentSelectorProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
    enabled: !!companyId,
  });

  const activeAgents = (agents ?? []).filter((a) => a.status === "active");

  const currentAgent = chatAgentId
    ? activeAgents.find((a) => a.id === chatAgentId)
    : null;

  const handleSelect = async (agentId: string) => {
    setSaving(true);
    try {
      await chatApi.updateThread(threadId, {
        adapterConfig: { chatAgentId: agentId },
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.thread(threadId) });
    } catch (err) {
      console.error("Failed to switch agent:", err);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  // Derive slug from agent name for coloring
  function agentSlug(name: string): AgentSlug | null {
    const slug = name.toLowerCase().trim() as AgentSlug;
    return slug in AGENT_REGISTRY ? slug : null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={saving}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium
          bg-[--rc-surface-container-lowest]/50 border border-[--rc-outline-variant]/10
          hover:bg-[--rc-surface-container-lowest]/80 transition-colors min-h-[44px]"
      >
        {currentAgent ? (
          <>
            {(() => {
              const slug = agentSlug(currentAgent.name);
              const color = slug ? AGENT_REGISTRY[slug].color : "#888";
              return (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
              );
            })()}
            <span className="text-[--rc-on-surface] truncate max-w-[100px]">
              {currentAgent.name}
            </span>
          </>
        ) : (
          <>
            <span
              className="material-symbols-outlined text-sm text-[--rc-on-surface-variant]/50"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
            >
              smart_toy
            </span>
            <span className="text-[--rc-on-surface-variant]/50">Agent</span>
          </>
        )}
        <span
          className="material-symbols-outlined text-xs text-[--rc-on-surface-variant]/40"
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
        >
          expand_more
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            className="absolute right-0 top-full mt-1 z-50 min-w-[200px]
              bg-[--rc-surface-container] border border-[--rc-outline-variant]/10
              rounded-xl shadow-xl backdrop-blur-xl overflow-hidden"
          >
            {activeAgents.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[--rc-on-surface-variant]/50">
                No agents available
              </div>
            ) : (
              activeAgents.map((agent) => {
                const slug = agentSlug(agent.name);
                const color = slug ? AGENT_REGISTRY[slug].color : "#888";
                const avatar = getAgentAvatar(agent.name);
                const isSelected = agent.id === chatAgentId;
                return (
                  <button
                    key={agent.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(agent.id)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-xs min-h-[44px]
                      hover:bg-[--rc-primary]/5 transition-colors
                      ${isSelected ? "bg-[--rc-primary]/10" : ""}`}
                  >
                    {avatar ? (
                      <img src={avatar} alt={agent.name} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <span
                        className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {agent.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[--rc-on-surface] truncate">{agent.name}</div>
                      <div className="text-[10px] text-[--rc-on-surface-variant]/50 truncate">
                        {agent.role} &middot; {agent.adapterType}
                      </div>
                    </div>
                    {isSelected && (
                      <span
                        className="material-symbols-outlined text-sm text-[--rc-primary]"
                        style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
                      >
                        check
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
