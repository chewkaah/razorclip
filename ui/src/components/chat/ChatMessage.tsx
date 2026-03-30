import type { ChatMessage } from "@paperclipai/shared";
import { cn } from "@/lib/utils";
import { MarkdownBody } from "@/components/MarkdownBody";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

/**
 * ChatMessageBubble — Kinetic Terminal styled message bubble.
 *
 * User messages: right-aligned, primary accent background
 * Assistant messages: left-aligned, glass card with lavender left border
 */
export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-kt-primary text-kt-on-primary px-4 py-3 rounded-2xl rounded-tr-none text-sm shadow-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex gap-3">
      {/* Agent avatar */}
      <div className="w-8 h-8 rounded-full p-[1px] bg-gradient-to-br from-[#8B5CF6] to-[#D8B4FE] shrink-0 mt-auto">
        <div className="w-full h-full rounded-full bg-kt-surface-container-lowest flex items-center justify-center">
          <span className="text-[10px] font-bold text-[#8B5CF6]">AI</span>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Agent label */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B5CF6]">Agent</span>
          <span className="text-[10px] bg-[#8B5CF6]/10 text-[#8B5CF6] px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
            AI
          </span>
        </div>

        {/* Message body */}
        <div
          className={cn(
            "glass-card-subtle border-l-2 border-[#8B5CF6] px-4 py-3 rounded-2xl rounded-tl-none text-sm leading-relaxed agent-glow-dante",
            message.error && "border-l-kt-danger",
          )}
        >
          {message.content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-kt-on-surface-variant">
              <MarkdownBody>{message.content}</MarkdownBody>
            </div>
          ) : message.isStreaming ? null : (
            <p className="text-kt-on-surface-variant/50 italic">No response.</p>
          )}
          {message.error && (
            <p className="text-xs text-kt-danger mt-2">{message.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
