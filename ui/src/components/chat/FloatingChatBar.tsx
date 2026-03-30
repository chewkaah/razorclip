/**
 * FloatingChatBar — persistent chat panel for desktop (Stitch-styled)
 */
import { useCallback, useState } from "react";
import { useNavigate } from "@/lib/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/api/chat";
import { queryKeys } from "@/lib/queryKeys";
import { useCompany } from "@/context/CompanyContext";
import { ChatMessageArea } from "./ChatMessageArea";
import { ChatThreadItem } from "./ChatThreadItem";

type FloatingState = "collapsed" | "threads" | "chat";

export function FloatingChatBar() {
  const { selectedCompanyId } = useCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<FloatingState>("collapsed");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const { data: threads } = useQuery({
    queryKey: queryKeys.chat.threads(selectedCompanyId!),
    queryFn: () => chatApi.listThreads(selectedCompanyId!),
    enabled: !!selectedCompanyId && state !== "collapsed",
  });

  const handleNewThread = async () => {
    if (!selectedCompanyId) return;
    const thread = await chatApi.createThread(selectedCompanyId, { adapterType: "claude_local" });
    queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads(selectedCompanyId) });
    setActiveThreadId(thread.id);
    setState("chat");
  };

  if (state === "collapsed") {
    return (
      <button
        onClick={() => setState("threads")}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#c2c1ff] text-[#1800a7] shadow-[0_10px_25px_-5px_rgba(194,193,255,0.4)] flex items-center justify-center active:scale-90 transition-transform hover:shadow-[0_14px_30px_-5px_rgba(194,193,255,0.5)]"
        aria-label="Open chat"
      >
        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chat_bubble</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[560px] flex flex-col rounded-2xl overflow-hidden border border-[#c2c1ff]/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),0_0_40px_-10px_rgba(194,193,255,0.15)] bg-[#111319]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#191b22] border-b border-[#c2c1ff]/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#c2c1ff] text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chat_bubble</span>
          <span className="text-sm font-semibold text-[#e2e2eb] tracking-tight">{state === "chat" ? "Chat" : "Threads"}</span>
        </div>
        <div className="flex items-center gap-1">
          {state === "chat" && (
            <button onClick={() => setState("threads")} className="p-1.5 rounded-lg text-[#c7c4d7]/50 hover:text-[#c2c1ff] hover:bg-white/5 transition-all">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>arrow_back</span>
            </button>
          )}
          <button onClick={() => { if (activeThreadId) navigate(`/chat/${activeThreadId}`); else navigate("/chat"); setState("collapsed"); }} className="p-1.5 rounded-lg text-[#c7c4d7]/50 hover:text-[#c2c1ff] hover:bg-white/5 transition-all">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>open_in_full</span>
          </button>
          <button onClick={() => setState("collapsed")} className="p-1.5 rounded-lg text-[#c7c4d7]/50 hover:text-[#c2c1ff] hover:bg-white/5 transition-all">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>close</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {state === "threads" && (
          <div className="flex-1 flex flex-col">
            <div className="p-3">
              <button onClick={handleNewThread} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#c2c1ff]/10 border border-[#c2c1ff]/20 text-[#c2c1ff] text-xs font-bold uppercase tracking-wider hover:bg-[#c2c1ff]/20 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>add</span>
                New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-2 space-y-0.5">
              {threads?.map((thread) => (
                <ChatThreadItem key={thread.id} thread={thread} isActive={thread.id === activeThreadId} onClick={() => { setActiveThreadId(thread.id); setState("chat"); }} />
              ))}
              {threads?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <span className="material-symbols-outlined text-[#c2c1ff]/20 text-3xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chat_bubble</span>
                  <p className="text-xs text-[#c7c4d7]/40">No conversations yet</p>
                </div>
              )}
            </div>
          </div>
        )}
        {state === "chat" && activeThreadId && selectedCompanyId && (
          <ChatMessageArea companyId={selectedCompanyId} threadId={activeThreadId} />
        )}
        {state === "chat" && !activeThreadId && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-[#c7c4d7]/40">Select or create a thread</p>
          </div>
        )}
      </div>
    </div>
  );
}
