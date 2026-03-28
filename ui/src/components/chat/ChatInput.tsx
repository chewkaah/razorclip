import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { ChatSlashMenu } from "./ChatSlashMenu";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSlash, setShowSlash] = useState(false);

  const slashQuery = useMemo(() => {
    const match = value.match(/^\/(\w*)$/);
    return match ? match[1]! : null;
  }, [value]);

  const isSlashActive = slashQuery !== null && !disabled;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Let slash menu handle arrow keys and enter when active
      if (isSlashActive && ["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(e.key)) {
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && value.trim()) {
          onSubmit();
        }
      }
    },
    [disabled, value, onSubmit, isSlashActive],
  );

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const handleSlashSelect = (cmd: string) => {
    onChange(cmd);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative flex items-end gap-2">
      {isSlashActive && (
        <ChatSlashMenu
          query={slashQuery}
          onSelect={handleSlashSelect}
          onClose={() => onChange("")}
        />
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Send a message... (/ for commands)"
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      />
      <Button
        size="icon"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
