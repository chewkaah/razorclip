/**
 * ChatMessageList — from Stitch chat_interface with day divider
 */
import type { ChatMessage } from "@paperclipai/shared";
import { ChatMessageBubble } from "./ChatMessage";
import { ChatStreamingIndicator } from "./ChatStreamingIndicator";

interface ChatMessageListProps {
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
}

export function ChatMessageList({ messages, streamingContent, isStreaming }: ChatMessageListProps) {
  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-12 h-12 rounded-full bg-[#c2c1ff]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[#c2c1ff] text-2xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chat_bubble</span>
        </div>
        <p className="text-sm text-[#c7c4d7]/50">Start a conversation.</p>
        <p className="text-xs text-[#c7c4d7]/30">Type a message below or use /commands.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Day Divider — from Stitch */}
      {messages.length > 0 && (
        <div className="flex justify-center my-4">
          <span className="text-[10px] uppercase tracking-[0.1em] font-medium text-[#c7c4d7]/40 bg-[#191b22] px-3 py-1 rounded-full">
            Today
          </span>
        </div>
      )}
      {messages.map((msg) => (
        <ChatMessageBubble key={msg.id} message={msg} />
      ))}
      {isStreaming && (
        <>
          {streamingContent ? (
            <ChatMessageBubble
              message={{
                id: "__streaming__",
                threadId: "",
                companyId: "",
                role: "assistant",
                content: streamingContent,
                runId: null,
                isStreaming: true,
                error: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }}
            />
          ) : (
            <ChatStreamingIndicator />
          )}
        </>
      )}
    </div>
  );
}
