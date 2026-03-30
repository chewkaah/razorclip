/**
 * ChatStreamingIndicator — from Stitch chat_interface typing dots
 */
export function ChatStreamingIndicator() {
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
      <div className="flex items-center gap-1.5 px-2 py-1">
        <div className="w-1 h-1 rounded-full bg-[#8B5CF6] animate-pulse" />
        <div className="w-1 h-1 rounded-full bg-[#8B5CF6] animate-pulse [animation-delay:200ms]" />
        <div className="w-1 h-1 rounded-full bg-[#8B5CF6] animate-pulse [animation-delay:400ms]" />
      </div>
    </div>
  );
}
