import type { ChatMessage } from "@paperclipai/shared";
import { ChatMessageBubble } from "./ChatMessage";
import { ChatStreamingIndicator } from "./ChatStreamingIndicator";

interface ChatMessageListProps {
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
}

export function ChatMessageList({
  messages,
  streamingContent,
  isStreaming,
}: ChatMessageListProps) {
  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <p className="text-sm">Start a conversation.</p>
        <p className="text-xs">Type a message below or use /commands.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {messages.map((msg) => (
        <ChatMessageBubble key={msg.id} message={msg} />
      ))}
      {isStreaming && (
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
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
          </div>
        </div>
      )}
    </div>
  );
}
