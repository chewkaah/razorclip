import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { chatApi } from "@/api/chat";
import { queryKeys } from "@/lib/queryKeys";
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
    <div className="w-64 border-r border-white/5 flex flex-col h-full bg-kt-surface-container-low/50">
      <div className="p-3 border-b border-white/5">
        <button
          onClick={handleNewThread}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-kt-primary/10 border border-kt-primary/20 text-kt-primary text-xs font-bold uppercase tracking-wider hover:bg-kt-primary/20 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-0.5">
        {threads?.map((thread) => (
          <ChatThreadItem
            key={thread.id}
            thread={thread}
            isActive={thread.id === activeThreadId}
            onClick={() => onThreadSelect(thread.id)}
          />
        ))}
        {threads?.length === 0 && (
          <p className="text-xs text-kt-on-surface-variant/40 text-center py-8">
            No conversations yet.
          </p>
        )}
      </div>
    </div>
  );
}
