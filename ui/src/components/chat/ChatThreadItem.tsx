import type { ChatThread } from "@paperclipai/shared";
import { cn } from "@/lib/utils";

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
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function ChatThreadItem({ thread, isActive, onClick }: ChatThreadItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md px-3 py-2 text-sm transition-colors",
        "hover:bg-accent",
        isActive && "bg-accent font-medium",
      )}
    >
      <div className="truncate">{thread.title}</div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {timeAgo(thread.updatedAt)}
      </div>
    </button>
  );
}
