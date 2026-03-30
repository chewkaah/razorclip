/**
 * ChatLayout — thread sidebar + message canvas
 */
import { useCallback } from "react";
import { useNavigate } from "@/lib/router";
import { ChatThreadSidebar } from "./ChatThreadSidebar";
import { ChatMessageArea } from "./ChatMessageArea";

interface ChatLayoutProps {
  companyId: string;
  threadId: string | undefined;
}

export function ChatLayout({ companyId, threadId }: ChatLayoutProps) {
  const navigate = useNavigate();
  const handleThreadSelect = useCallback((id: string) => { navigate(`/chat/${id}`); }, [navigate]);

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8 bg-[#111319]">
      <ChatThreadSidebar companyId={companyId} activeThreadId={threadId} onThreadSelect={handleThreadSelect} />
      <div className="flex-1 min-w-0">
        {threadId ? (
          <ChatMessageArea companyId={companyId} threadId={threadId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 bg-[#111319]">
            <div className="w-12 h-12 rounded-full bg-[#c2c1ff]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#c2c1ff] text-2xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chat_bubble</span>
            </div>
            <p className="text-sm text-[#c7c4d7]/50">Select a thread or start a new conversation.</p>
          </div>
        )}
      </div>
      {/* Swipe sidebar visual cue — from Stitch */}
      <div className="fixed top-20 right-0 h-2/3 w-1.5 bg-[#c2c1ff]/20 rounded-l-full" />
    </div>
  );
}
