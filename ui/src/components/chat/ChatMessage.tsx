import type { ChatMessage } from "@paperclipai/shared";
import { cn } from "@/lib/utils";
import { MarkdownBody } from "@/components/MarkdownBody";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted",
          message.error && "border border-destructive/30",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {message.content ? (
              <MarkdownBody>{message.content}</MarkdownBody>
            ) : message.isStreaming ? null : (
              <p className="text-muted-foreground italic">No response.</p>
            )}
          </div>
        )}
        {message.error && (
          <p className="text-xs text-destructive mt-1">{message.error}</p>
        )}
      </div>
    </div>
  );
}
