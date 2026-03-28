import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { chatApi } from "@/api/chat";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";
import { ChatThreadItem } from "./ChatThreadItem";

interface ChatThreadSidebarProps {
  companyId: string;
  activeThreadId: string | undefined;
  onThreadSelect: (threadId: string) => void;
}

export function ChatThreadSidebar({
  companyId,
  activeThreadId,
  onThreadSelect,
}: ChatThreadSidebarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: threads } = useQuery({
    queryKey: queryKeys.chat.threads(companyId),
    queryFn: () => chatApi.listThreads(companyId),
  });

  const handleNewThread = async () => {
    const thread = await chatApi.createThread(companyId, {
      adapterType: "claude_local",
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads(companyId) });
    navigate(`/chat/${thread.id}`);
  };

  return (
    <div className="w-64 border-r flex flex-col h-full bg-muted/30">
      <div className="p-3 border-b">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleNewThread}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {threads?.map((thread) => (
            <ChatThreadItem
              key={thread.id}
              thread={thread}
              isActive={thread.id === activeThreadId}
              onClick={() => onThreadSelect(thread.id)}
            />
          ))}
          {threads?.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No conversations yet.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
