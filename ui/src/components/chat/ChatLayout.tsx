/**
 * ChatLayout — thread sidebar + message canvas + context panel
 *
 * Mobile (< md): full-screen chat, no thread sidebar visible.
 * Desktop (>= md): sidebar + message area side by side.
 * Large (>= lg): sidebar + message area + agent context panel.
 */
import { useCallback } from "react";
import { useNavigate } from "@/lib/router";
import { ChatThreadSidebar } from "./ChatThreadSidebar";
import { ChatMessageArea } from "./ChatMessageArea";
import { ChatContextPanel } from "./ChatContextPanel";
import { chatApi } from "@/api/chat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

interface ChatLayoutProps {
  companyId: string;
  threadId: string | undefined;
}

export function ChatLayout({ companyId, threadId }: ChatLayoutProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const handleThreadSelect = useCallback((id: string) => { navigate(`/chat/${id}`); }, [navigate]);

  const { data: activeThread } = useQuery({
    queryKey: queryKeys.chat.thread(threadId ?? "__none__"),
    queryFn: () => chatApi.getThread(threadId!),
    enabled: !!threadId,
  });

  const handleNewMobileThread = useCallback(async () => {
    const thread = await chatApi.createThread(companyId, { adapterType: "claude_local" });
    queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads(companyId) });
    navigate(`/chat/${thread.id}`);
  }, [companyId, navigate, queryClient]);

  return (
    <div className="flex h-[calc(100dvh-4rem)] -m-4 md:-m-8 bg-[--rc-surface]">
      {/* Thread sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <ChatThreadSidebar companyId={companyId} activeThreadId={threadId} onThreadSelect={handleThreadSelect} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        {threadId ? (
          <ChatMessageArea companyId={companyId} threadId={threadId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 bg-[--rc-surface] px-4">
            <div className="w-12 h-12 rounded-full bg-[--rc-primary]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[--rc-primary] text-2xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chat_bubble</span>
            </div>
            <p className="text-sm text-[--rc-on-surface-variant]/50 text-center">
              <span className="hidden md:inline">Select a thread or start a new conversation.</span>
              <span className="md:hidden">Start a new conversation.</span>
            </p>
            <button
              onClick={handleNewMobileThread}
              className="md:hidden flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[--rc-primary]/10 border border-[--rc-primary]/20 text-[--rc-primary] text-xs font-bold uppercase tracking-wider hover:bg-[--rc-primary]/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>add</span>
              New Chat
            </button>
          </div>
        )}
      </div>
      {/* Context panel — agent profile, lg+ only */}
      <div className="hidden lg:block w-[320px] shrink-0">
        <ChatContextPanel companyId={companyId} thread={activeThread ?? null} />
      </div>
      {/* Swipe sidebar visual cue — from Stitch (desktop only, hidden on lg when context panel shows) */}
      <div className="hidden md:block lg:hidden fixed top-20 right-0 h-2/3 w-1.5 bg-[--rc-primary]/20 rounded-l-full" />
    </div>
  );
}
