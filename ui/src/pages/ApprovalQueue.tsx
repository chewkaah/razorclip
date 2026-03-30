import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/lib/router";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { approvalsApi } from "../api/approvals";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import {
  GlassCard,
  AgentAvatar,
  StatusDot,
  AGENT_REGISTRY,
  type AgentSlug,
} from "../components/kinetic";
import type { Approval } from "@paperclipai/shared";

function resolveAgentSlug(name: string): AgentSlug | null {
  const slug = name.toLowerCase().trim();
  if (slug in AGENT_REGISTRY) return slug as AgentSlug;
  return null;
}

export function ApprovalQueue() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setBreadcrumbs([{ label: "Approval Queue" }]);
  }, [setBreadcrumbs]);

  const { data: approvals, isLoading } = useQuery({
    queryKey: queryKeys.approvals.list(selectedCompanyId!),
    queryFn: () => approvalsApi.list(selectedCompanyId!, "pending"),
    enabled: !!selectedCompanyId,
  });

  const pending = useMemo(() => {
    return (approvals ?? []).filter((a: Approval) => a.status === "pending");
  }, [approvals]);

  const current = pending[currentIndex] as Approval | undefined;

  if (isLoading) {
    return (
      <div className="kt-page min-h-full flex items-center justify-center">
        <div className="animate-pulse glass-card rounded-2xl w-80 h-96 border border-white/5" />
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="kt-page min-h-full flex flex-col items-center justify-center pb-24 px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-kt-on-surface">All Clear</h2>
          <p className="text-kt-on-surface-variant text-sm">No pending approvals</p>
        </div>
      </div>
    );
  }

  // Extract readable info from the approval payload
  const payload = current?.payload ?? {};
  const agentName = (payload.agentName as string) ?? "Agent";
  const title = (payload.title as string) ?? (payload.summary as string) ?? `${current?.type ?? "approval"} request`;
  const description = (payload.description as string) ?? (payload.plan as string) ?? null;
  const slug = resolveAgentSlug(agentName);
  const config = slug ? AGENT_REGISTRY[slug] : null;

  return (
    <div className="kt-page min-h-full flex flex-col items-center justify-center pb-24 px-4">
      {/* Queue Priority Header */}
      <div className="text-center mb-8">
        <p className="text-[10px] uppercase tracking-[0.15em] text-kt-on-surface-variant mb-1">
          Queue Priority
        </p>
        <h1 className="text-4xl font-bold text-kt-on-surface tabular-nums">
          {pending.length} Pending
        </h1>
      </div>

      {/* Approval Card */}
      <GlassCard className="w-full max-w-sm p-6 space-y-5">
        {/* Agent Header */}
        <div className="flex items-center gap-3">
          {slug ? (
            <AgentAvatar agent={slug} size="sm" showRing />
          ) : (
            <div className="w-10 h-10 rounded-full bg-kt-surface-container-high flex items-center justify-center border border-white/10">
              <span className="text-sm font-bold text-kt-on-surface-variant">{agentName[0]}</span>
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-bold text-kt-on-surface uppercase">{agentName}</p>
            <p className="text-[10px] text-kt-on-surface-variant/60 uppercase tracking-wider">
              Autonomous Ops
            </p>
          </div>
          <span className="text-[10px] font-bold text-kt-warning bg-kt-warning/10 px-2 py-1 rounded-full uppercase">
            Waiting
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-kt-on-surface leading-tight">
          {title}
        </h2>

        {/* Action Summary */}
        {description && (
          <div className="bg-kt-surface-container-low rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50 mb-2">
              Action Summary
            </p>
            <p className="text-sm text-kt-on-surface-variant leading-relaxed line-clamp-3">
              {description}
            </p>
          </div>
        )}

        {/* Cost + ETA */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Cost Impact</p>
            <p className="text-lg font-bold text-kt-on-surface tabular-nums">
              ~$—
            </p>
            <p className="text-[10px] text-kt-on-surface-variant/40">API cost</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">ETA</p>
            <p className="text-lg font-bold text-kt-on-surface tabular-nums">—</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-kt-surface-container-high border border-white/5 text-kt-on-surface-variant hover:bg-white/10 transition-all active:scale-95"
            onClick={() => {
              if (currentIndex < pending.length - 1) setCurrentIndex(currentIndex + 1);
            }}
          >
            <X className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Reject</span>
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-kt-primary text-kt-on-primary hover:opacity-90 transition-all active:scale-95"
            onClick={() => {
              if (currentIndex < pending.length - 1) setCurrentIndex(currentIndex + 1);
            }}
          >
            <Check className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Approve</span>
          </button>
        </div>
      </GlassCard>

      {/* Swipe Hint */}
      <div className="flex items-center gap-2 mt-6 text-kt-on-surface-variant/30">
        <ChevronLeft className="w-4 h-4" />
        <span className="text-[10px] uppercase tracking-widest">Swipe to Decide</span>
        <ChevronRight className="w-4 h-4" />
      </div>

      {/* Progress Dots */}
      <div className="flex gap-1.5 mt-4">
        {pending.map((_, i) => (
          <span
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              i === currentIndex ? "bg-kt-primary w-4" : "bg-kt-on-surface-variant/20",
            )}
          />
        ))}
      </div>
    </div>
  );
}
