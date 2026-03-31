/**
 * ApprovalQueue — pixel-perfect from Stitch approval_queue_desktop/code.html
 * Mobile: Tinder-style swipe card view (< md breakpoint)
 * Desktop: Multi-card grid (>= md breakpoint)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { approvalsApi } from "../api/approvals";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { AGENT_REGISTRY, type AgentSlug } from "../components/kinetic/AgentChip";
import type { Approval } from "@paperclipai/shared";
import { getAgentAvatar } from "../components/kinetic/agent-avatars";

function resolveSlug(name: string): AgentSlug | null {
  const s = name.toLowerCase().trim();
  return s in AGENT_REGISTRY ? (s as AgentSlug) : null;
}

/* ------------------------------------------------------------------ */
/*  Mobile Swipe Card                                                  */
/* ------------------------------------------------------------------ */

function MobileSwipeQueue({
  pending,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  pending: Approval[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Touch/swipe state
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [animatingOut, setAnimatingOut] = useState<"left" | "right" | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Clamp index when pending list changes (e.g. after approve/reject removes an item)
  useEffect(() => {
    if (currentIndex >= pending.length && pending.length > 0) {
      setCurrentIndex(pending.length - 1);
    }
  }, [pending.length, currentIndex]);

  const SWIPE_THRESHOLD = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    setSwipeOffset(diff);
    setSwipeDirection(diff > 20 ? "right" : diff < -20 ? "left" : null);
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchCurrentX.current - touchStartX.current;
    if (Math.abs(diff) > SWIPE_THRESHOLD && pending[currentIndex]) {
      const direction = diff > 0 ? "right" : "left";
      setAnimatingOut(direction);
      setTimeout(() => {
        if (direction === "right") {
          onApprove(pending[currentIndex].id);
        } else {
          onReject(pending[currentIndex].id);
        }
        setAnimatingOut(null);
        setSwipeOffset(0);
        setSwipeDirection(null);
      }, 300);
    } else {
      setSwipeOffset(0);
      setSwipeDirection(null);
    }
  }, [currentIndex, pending, onApprove, onReject]);

  const handleButtonApprove = useCallback(() => {
    if (!pending[currentIndex]) return;
    setAnimatingOut("right");
    setTimeout(() => {
      onApprove(pending[currentIndex].id);
      setAnimatingOut(null);
    }, 300);
  }, [currentIndex, pending, onApprove]);

  const handleButtonReject = useCallback(() => {
    if (!pending[currentIndex]) return;
    setAnimatingOut("left");
    setTimeout(() => {
      onReject(pending[currentIndex].id);
      setAnimatingOut(null);
    }, 300);
  }, [currentIndex, pending, onReject]);

  if (pending.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}>check_circle</span>
        </div>
        <h3 className="text-2xl font-bold text-[--rc-on-surface] mb-2">All Clear</h3>
        <p className="text-[--rc-on-surface-variant]">No pending authorizations</p>
      </div>
    );
  }

  const approval = pending[currentIndex];
  if (!approval) return null;

  const p = approval.payload ?? {};
  const agentName = (p.agentName as string) ?? "Agent";
  const slug = resolveSlug(agentName);
  const config = slug ? AGENT_REGISTRY[slug] : null;
  const accentColor = config?.color ?? "var(--rc-primary)";
  const title = (p.title as string) ?? (p.summary as string) ?? `${approval.type} request`;
  const desc = (p.description as string) ?? (p.plan as string) ?? null;
  const avatarUrl = slug ? getAgentAvatar(agentName) : null;

  // Card transform during swipe
  const cardRotation = swipeOffset * 0.08; // subtle tilt
  const cardTranslateX = animatingOut
    ? animatingOut === "right" ? 400 : -400
    : swipeOffset;
  const cardOpacity = animatingOut ? 0 : 1;

  return (
    <div className="flex flex-col items-center px-4 min-h-[70vh]">
      {/* Header */}
      <div className="w-full mb-6 text-center">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-[--rc-on-surface-variant] mb-1">Queue Priority</h2>
        <p className="text-3xl font-extrabold tracking-tight text-[--rc-on-surface]">{pending.length} Pending</p>
      </div>

      {/* Card Stack */}
      <div className="relative w-full max-w-sm aspect-[3/4]" style={{ perspective: "1000px" }}>
        {/* Background Card 2 */}
        {pending.length > currentIndex + 2 && (
          <div className="absolute inset-0 translate-y-6 scale-[0.9] opacity-40 glass-card rounded-[2rem] border border-white/5" />
        )}
        {/* Background Card 1 */}
        {pending.length > currentIndex + 1 && (
          <div className="absolute inset-0 translate-y-3 scale-[0.95] opacity-70 glass-card rounded-[2rem] border border-white/5" />
        )}

        {/* Active Card */}
        <div
          ref={cardRef}
          className="absolute inset-0 glass-card rounded-[2rem] border border-white/10 p-6 sm:p-8 flex flex-col shadow-2xl transition-transform"
          style={{
            transform: `translateX(${cardTranslateX}px) rotate(${cardRotation}deg)`,
            opacity: cardOpacity,
            transition: animatingOut ? "transform 0.3s ease-out, opacity 0.3s ease-out" : "none",
            boxShadow: `0 0 40px -10px ${accentColor}30`,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Swipe direction indicators */}
          {swipeDirection === "right" && !animatingOut && (
            <div className="absolute top-6 left-6 bg-emerald-500/20 border-2 border-emerald-400 rounded-xl px-3 py-1 z-10 rotate-[-12deg]">
              <span className="text-emerald-400 text-sm font-bold uppercase tracking-widest">Approve</span>
            </div>
          )}
          {swipeDirection === "left" && !animatingOut && (
            <div className="absolute top-6 right-6 bg-red-500/20 border-2 border-red-400 rounded-xl px-3 py-1 z-10 rotate-[12deg]">
              <span className="text-red-400 text-sm font-bold uppercase tracking-widest">Reject</span>
            </div>
          )}

          {/* Agent Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
                style={{
                  background: `linear-gradient(to bottom right, ${accentColor}, ${accentColor}80)`,
                  boxShadow: `0 8px 20px -4px ${accentColor}30`,
                }}
              >
                {avatarUrl ? (
                  <img alt={agentName} src={avatarUrl} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                )}
              </div>
              <div>
                <p className="text-sm tracking-wider font-bold" style={{ color: accentColor }}>{agentName.toUpperCase()}</p>
                <p className="text-[10px] text-[--rc-on-surface-variant] uppercase tracking-widest">{approval.type}</p>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full flex items-center gap-1.5" style={{ backgroundColor: `${accentColor}15` }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
              <span className="text-[10px] font-bold tracking-tighter" style={{ color: accentColor }}>WAITING</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-bold text-[--rc-on-surface] leading-tight mb-4">
            {title}
          </h3>

          {/* Action Summary */}
          <div className="flex-grow space-y-4 overflow-hidden">
            {desc && (
              <div className="bg-[--rc-surface-container-low]/50 rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] text-[--rc-on-surface-variant] mb-2 tracking-widest uppercase">Action Summary</p>
                <p className="text-sm text-[--rc-on-surface] leading-relaxed line-clamp-4">{desc}</p>
              </div>
            )}

            {/* Cost Impact + ETA row */}
            <div className="flex items-center justify-between px-2">
              <div>
                <p className="text-[10px] text-[--rc-on-surface-variant] tracking-widest uppercase">Cost Impact</p>
                <p className="text-lg font-bold tabular-nums text-[--rc-on-surface]">~$-- <span className="text-xs font-normal text-[--rc-on-surface-variant]">API</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[--rc-on-surface-variant] tracking-widest uppercase">ETA</p>
                <p className="text-lg font-bold tabular-nums text-[--rc-on-surface]">--s</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              onClick={handleButtonReject}
              disabled={isRejecting}
              className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity active:scale-90"
            >
              <div className="w-12 h-12 rounded-full border border-[#ffb4ab]/30 flex items-center justify-center text-[#ffb4ab]">
                <span className="material-symbols-outlined text-2xl">close</span>
              </div>
              <span className="text-[9px] tracking-widest uppercase text-[--rc-on-surface-variant]">Reject</span>
            </button>
            <button
              onClick={handleButtonApprove}
              disabled={isApproving}
              className="flex flex-col items-center gap-2 hover:opacity-100 transition-opacity active:scale-90"
            >
              <div className="w-12 h-12 rounded-full bg-[--rc-primary]/20 border border-[--rc-primary]/40 flex items-center justify-center text-[--rc-primary]">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
              </div>
              <span className="text-[9px] tracking-widest uppercase text-[--rc-primary]">Approve</span>
            </button>
          </div>
        </div>
      </div>

      {/* Swipe Hint */}
      <div className="mt-10 flex flex-col items-center gap-4">
        <div className="flex items-center gap-8 text-[--rc-on-surface-variant]/40">
          <span className="material-symbols-outlined scale-150">keyboard_double_arrow_left</span>
          <span className="text-xs uppercase tracking-widest">Swipe to decide</span>
          <span className="material-symbols-outlined scale-150">keyboard_double_arrow_right</span>
        </div>
      </div>

      {/* Progress Dots */}
      <div className="mt-6 flex items-center gap-1.5">
        {pending.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === currentIndex ? 16 : 6,
              backgroundColor: i === currentIndex ? "var(--rc-primary)" : "var(--rc-on-surface-variant)",
              opacity: i === currentIndex ? 1 : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export function ApprovalQueue() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();

  useEffect(() => { setBreadcrumbs([{ label: "Approval Queue" }]); }, [setBreadcrumbs]);

  const { data: approvals, isLoading } = useQuery({
    queryKey: queryKeys.approvals.list(selectedCompanyId!, "pending"),
    queryFn: () => approvalsApi.list(selectedCompanyId!, "pending"),
    enabled: !!selectedCompanyId,
  });

  const pending = useMemo(() => (approvals ?? []).filter((a: Approval) => a.status === "pending"), [approvals]);

  const invalidateApprovals = useCallback(() => {
    if (!selectedCompanyId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedCompanyId, "pending") });
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedCompanyId) });
  }, [queryClient, selectedCompanyId]);

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvalsApi.approve(id),
    onSuccess: invalidateApprovals,
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => approvalsApi.reject(id),
    onSuccess: invalidateApprovals,
  });

  if (isLoading) return <div className="animate-pulse h-96 glass-card rounded-xl" />;

  return (
    <>
      {/* ── Mobile: Tinder-style swipe view (< md) ── */}
      <div className="md:hidden">
        <MobileSwipeQueue
          pending={pending}
          onApprove={(id) => approveMutation.mutate(id)}
          onReject={(id) => rejectMutation.mutate(id)}
          isApproving={approveMutation.isPending}
          isRejecting={rejectMutation.isPending}
        />
      </div>

      {/* ── Desktop: Multi-card grid (>= md) ── */}
      <div className="hidden md:block max-w-6xl">
        {/* Breadcrumbs & Header — from Stitch */}
        <div className="mb-10 flex justify-between items-end">
          <div>
            <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant] mb-2">
              <span>Razorclip</span>
              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chevron_right</span>
              <span className="text-[--rc-primary]">Approval Queue</span>
            </nav>
            <h2 className="text-4xl font-light tracking-tight text-[--rc-on-surface]">
              Pending <span className="font-bold">Authorizations</span>
            </h2>
            <p className="text-[--rc-on-surface-variant] mt-2 max-w-lg font-medium text-sm">
              Reviewing {pending.length} actions from autonomous agents across the production stack.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant]">Est. Burn</span>
              <span className="tabular-nums font-bold text-[--rc-primary]">—</span>
            </div>
            <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant]">Queue Depth</span>
              <span className="tabular-nums font-bold text-[--rc-primary]">{pending.length}</span>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {pending.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}>check_circle</span>
            </div>
            <h3 className="text-2xl font-bold text-[--rc-on-surface] mb-2">All Clear</h3>
            <p className="text-[--rc-on-surface-variant]">No pending authorizations</p>
          </div>
        )}

        {/* Approval Grid — from Stitch */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {pending.map((approval) => {
            const p = approval.payload ?? {};
            const agentName = (p.agentName as string) ?? "Agent";
            const slug = resolveSlug(agentName);
            const config = slug ? AGENT_REGISTRY[slug] : null;
            const accentColor = config?.color ?? "var(--rc-primary)";
            const accentLight = config?.colorLight ?? "var(--rc-on-surface-variant)";
            const title = (p.title as string) ?? (p.summary as string) ?? `${approval.type} request`;
            const desc = (p.description as string) ?? (p.plan as string) ?? null;
            const avatarUrl = slug ? getAgentAvatar(agentName) : null;

            return (
              <div key={approval.id} className="glass-card rounded-2xl flex flex-col p-6 hover:translate-y-[-4px] transition-all duration-300 group">
                {/* Agent Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full p-[2px]" style={{ background: `linear-gradient(to bottom right, ${accentColor}, ${accentLight})`, boxShadow: `0 0 30px -5px ${accentColor}30` }}>
                      <div className="w-full h-full rounded-full bg-[--rc-surface-container] flex items-center justify-center overflow-hidden">
                        {avatarUrl ? (
                          <img alt={agentName} src={avatarUrl} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold" style={{ color: accentColor }}>{agentName[0]}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-[--rc-on-surface]">{agentName}</h3>
                      <span className="text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant] py-0.5 px-2 bg-[--rc-surface-container-high] rounded-full border border-[--rc-outline-variant]/20">
                        {approval.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="tabular-nums text-xs font-semibold text-[--rc-primary]">~$— API</span>
                    <span className="text-[10px] text-[--rc-on-surface-variant] uppercase">Cost Impact</span>
                  </div>
                </div>

                {/* Requested Action */}
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-widest text-[--rc-on-surface-variant] mb-2 font-bold">Requested Action</p>
                  <p className="text-sm font-medium leading-relaxed">{title}</p>
                </div>

                {/* Context */}
                {desc && (
                  <div className="bg-[--rc-surface-container-lowest]/50 rounded-xl p-4 mb-6 border border-[--rc-outline-variant]/10">
                    <span className="text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant] block mb-2">Context Summary</span>
                    <p className="text-[11px] text-[--rc-on-surface-variant] leading-relaxed line-clamp-3">{desc}</p>
                  </div>
                )}

                {/* Signal + Actions — from Stitch */}
                <div className="mt-auto flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-1 w-4 rounded-full" style={{ backgroundColor: i < 2 ? accentColor : `${accentColor}30` }} />
                      ))}
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-tighter tabular-nums">—% Signal</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => rejectMutation.mutate(approval.id)}
                      disabled={rejectMutation.isPending}
                      className="w-10 h-10 rounded-xl border border-[--rc-outline-variant]/20 flex items-center justify-center hover:bg-[#ffb4ab]/10 hover:text-[#ffb4ab] transition-all active:scale-90"
                    >
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>close</span>
                    </button>
                    <button
                      onClick={() => approveMutation.mutate(approval.id)}
                      disabled={approveMutation.isPending}
                      className="px-4 py-2 rounded-xl bg-[--rc-primary] text-[--rc-on-primary] text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-[--rc-primary]/10"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
