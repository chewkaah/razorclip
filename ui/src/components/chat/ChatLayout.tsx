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

  const handleThreadSelect = useCallback(
    (id: string) => {
      navigate(`/chat/${id}`);
    },
    [navigate],
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 md:-m-6 kt-page">
      <ChatThreadSidebar
        companyId={companyId}
        activeThreadId={threadId}
        onThreadSelect={handleThreadSelect}
      />
      <div className="flex-1 min-w-0">
        {threadId ? (
          <ChatMessageArea companyId={companyId} threadId={threadId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 rounded-full bg-kt-primary/10 flex items-center justify-center">
              <span className="text-kt-primary text-lg">💬</span>
            </div>
            <p className="text-sm text-kt-on-surface-variant/50">
              Select a thread or start a new conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
