/**
 * ChatMessageArea — from Stitch chat_interface main canvas
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/api/chat";
import { queryKeys } from "@/lib/queryKeys";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { ChatAdapterSelector } from "./ChatAdapterSelector";
import { useChatStream } from "@/hooks/useChatStream";

interface ChatMessageAreaProps {
  companyId: string;
  threadId: string;
}

export function ChatMessageArea({ companyId, threadId }: ChatMessageAreaProps) {
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const { data: thread } = useQuery({
    queryKey: queryKeys.chat.thread(threadId),
    queryFn: () => chatApi.getThread(threadId),
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: queryKeys.chat.messages(threadId),
    queryFn: () => chatApi.listMessages(threadId),
  });

  const scrollToBottom = useCallback(() => {
    if (isAtBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useChatStream({
    companyId,
    activeRunId,
    onChunk: useCallback((text: string) => { setStreamingContent((prev) => prev + text); scrollToBottom(); }, [scrollToBottom]),
    onComplete: useCallback(() => { setActiveRunId(null); setStreamingContent(""); refetchMessages(); queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads(companyId) }); }, [refetchMessages, queryClient, companyId]),
    onError: useCallback(() => { setActiveRunId(null); setStreamingContent(""); refetchMessages(); }, [refetchMessages]),
  });

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSubmit = async () => {
    const content = inputValue.trim();
    if (!content || isSubmitting) return;
    setInputValue("");
    setIsSubmitting(true);
    try {
      const result = await chatApi.sendMessage(threadId, { content });
      setActiveRunId(result.runId);
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads(companyId) });
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  };

  return (
    <div className="flex flex-col h-full bg-[#111319]">
      {/* Header — from Stitch */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-[#111319]/80 backdrop-blur-xl min-h-[3rem]">
        <h2 className="text-sm font-semibold text-[#e2e2eb] truncate tracking-tight">
          {thread?.title ?? "Chat"}
        </h2>
        {thread && (
          <ChatAdapterSelector threadId={threadId} adapterType={thread.adapterType} model={thread.model} companyId={companyId} />
        )}
      </div>

      {/* Messages — full canvas from Stitch */}
      <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar" onScroll={handleScroll}>
        <ChatMessageList messages={messages ?? []} streamingContent={streamingContent} isStreaming={!!activeRunId} />
        <div ref={bottomRef} />
      </div>

      {/* Input — from Stitch */}
      <div className="px-4 pb-6 pt-3 bg-[#111319]/90 backdrop-blur-2xl border-t border-[#464554]/10">
        <ChatInput value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} disabled={isSubmitting || !!activeRunId} />
      </div>
    </div>
  );
}
