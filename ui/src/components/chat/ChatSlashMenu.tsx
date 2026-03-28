import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SLASH_COMMANDS = [
  { cmd: "/tasks", description: "Show active tasks" },
  { cmd: "/agents", description: "List agents and status" },
  { cmd: "/projects", description: "List projects" },
  { cmd: "/dashboard", description: "Workspace dashboard" },
  { cmd: "/costs", description: "Cost breakdown" },
  { cmd: "/activity", description: "Recent activity" },
  { cmd: "/blocked", description: "Show blocked tasks" },
  { cmd: "/help", description: "Available commands" },
] as const;

interface ChatSlashMenuProps {
  query: string;
  onSelect: (cmd: string) => void;
  onClose: () => void;
}

export function ChatSlashMenu({ query, onSelect, onClose }: ChatSlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = SLASH_COMMANDS.filter((c) =>
    c.cmd.startsWith(`/${query}`),
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        onSelect(filtered[selectedIndex].cmd + " ");
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, selectedIndex, onSelect, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-1 w-64 rounded-md border bg-popover p-1 shadow-md">
      {filtered.map((cmd, i) => (
        <button
          key={cmd.cmd}
          onClick={() => onSelect(cmd.cmd + " ")}
          className={cn(
            "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm",
            i === selectedIndex && "bg-accent",
          )}
        >
          <span className="font-mono text-xs">{cmd.cmd}</span>
          <span className="text-xs text-muted-foreground">{cmd.description}</span>
        </button>
      ))}
    </div>
  );
}
