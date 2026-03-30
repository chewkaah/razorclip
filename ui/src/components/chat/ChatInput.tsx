/**
 * ChatInput — pixel-perfect from Stitch chat_interface footer
 */
import { useCallback, useMemo, useRef } from "react";
import { ChatSlashMenu } from "./ChatSlashMenu";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const slashQuery = useMemo(() => {
    const match = value.match(/^\/(\w*)$/);
    return match ? match[1]! : null;
  }, [value]);

  const isSlashActive = slashQuery !== null && !disabled;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (isSlashActive && ["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(e.key)) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && value.trim()) onSubmit();
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
        <ChatSlashMenu query={slashQuery} onSelect={handleSlashSelect} onClose={() => onChange("")} />
      )}
      <div className="max-w-4xl mx-auto flex items-end gap-3">
        {/* Input bar — from Stitch */}
        <div className="flex-1 glass-card min-h-[56px] rounded-3xl px-5 py-3 flex items-center gap-3 focus-within:ring-1 focus-within:ring-[#c2c1ff]/50 transition-all">
          <span
            className="material-symbols-outlined text-[#c7c4d7]/50 text-xl cursor-pointer hover:text-[#c2c1ff] transition-colors"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
          >
            add_circle
          </span>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Send a message... (/ for commands)"
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-[#e2e2eb] placeholder:text-[#c7c4d7]/40 py-1.5 min-h-[28px] max-h-[200px]"
          />
          <span
            className="material-symbols-outlined text-[#c7c4d7]/50 text-xl cursor-pointer hover:text-[#c2c1ff] transition-colors"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
          >
            mic
          </span>
        </div>
        {/* Send FAB — from Stitch */}
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="w-14 h-14 rounded-full bg-[#c2c1ff] flex items-center justify-center shadow-[0_8px_20px_rgba(194,193,255,0.3)] active:scale-90 transition-transform disabled:opacity-40 disabled:shadow-none shrink-0"
        >
          <span
            className="material-symbols-outlined text-[#1800a7] text-2xl"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}
          >
            send
          </span>
        </button>
      </div>
    </div>
  );
}
