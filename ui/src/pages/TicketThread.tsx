import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical, Send, AtSign, Plus } from "lucide-react";
import { issuesApi } from "../api/issues";
import { activityApi } from "../api/activity";
import { agentsApi } from "../api/agents";
import { heartbeatsApi } from "../api/heartbeats";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { relativeTime, cn } from "../lib/utils";
import {
  GlassCard,
  MessageBubble,
  SystemActionCard,
  LiveExecutionLog,
  AgentAvatar,
  StatusDot,
  AGENT_REGISTRY,
  type AgentSlug,
} from "../components/kinetic";
import type { Agent, Issue, ActivityEvent } from "@paperclipai/shared";

function resolveAgentSlug(name: string): AgentSlug | null {
  const slug = name.toLowerCase().trim();
  if (slug in AGENT_REGISTRY) return slug as AgentSlug;
  return null;
}

export function TicketThread() {
  const { issueId } = useParams<{ issueId: string }>();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState("");

  const { data: issue, isLoading } = useQuery({
    queryKey: queryKeys.issues.detail(issueId!),
    queryFn: () => issuesApi.get(issueId!),
    enabled: !!issueId,
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: activity } = useQuery({
    queryKey: queryKeys.issues.activity(issueId!),
    queryFn: () => activityApi.forIssue(issueId!),
    enabled: !!issueId,
    refetchInterval: 10_000,
  });

  const { data: runs } = useQuery({
    queryKey: queryKeys.heartbeats(selectedCompanyId!),
    queryFn: () => heartbeatsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5_000,
  });

  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const a of agents ?? []) map.set(a.id, a);
    return map;
  }, [agents]);

  // Find live run for this issue's assigned agent
  const assignedAgent = issue?.assigneeAgentId ? agentMap.get(issue.assigneeAgentId) : null;
  const assignedSlug = assignedAgent ? resolveAgentSlug(assignedAgent.name) : null;
  const liveRun = useMemo(() => {
    if (!issue?.assigneeAgentId) return null;
    return (runs ?? []).find(
      (r: any) => r.agentId === issue.assigneeAgentId && (r.status === "running" || r.status === "queued"),
    );
  }, [runs, issue]);

  const isLive = !!liveRun;
  const issuePrefix = issue ? `${(issue as any).issuePrefix ?? "RC"}-${(issue as any).issueNumber ?? issueId?.slice(0, 4)}` : `#${issueId?.slice(0, 4)}`;

  useEffect(() => {
    if (issue) {
      setBreadcrumbs([
        { label: "Issues", href: "/issues" },
        { label: issue.title },
      ]);
    }
  }, [issue, setBreadcrumbs]);

  // Parse activity events into renderable comment items
  const commentItems = useMemo(() => {
    if (!activity) return [];
    return (activity as ActivityEvent[])
      .filter((e) => e.action === "issue.comment_added" || e.action === "issue.created" || e.action === "issue.updated")
      .map((event) => {
        const agent = event.agentId ? agentMap.get(event.agentId) : null;
        const agentSlug = agent ? resolveAgentSlug(agent.name) : null;
        const isAgent = !!agent;
        const name = agent?.name ?? (event as any).userId ?? "System";
        const body = (event as any).metadata?.commentBody ?? (event as any).metadata?.description ?? event.action;
        const time = relativeTime(event.createdAt);

        return {
          id: event.id,
          variant: isAgent ? ("agent" as const) : ("user" as const),
          agentSlug,
          name,
          badge: isAgent ? "AGENT" : undefined,
          time,
          body,
        };
      });
  }, [activity, agentMap]);

  if (isLoading) {
    return (
      <div className="kt-page min-h-full flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-md px-4">
          <div className="glass-card rounded-xl h-24 border border-white/5" />
          <div className="glass-card rounded-xl h-32 border border-white/5" />
          <div className="glass-card rounded-xl h-20 border border-white/5" />
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="kt-page min-h-full flex items-center justify-center">
        <p className="text-kt-on-surface-variant">Issue not found</p>
      </div>
    );
  }

  const statusColor =
    issue.status === "in_progress" || issue.status === "in_review"
      ? "text-kt-warning"
      : issue.status === "done"
        ? "text-emerald-400"
        : "text-kt-on-surface-variant";

  return (
    <div className="kt-page min-h-full flex flex-col">
      {/* Ticket Header */}
      <header className="bg-kt-surface/80 backdrop-blur-xl border-b border-kt-primary/15 sticky top-0 z-40 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <button
            className="text-kt-primary hover:bg-kt-primary/10 transition-colors active:scale-95 p-1 rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-kt-primary font-semibold tabular-nums text-sm tracking-tight">
              {issuePrefix}
            </h1>
            {isLive && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase">Live</span>
              </div>
            )}
          </div>
        </div>
        <button className="text-kt-primary hover:bg-kt-primary/10 transition-colors active:scale-95 p-1 rounded-full">
          <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 space-y-5 pt-4">
        {/* Ticket Context Card */}
        <section className="bg-kt-surface-container-low rounded-xl p-4 border border-kt-outline-variant/10">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-kt-primary/80">
              {isLive ? "Active Execution" : "Active Ticket"}
            </span>
            <div className="flex items-center gap-2">
              <StatusDot status={isLive ? "active" : issue.status === "done" ? "connected" : "pending"} size="sm" />
              <span className={cn("text-[10px] uppercase font-bold", statusColor)}>
                {issue.status.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-kt-on-surface mb-3 leading-tight">
            {issue.title}
          </h2>
          <div className="flex items-center gap-3">
            {assignedAgent && (
              <div className="flex items-center gap-2">
                {assignedSlug ? (
                  <AgentAvatar agent={assignedSlug} size="sm" showRing={isLive} />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-kt-surface-container-high border border-white/10 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-kt-on-surface-variant">{assignedAgent.name[0]}</span>
                  </div>
                )}
              </div>
            )}
            <div className="text-[11px] text-kt-on-surface-variant flex gap-2 tabular-nums">
              {assignedAgent && (
                <>
                  <span>
                    Assigned: <span className="text-kt-primary">{assignedAgent.name}</span>
                  </span>
                  <span className="opacity-30">|</span>
                </>
              )}
              <span>Updated {relativeTime(issue.updatedAt)}</span>
            </div>
          </div>

          {/* Progress bar for live execution */}
          {isLive && (
            <div className="mt-3">
              <div className="w-full h-1 bg-kt-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-kt-primary-container to-kt-primary w-[60%] rounded-full animate-pulse" />
              </div>
            </div>
          )}
        </section>

        {/* Live Execution Log (when agent is running) */}
        {isLive && assignedAgent && (
          <LiveExecutionLog
            agentSlug={assignedSlug}
            agentName={assignedAgent.name}
            isLive
            lines={[
              { timestamp: "...", text: "Waiting for output stream...", status: "info" },
            ]}
          />
        )}

        {/* Description */}
        {issue.description && (
          <div className="text-sm text-kt-on-surface-variant leading-relaxed">
            {issue.description}
          </div>
        )}

        {/* Comment Feed */}
        <div className="space-y-5">
          {commentItems.length > 0 ? (
            commentItems.map((item) => (
              <MessageBubble
                key={item.id}
                variant={item.variant}
                agentSlug={item.agentSlug}
                name={item.name}
                badge={item.badge}
                time={item.time}
              >
                {item.body}
              </MessageBubble>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-kt-on-surface-variant/50">
                No comments yet. Start the conversation below.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Comment Input */}
      <div className="fixed bottom-0 left-0 md:left-64 w-full md:w-[calc(100%-16rem)] bg-kt-surface/90 backdrop-blur-2xl border-t border-kt-outline-variant/10 p-4 pb-8 z-30">
        <div className="max-w-screen-md mx-auto">
          {/* Command hints */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-2">
            {assignedAgent && assignedSlug && (
              <div className="bg-kt-surface-container-highest px-3 py-1 rounded-full border border-kt-primary/20 flex items-center gap-1.5 shrink-0">
                <span className="text-kt-primary font-bold text-xs">@</span>
                <span className="text-[10px] font-bold text-kt-on-surface-variant uppercase tracking-wider">
                  {assignedAgent.name}
                </span>
              </div>
            )}
            <div className="bg-kt-surface-container-highest px-3 py-1 rounded-full border border-kt-primary/20 flex items-center gap-1.5 shrink-0">
              <span className="text-kt-primary font-bold text-xs">/</span>
              <span className="text-[10px] font-bold text-kt-on-surface-variant uppercase tracking-wider">
                Summarize
              </span>
            </div>
          </div>

          {/* Input */}
          <div className="bg-kt-surface-container-high rounded-2xl flex items-center px-4 py-2 border border-kt-outline-variant/20 focus-within:border-kt-primary/40 focus-within:shadow-[0_0_20px_rgba(194,193,255,0.1)] transition-all">
            <button className="text-kt-on-surface-variant/60 hover:text-kt-primary transition-colors p-1">
              <Plus className="w-5 h-5" />
            </button>
            <input
              className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm flex-1 text-kt-on-surface placeholder:text-kt-on-surface-variant/40 py-2 px-3"
              placeholder="Type @ to mention, / for commands..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <button className="text-kt-on-surface-variant/60 hover:text-kt-primary transition-colors">
                <AtSign className="w-5 h-5" />
              </button>
              <button className="bg-kt-primary text-kt-on-primary w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-[0_4px_12px_rgba(194,193,255,0.3)]">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
