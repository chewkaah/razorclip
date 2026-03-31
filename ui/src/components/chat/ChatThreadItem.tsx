import type { ChatThread } from "@paperclipai/shared";

interface ChatThreadItemProps {
  thread: ChatThread;
  isActive: boolean;
  onClick: () => void;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function ChatThreadItem({ thread, isActive, onClick }: ChatThreadItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl px-3 py-2.5 text-sm transition-all ${
        isActive
          ? "bg-[--rc-primary]/10 border border-[--rc-primary]/20 text-[--rc-on-surface] font-medium"
          : "text-[--rc-on-surface-variant]/70 hover:bg-white/5 border border-transparent"
      }`}
    >
      <div className="truncate text-[13px]">{thread.title}</div>
      <div className="text-[10px] text-[--rc-on-surface-variant]/40 mt-0.5 tabular-nums">{timeAgo(thread.updatedAt)}</div>
    </button>
  );
}
