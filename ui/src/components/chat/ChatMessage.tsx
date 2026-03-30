/**
 * ChatMessageBubble — pixel-perfect from Stitch chat_interface/code.html
 *
 * User messages: right-aligned, primary bg, rounded-tr-none
 * Agent messages: left-aligned with gradient avatar, AI AGENT badge,
 *   glass card with accent left border and glow
 */
import type { ChatMessage } from "@paperclipai/shared";
import { MarkdownBody } from "@/components/MarkdownBody";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1 max-w-[85%] ml-auto">
        <div className="bg-[#c2c1ff] text-[#1800a7] px-4 py-3 rounded-2xl rounded-tr-none text-sm font-medium shadow-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <span className="text-[10px] text-[#c7c4d7]/50 tabular-nums uppercase mr-1">
          {new Date(message.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} · Read
        </span>
      </div>
    );
  }

  // Agent message — from Stitch
  return (
    <div className="flex gap-3 max-w-[90%]">
      <div className="flex-shrink-0 mt-auto">
        <div className="w-8 h-8 rounded-full p-[1px] bg-gradient-to-br from-[#8B5CF6] to-[#D8B4FE]">
          <div className="w-full h-full rounded-full bg-[#0c0e14] flex items-center justify-center">
            <span
              className="material-symbols-outlined text-xs text-[#8B5CF6]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}
            >
              smart_toy
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B5CF6]">Agent</span>
          <span className="text-[10px] bg-[#8B5CF6]/10 text-[#8B5CF6] px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
            AI AGENT
          </span>
        </div>
        <div
          className="glass-card border-l-2 border-[#8B5CF6] px-4 py-3 rounded-2xl rounded-tl-none text-sm text-[#c7c4d7] leading-relaxed"
          style={{ boxShadow: "0 0 15px rgba(139, 92, 246, 0.15)" }}
        >
          {message.content ? (
            <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <MarkdownBody>{message.content}</MarkdownBody>
            </div>
          ) : message.isStreaming ? null : (
            <p className="text-[#c7c4d7]/50 italic">No response.</p>
          )}
          {message.error && (
            <p className="text-xs text-[#ffb4ab] mt-2">{message.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
