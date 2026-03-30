/**
 * ChatStreamingIndicator — Kinetic Terminal agent typing dots.
 *
 * Three pulsing dots in the agent's accent color with avatar.
 */
export function ChatStreamingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full p-[1px] bg-gradient-to-br from-[#8B5CF6] to-[#D8B4FE] shrink-0">
        <div className="w-full h-full rounded-full bg-kt-surface-container-lowest flex items-center justify-center">
          <span className="text-[10px] font-bold text-[#8B5CF6]">AI</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-3">
        <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse [animation-delay:200ms]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse [animation-delay:400ms]" />
      </div>
    </div>
  );
}
