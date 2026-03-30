import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { activityApi } from "../api/activity";
import { agentsApi } from "../api/agents";
import { heartbeatsApi } from "../api/heartbeats";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useSidebar } from "../context/SidebarContext";
import { queryKeys } from "../lib/queryKeys";
import { relativeTime, cn } from "../lib/utils";
import {
  GlassCard,
  MessageBubble,
  SystemActionCard,
  LiveExecutionLog,
  AgentAvatar,
  AgentChip,
  StatusDot,
  SectionHeader,
  AGENT_REGISTRY,
  type AgentSlug,
} from "../components/kinetic";
import { Send, AtSign, Plus, ArrowLeft, MoreVertical } from "lucide-react";
import type { Agent, Issue, ActivityEvent } from "@paperclipai/shared";

function resolveAgentSlug(name: string): AgentSlug | null {
  const slug = name.toLowerCase().trim();
  if (slug in AGENT_REGISTRY) return slug as AgentSlug;
  return null;
}

/**
 * IssueThread — Desktop 3-column issue detail view.
 *
 * Left: Active priority list (issues sidebar)
 * Center: Full issue detail + description + live execution
 * Right: Operations thread (comments from agents + humans)
 *
 * On mobile, falls back to TicketThread single-column view.
 */
export function IssueThread() {
  const { issueId } = useParams<{ issueId: string }>();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { isMobile } = useSidebar();
  const [commentText, setCommentText] = useState("");

  const { data: issue, isLoading } = useQuery({
    queryKey: queryKeys.issues.detail(issueId!),
    queryFn: () => issuesApi.get(issueId!),
    enabled: !!issueId,
  });

  const { data: allIssues } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
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

  const assignedAgent = issue?.assigneeAgentId ? agentMap.get(issue.assigneeAgentId) : null;
  const assignedSlug = assignedAgent ? resolveAgentSlug(assignedAgent.name) : null;

  const liveRun = useMemo(() => {
    if (!issue?.assigneeAgentId) return null;
    return (runs ?? []).find(
      (r: any) => r.agentId === issue.assigneeAgentId && (r.status === "running" || r.status === "queued"),
    );
  }, [runs, issue]);
  const isLive = !!liveRun;

  // Active issues for the left sidebar
  const activeIssues = useMemo(() => {
    return (allIssues ?? [])
      .filter((i: Issue) => i.status === "in_progress" || i.status === "todo" || i.status === "in_review")
      .sort((a: Issue, b: Issue) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 20);
  }, [allIssues]);

  // Comment items from activity
  const commentItems = useMemo(() => {
    if (!activity) return [];
    return (activity as ActivityEvent[])
      .filter((e) => e.action === "issue.comment_added" || e.action === "issue.created")
      .map((event) => {
        const agent = event.agentId ? agentMap.get(event.agentId) : null;
        const agentSlug = agent ? resolveAgentSlug(agent.name) : null;
        const isAgent = !!agent;
        return {
          id: event.id,
          variant: isAgent ? ("agent" as const) : ("user" as const),
          agentSlug,
          name: agent?.name ?? (event as any).userId ?? "User",
          badge: isAgent ? "AGENT" : undefined,
          time: relativeTime(event.createdAt),
          body: (event as any).metadata?.commentBody ?? event.action,
        };
      });
  }, [activity, agentMap]);

  useEffect(() => {
    if (issue) {
      setBreadcrumbs([
        { label: "Issues", href: "/issues" },
        { label: issue.title },
      ]);
    }
  }, [issue, setBreadcrumbs]);

  if (isLoading) {
    return (
      <div className="kt-page min-h-full animate-pulse space-y-4 p-4">
        <div className="glass-card rounded-xl h-40 border border-white/5" />
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

  const issuePrefix = `${(issue as any).issuePrefix ?? "RC"}-${(issue as any).issueNumber ?? issueId?.slice(0, 4)}`;

  const statusColor =
    issue.status === "in_progress" || issue.status === "in_review"
      ? "text-kt-warning"
      : issue.status === "done"
        ? "text-emerald-400"
        : "text-kt-on-surface-variant";

  // Desktop 3-column layout
  return (
    <div className="kt-page min-h-full flex">
      {/* Left: Issue Priority List (desktop only) */}
      {!isMobile && (
        <div className="w-64 shrink-0 border-r border-white/5 overflow-y-auto no-scrollbar p-3 space-y-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-kt-on-surface-variant/50">
              Active Priority
            </p>
            <span className="text-[10px] tabular-nums text-kt-primary">{activeIssues.length} open</span>
          </div>
          {activeIssues.map((i: Issue) => {
            const iAgent = i.assigneeAgentId ? agentMap.get(i.assigneeAgentId) : null;
            const iSlug = iAgent ? resolveAgentSlug(iAgent.name) : null;
            const isCurrentIssue = i.id === issueId;
            return (
              <Link
                key={i.id}
                to={`/issues/${i.id}/thread-view`}
                className={cn(
                  "block rounded-xl p-3 transition-all no-underline",
                  isCurrentIssue
                    ? "bg-kt-primary/10 border border-kt-primary/20"
                    : "hover:bg-white/5 border border-transparent",
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] tabular-nums text-kt-on-surface-variant/40 font-mono">
                    {(i as any).issuePrefix ?? "RC"}-{(i as any).issueNumber ?? i.id.slice(0, 4)}
                  </span>
                  <span className={cn(
                    "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                    i.status === "in_progress" ? "bg-kt-warning/10 text-kt-warning" :
                    i.status === "done" ? "bg-emerald-500/10 text-emerald-400" :
                    "bg-white/5 text-kt-on-surface-variant/50"
                  )}>
                    {i.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className={cn(
                  "text-xs leading-snug line-clamp-2",
                  isCurrentIssue ? "text-kt-on-surface" : "text-kt-on-surface-variant/70",
                )}>
                  {i.title}
                </p>
                {iAgent && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <StatusDot status={iSlug && iAgent.status !== "error" ? "active" : "idle"} size="sm" />
                    <span className="text-[9px] text-kt-on-surface-variant/40 uppercase">
                      {iAgent.name}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Center: Issue Detail */}
      <div className="flex-1 min-w-0 overflow-y-auto no-scrollbar p-4 md:p-6 space-y-6 border-r border-white/5">
        {/* Issue Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-kt-on-surface-variant/50">{issuePrefix}</span>
            <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", statusColor,
              issue.status === "in_progress" ? "bg-kt-warning/10" :
              issue.status === "done" ? "bg-emerald-500/10" : "bg-white/5"
            )}>
              {issue.status.replace(/_/g, " ")}
            </span>
            {isLive && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase">Live</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-kt-on-surface leading-tight">
            {issue.title}
          </h1>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-4">
          {assignedAgent && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Agent</span>
              {assignedSlug ? (
                <AgentChip agent={assignedSlug} active={isLive} size="sm" />
              ) : (
                <span className="text-xs text-kt-on-surface">{assignedAgent.name}</span>
              )}
            </div>
          )}
          {(issue as any).priority && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-kt-on-surface-variant/50">Priority</span>
              <span className="text-xs font-bold text-kt-on-surface">{(issue as any).priority}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {issue.description && (
          <div className="text-sm text-kt-on-surface-variant leading-relaxed whitespace-pre-wrap">
            {issue.description.length > 500 ? issue.description.slice(0, 500) + "..." : issue.description}
          </div>
        )}

        {/* Live Execution */}
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
      </div>

      {/* Right: Operations Thread (desktop) */}
      {!isMobile && (
        <div className="w-80 shrink-0 flex flex-col">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-kt-on-surface-variant/50">
              Operations Thread
            </p>
          </div>

          {/* Comments */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
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
                  {typeof item.body === "string" && item.body.length > 200
                    ? item.body.slice(0, 200) + "..."
                    : item.body}
                </MessageBubble>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-kt-on-surface-variant/40">No comments yet</p>
              </div>
            )}
          </div>

          {/* Comment Input */}
          <div className="p-3 border-t border-white/5">
            {/* Agent selector tabs */}
            {assignedAgent && assignedSlug && (
              <div className="flex gap-1 mb-2">
                <span
                  className="px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                  style={{ backgroundColor: `${AGENT_REGISTRY[assignedSlug].color}15`, color: AGENT_REGISTRY[assignedSlug].colorLight }}
                >
                  {assignedAgent.name}
                </span>
              </div>
            )}
            <div className="bg-kt-surface-container-high rounded-xl flex items-center px-3 py-2 border border-kt-outline-variant/20 focus-within:border-kt-primary/40 transition-all">
              <input
                className="bg-transparent border-none focus:outline-none focus:ring-0 text-xs flex-1 text-kt-on-surface placeholder:text-kt-on-surface-variant/40 py-1"
                placeholder="Type / to invoke agent commands..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button className="bg-kt-primary text-kt-on-primary w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-transform ml-2">
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
