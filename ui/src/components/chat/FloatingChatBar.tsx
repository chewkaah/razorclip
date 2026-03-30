/**
 * FloatingChatBar — persistent agent-aware chat panel
 */
import { useCallback, useState } from "react";
import { useNavigate } from "@/lib/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/api/chat";
import { agentsApi } from "@/api/agents";
import { queryKeys } from "@/lib/queryKeys";
import { useCompany } from "@/context/CompanyContext";
import { cn, agentUrl } from "@/lib/utils";
import { ChatMessageArea } from "./ChatMessageArea";
import { ChatThreadItem } from "./ChatThreadItem";
import { AGENT_REGISTRY, type AgentSlug } from "../kinetic/AgentChip";
import { getAgentAvatar } from "../kinetic/agent-avatars";
import type { Agent } from "@paperclipai/shared";

type FloatingState = "collapsed" | "agents" | "threads" | "chat";

function resolveSlug(name: string): AgentSlug | null {
  const s = name.toLowerCase().trim();
  return s in AGENT_REGISTRY ? (s as AgentSlug) : null;
}

export function FloatingChatBar() {
  const { selectedCompanyId } = useCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<FloatingState>("collapsed");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const { data: threads } = useQuery({
    queryKey: queryKeys.chat.threads(selectedCompanyId!),
    queryFn: () => chatApi.listThreads(selectedCompanyId!),
    enabled: !!selectedCompanyId && state !== "collapsed",
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && (state === "agents" || state === "threads"),
  });

  const handleNewThread = async (agent?: Agent) => {
    if (!selectedCompanyId) return;
    const thread = await chatApi.createThread(selectedCompanyId, {
      adapterType: agent?.adapterType ?? "claude_local",
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads(selectedCompanyId) });
    setActiveThreadId(thread.id);
    setSelectedAgent(agent ?? null);
    setState("chat");
  };

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    handleNewThread(agent);
  };

  // Collapsed — FAB
  if (state === "collapsed") {
    return (
      <button
        onClick={() => setState("agents")}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[--rc-primary] text-[--rc-on-primary] shadow-[0_10px_25px_-5px_rgba(194,193,255,0.4)] flex items-center justify-center active:scale-90 transition-transform hover:shadow-[0_14px_30px_-5px_rgba(194,193,255,0.5)]"
        aria-label="Open chat"
      >
        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chat_bubble</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[580px] flex flex-col rounded-2xl overflow-hidden border border-[--rc-primary]/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),0_0_40px_-10px_rgba(194,193,255,0.15)] bg-[--rc-surface]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[--rc-surface-container-low] border-b border-[--rc-primary]/10">
        <div className="flex items-center gap-2">
          {selectedAgent && state === "chat" ? (
            <>
              {/* Show selected agent */}
              <div className="w-6 h-6 rounded-full overflow-hidden border border-[--rc-primary]/20">
                {(() => {
                  const slug = resolveSlug(selectedAgent.name);
                  const avatar = slug ? getAgentAvatar(slug) : null;
                  const config = slug ? AGENT_REGISTRY[slug] : null;
                  return avatar ? (
                    <img src={avatar} className="w-full h-full object-cover" alt={selectedAgent.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: `${config?.color ?? "#c2c1ff"}20`, color: config?.color ?? "#c2c1ff" }}>{selectedAgent.name[0]}</div>
                  );
                })()}
              </div>
              <span className="text-sm font-semibold text-[--rc-on-surface] tracking-tight">{selectedAgent.name}</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[--rc-primary] text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chat_bubble</span>
              <span className="text-sm font-semibold text-[--rc-on-surface] tracking-tight">
                {state === "agents" ? "Choose Agent" : state === "threads" ? "Threads" : "Chat"}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {state === "chat" && (
            <button onClick={() => { setState("agents"); setSelectedAgent(null); }} className="p-1.5 rounded-lg text-[--rc-on-surface-variant]/50 hover:text-[--rc-primary] hover:bg-[--rc-primary]/5 transition-all">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>arrow_back</span>
            </button>
          )}
          {state === "threads" && (
            <button onClick={() => setState("agents")} className="p-1.5 rounded-lg text-[--rc-on-surface-variant]/50 hover:text-[--rc-primary] hover:bg-[--rc-primary]/5 transition-all">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>arrow_back</span>
            </button>
          )}
          <button onClick={() => { if (activeThreadId) navigate(`/chat/${activeThreadId}`); else navigate("/chat"); setState("collapsed"); }} className="p-1.5 rounded-lg text-[--rc-on-surface-variant]/50 hover:text-[--rc-primary] hover:bg-[--rc-primary]/5 transition-all">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>open_in_full</span>
          </button>
          <button onClick={() => { setState("collapsed"); setSelectedAgent(null); }} className="p-1.5 rounded-lg text-[--rc-on-surface-variant]/50 hover:text-[--rc-primary] hover:bg-[--rc-primary]/5 transition-all">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>close</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {/* Agent Selection */}
        {state === "agents" && (
          <div className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto no-scrollbar">
            <p className="text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant]/50 font-bold">Talk to an agent</p>
            <div className="grid grid-cols-2 gap-2">
              {(agents ?? []).filter((a: Agent) => a.status !== "terminated").sort((a: Agent, b: Agent) => a.name.localeCompare(b.name)).map((agent: Agent) => {
                const slug = resolveSlug(agent.name);
                const config = slug ? AGENT_REGISTRY[slug] : null;
                const avatar = slug ? getAgentAvatar(slug) : null;
                const isActive = agent.status === "running" || agent.status === "idle" || agent.status === "active";
                return (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[--rc-glass-border] hover:border-[--rc-primary]/20 hover:bg-[--rc-primary]/5 transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border shrink-0" style={{ borderColor: `${config?.color ?? "#c7c4d7"}40` }}>
                      {avatar ? (
                        <img src={avatar} className="w-full h-full object-cover" alt={agent.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: `${config?.color ?? "#c2c1ff"}15`, color: config?.color ?? "#c2c1ff" }}>{agent.name[0]}</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[--rc-on-surface] truncate">{agent.name}</p>
                      <div className="flex items-center gap-1">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isActive ? "bg-emerald-500" : agent.status === "error" ? "bg-[#ffb4ab]" : "bg-[--rc-outline-variant]")} />
                        <span className="text-[9px] text-[--rc-on-surface-variant]/50 uppercase truncate">{agent.status}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Recent threads */}
            {threads && threads.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant]/50 font-bold mt-4">Recent threads</p>
                {threads.slice(0, 5).map((thread) => (
                  <ChatThreadItem key={thread.id} thread={thread} isActive={thread.id === activeThreadId} onClick={() => { setActiveThreadId(thread.id); setState("chat"); }} />
                ))}
              </>
            )}
          </div>
        )}

        {/* Thread list */}
        {state === "threads" && (
          <div className="flex-1 flex flex-col">
            <div className="p-3">
              <button onClick={() => handleNewThread()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[--rc-primary]/10 border border-[--rc-primary]/20 text-[--rc-primary] text-xs font-bold uppercase tracking-wider hover:bg-[--rc-primary]/20 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>add</span>
                New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-2 space-y-0.5">
              {threads?.map((thread) => (
                <ChatThreadItem key={thread.id} thread={thread} isActive={thread.id === activeThreadId} onClick={() => { setActiveThreadId(thread.id); setState("chat"); }} />
              ))}
              {(!threads || threads.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <span className="material-symbols-outlined text-[--rc-primary]/20 text-3xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chat_bubble</span>
                  <p className="text-xs text-[--rc-on-surface-variant]/40">No conversations yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active chat */}
        {state === "chat" && activeThreadId && selectedCompanyId && (
          <ChatMessageArea companyId={selectedCompanyId} threadId={activeThreadId} />
        )}
        {state === "chat" && !activeThreadId && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-[--rc-on-surface-variant]/40">Select an agent to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
