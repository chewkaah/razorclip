import { useCallback, useState } from "react";
import { useNavigate } from "@/lib/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, X, Minus, Plus, Maximize2 } from "lucide-react";
import { chatApi } from "@/api/chat";
import { queryKeys } from "@/lib/queryKeys";
import { useCompany } from "@/context/CompanyContext";
import { cn } from "@/lib/utils";
import { ChatMessageArea } from "./ChatMessageArea";
import { ChatThreadItem } from "./ChatThreadItem";

type FloatingState = "collapsed" | "threads" | "chat";

/**
 * FloatingChatBar — Persistent chat panel for desktop.
 *
 * Three states:
 * - collapsed: just a FAB in the bottom-right
 * - threads: expanded panel showing thread list
 * - chat: expanded panel showing active chat thread
 *
 * Renders at the Layout level, persists across page navigation.
 */
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
    const thread = await chatApi.createThread(selectedCompanyId, {
      adapterType: "claude_local",
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads(selectedCompanyId) });
    setActiveThreadId(thread.id);
    setState("chat");
  };

  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    setState("chat");
  };

  const handleExpand = () => {
    // Navigate to full chat page
    if (activeThreadId) {
      navigate(`/chat/${activeThreadId}`);
    } else {
      navigate("/chat");
    }
    setState("collapsed");
  };

  // Collapsed — just the FAB
  if (state === "collapsed") {
    return (
      <button
        onClick={() => setState("threads")}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-kt-primary text-kt-on-primary shadow-[0_10px_25px_-5px_rgba(194,193,255,0.4)] flex items-center justify-center active:scale-90 transition-transform hover:shadow-[0_14px_30px_-5px_rgba(194,193,255,0.5)]"
        aria-label="Open chat"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  // Expanded panel
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[560px] flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),0_0_40px_-10px_rgba(194,193,255,0.15)] kt-page">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-kt-surface-container-low border-b border-white/5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-kt-primary" />
          <span className="text-sm font-semibold text-kt-on-surface tracking-tight">
            {state === "chat" ? "Chat" : "Threads"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {state === "chat" && (
            <button
              onClick={() => setState("threads")}
              className="p-1.5 rounded-lg text-kt-on-surface-variant/50 hover:text-kt-primary hover:bg-white/5 transition-all"
              aria-label="Back to threads"
            >
              <Minus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleExpand}
            className="p-1.5 rounded-lg text-kt-on-surface-variant/50 hover:text-kt-primary hover:bg-white/5 transition-all"
            aria-label="Expand to full page"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setState("collapsed")}
            className="p-1.5 rounded-lg text-kt-on-surface-variant/50 hover:text-kt-primary hover:bg-white/5 transition-all"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col bg-kt-surface">
        {state === "threads" && (
          <div className="flex-1 flex flex-col">
            {/* New thread button */}
            <div className="p-3">
              <button
                onClick={handleNewThread}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-kt-primary/10 border border-kt-primary/20 text-kt-primary text-xs font-bold uppercase tracking-wider hover:bg-kt-primary/20 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </button>
            </div>
            {/* Thread list */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-2 space-y-0.5">
              {threads?.map((thread) => (
                <ChatThreadItem
                  key={thread.id}
                  thread={thread}
                  isActive={thread.id === activeThreadId}
                  onClick={() => handleSelectThread(thread.id)}
                />
              ))}
              {threads?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-10 h-10 rounded-full bg-kt-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-kt-primary/50" />
                  </div>
                  <p className="text-xs text-kt-on-surface-variant/40">
                    No conversations yet
                  </p>
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
            <p className="text-xs text-kt-on-surface-variant/40">Select or create a thread</p>
          </div>
        )}
      </div>
    </div>
  );
}
