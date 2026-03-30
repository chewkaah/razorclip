/**
 * ChatThreadSidebar — Razorclip-styled thread list
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { chatApi } from "@/api/chat";
import { queryKeys } from "@/lib/queryKeys";
import { ChatThreadItem } from "./ChatThreadItem";

interface ChatThreadSidebarProps {
  companyId: string;
  activeThreadId: string | undefined;
  onThreadSelect: (threadId: string) => void;
}

export function ChatThreadSidebar({ companyId, activeThreadId, onThreadSelect }: ChatThreadSidebarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: threads } = useQuery({
    queryKey: queryKeys.chat.threads(companyId),
    queryFn: () => chatApi.listThreads(companyId),
  });

  const handleNewThread = async () => {
    const thread = await chatApi.createThread(companyId, { adapterType: "claude_local" });
    queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads(companyId) });
    navigate(`/chat/${thread.id}`);
  };

  return (
    <div className="w-64 border-r border-[#c2c1ff]/10 flex flex-col h-full bg-[#0c0e14]/50 shrink-0">
      <div className="p-3 border-b border-[#c2c1ff]/10">
        <button
          onClick={handleNewThread}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#c2c1ff]/10 border border-[#c2c1ff]/20 text-[#c2c1ff] text-xs font-bold uppercase tracking-wider hover:bg-[#c2c1ff]/20 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>add</span>
          New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-0.5">
        {threads?.map((thread) => (
          <ChatThreadItem key={thread.id} thread={thread} isActive={thread.id === activeThreadId} onClick={() => onThreadSelect(thread.id)} />
        ))}
        {threads?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <span className="material-symbols-outlined text-[#c2c1ff]/20 text-3xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chat_bubble</span>
            <p className="text-xs text-[#c7c4d7]/40">No conversations yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
