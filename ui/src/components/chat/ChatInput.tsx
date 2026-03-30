import { useCallback, useMemo, useRef, useState } from "react";
import { Send, Plus, AtSign, Mic } from "lucide-react";
import { ChatSlashMenu } from "./ChatSlashMenu";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

/**
 * ChatInput — Kinetic Terminal styled chat input.
 *
 * Glass card with rounded corners, + button, @ mention, mic, send FAB.
 * Slash command menu triggers on /
 */
export function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const slashQuery = useMemo(() => {
    const match = value.match(/^\/(\w*)$/);
    return match ? match[1]! : null;
  }, [value]);

  const isSlashActive = slashQuery !== null && !disabled;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    <div className="relative">
      {isSlashActive && (
        <ChatSlashMenu
          query={slashQuery}
          onSelect={handleSlashSelect}
          onClose={() => onChange("")}
        />
      )}
      <div className="flex items-end gap-3">
        <div className="flex-1 bg-kt-surface-container-high rounded-3xl flex items-end px-4 py-2 border border-kt-outline-variant/20 focus-within:border-kt-primary/40 focus-within:shadow-[0_0_20px_rgba(194,193,255,0.1)] transition-all min-h-[48px]">
          <button
            className="text-kt-on-surface-variant/50 hover:text-kt-primary transition-colors p-1 shrink-0 mb-0.5"
            type="button"
          >
            <Plus className="w-5 h-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Send a message... (/ for commands)"
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-kt-on-surface placeholder:text-kt-on-surface-variant/40 py-1.5 px-2 min-h-[28px] max-h-[200px]"
          />
          <button
            className="text-kt-on-surface-variant/50 hover:text-kt-primary transition-colors p-1 shrink-0 mb-0.5"
            type="button"
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="w-12 h-12 rounded-full bg-kt-primary flex items-center justify-center shadow-[0_8px_20px_rgba(194,193,255,0.3)] active:scale-90 transition-transform disabled:opacity-40 disabled:shadow-none shrink-0"
        >
          <Send className="w-5 h-5 text-kt-on-primary" />
        </button>
      </div>
    </div>
  );
}
