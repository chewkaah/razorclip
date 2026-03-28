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
    <div className="flex h-[calc(100vh-4rem)] -m-4 md:-m-6">
      <ChatThreadSidebar
        companyId={companyId}
        activeThreadId={threadId}
        onThreadSelect={handleThreadSelect}
      />
      <div className="flex-1 min-w-0">
        {threadId ? (
          <ChatMessageArea companyId={companyId} threadId={threadId} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Select a thread or start a new conversation.
          </div>
        )}
      </div>
    </div>
  );
}
