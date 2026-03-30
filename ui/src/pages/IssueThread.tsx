/**
 * IssueThread — pixel-perfect from Stitch issue_detail_desktop/code.html
 *
 * 3-column: Active Issues List | Detailed Issue View + Terminal | Operations Thread
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { activityApi } from "../api/activity";
import { agentsApi } from "../api/agents";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { relativeTime, cn } from "../lib/utils";
import { AGENT_REGISTRY, type AgentSlug } from "../components/kinetic/AgentChip";
import type { Agent, Issue, ActivityEvent } from "@paperclipai/shared";

function resolveSlug(name: string): AgentSlug | null {
  const s = name.toLowerCase().trim();
  return s in AGENT_REGISTRY ? (s as AgentSlug) : null;
}

export function IssueThread() {
  const { issueId } = useParams<{ issueId: string }>();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [commentText, setCommentText] = useState("");

  const { data: issue } = useQuery({ queryKey: queryKeys.issues.detail(issueId!), queryFn: () => issuesApi.get(issueId!), enabled: !!issueId });
  const { data: allIssues } = useQuery({ queryKey: queryKeys.issues.list(selectedCompanyId!), queryFn: () => issuesApi.list(selectedCompanyId!), enabled: !!selectedCompanyId });
  const { data: agents } = useQuery({ queryKey: queryKeys.agents.list(selectedCompanyId!), queryFn: () => agentsApi.list(selectedCompanyId!), enabled: !!selectedCompanyId });
  const { data: activity } = useQuery({ queryKey: queryKeys.issues.activity(issueId!), queryFn: () => activityApi.forIssue(issueId!), enabled: !!issueId, refetchInterval: 10_000 });

  const agentMap = useMemo(() => { const m = new Map<string, Agent>(); for (const a of agents ?? []) m.set(a.id, a); return m; }, [agents]);
  const assignedAgent = issue?.assigneeAgentId ? agentMap.get(issue.assigneeAgentId) : null;
  const assignedSlug = assignedAgent ? resolveSlug(assignedAgent.name) : null;
  const assignedConfig = assignedSlug ? AGENT_REGISTRY[assignedSlug] : null;

  const activeIssues = useMemo(() =>
    (allIssues ?? []).filter((i: Issue) => i.status !== "done" && i.status !== "cancelled")
      .sort((a: Issue, b: Issue) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 15),
  [allIssues]);

  const comments = useMemo(() => {
    if (!activity) return [];
    return (activity as ActivityEvent[]).filter(e => e.action === "issue.comment_added" || e.action === "issue.created").map(event => {
      const agent = event.agentId ? agentMap.get(event.agentId) : null;
      const slug = agent ? resolveSlug(agent.name) : null;
      const config = slug ? AGENT_REGISTRY[slug] : null;
      return { id: event.id, isAgent: !!agent, name: agent?.name ?? "User", slug, config, time: relativeTime(event.createdAt), body: (event as any).metadata?.commentBody ?? event.action };
    });
  }, [activity, agentMap]);

  useEffect(() => { if (issue) setBreadcrumbs([{ label: "Issues", href: "/issues" }, { label: issue.title }]); }, [issue, setBreadcrumbs]);

  if (!issue) return <div className="flex items-center justify-center h-64 text-[#c7c4d7]">Loading...</div>;

  const prefix = `${(issue as any).issuePrefix ?? "RC"}-${(issue as any).issueNumber ?? issueId?.slice(0, 4)}`;

  return (
    <div className="-m-8 h-[calc(100vh-4rem)] grid grid-cols-[320px_1fr_380px] divide-x divide-[#464554]/10">
      {/* Column 1: Active Issues List — from Stitch */}
      <section className="flex flex-col bg-[#191b22] overflow-y-auto no-scrollbar">
        <div className="p-4 border-b border-[#464554]/10 flex justify-between items-center">
          <h2 className="text-xs font-bold tracking-[0.2em] text-[#c7c4d7] uppercase">Active Priority</h2>
          <span className="text-[10px] bg-[#c2c1ff]/10 text-[#c2c1ff] px-2 py-0.5 rounded-full font-bold tabular-nums">{activeIssues.length} OPEN</span>
        </div>
        <div className="flex-1 py-2">
          {activeIssues.map((i: Issue) => {
            const iAgent = i.assigneeAgentId ? agentMap.get(i.assigneeAgentId) : null;
            const iSlug = iAgent ? resolveSlug(iAgent.name) : null;
            const iConfig = iSlug ? AGENT_REGISTRY[iSlug] : null;
            const isCurrent = i.id === issueId;
            const iPrefix = `${(i as any).issuePrefix ?? "RC"}-${(i as any).issueNumber ?? i.id.slice(0, 4)}`;
            return (
              <Link key={i.id} to={`/issues/${i.id}/thread-view`} className="no-underline text-inherit">
                <div className={cn(
                  "px-4 py-4 cursor-pointer border-l-2 transition-colors",
                  isCurrent ? "border-[#c2c1ff] bg-[#c2c1ff]/5" : "border-transparent hover:bg-[#282a30]"
                )}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn("text-[10px] tracking-widest font-bold", isCurrent ? "text-[#c2c1ff]" : "text-[#c7c4d7]")}>{iPrefix}</span>
                    <span className={cn(
                      "flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                      i.status === "in_progress" ? "bg-[#eac400]/10 text-[#eac400]" :
                      i.status === "todo" ? "bg-[#33343b] text-[#c7c4d7]" :
                      i.status === "in_review" ? "bg-[#c2c1ff]/10 text-[#c2c1ff]" :
                      "bg-[#33343b] text-[#c7c4d7]"
                    )}>
                      {i.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h3 className={cn("text-sm mb-2 leading-tight", isCurrent ? "font-semibold" : "font-medium text-[#e2e2eb]/80")}>{i.title}</h3>
                  {iAgent && (
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${iConfig ? `bg-gradient-to-br ${iConfig.gradient}` : "bg-[#464554]"}`}>
                        {iAgent.name[0]}
                      </div>
                      <span className="text-[10px] text-[#c7c4d7] uppercase tracking-tighter">Assigned to {iAgent.name}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Column 2: Detailed Issue View — from Stitch */}
      <section className="flex flex-col relative overflow-hidden bg-[#111319]">
        {/* Header */}
        <div className="p-6 flex justify-between items-start border-b border-[#464554]/10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-[#c2c1ff]/20 text-[#c2c1ff] text-[10px] font-bold tracking-widest rounded-sm border border-[#c2c1ff]/20">RAZORCLIP</span>
              <span className="text-[#c7c4d7] text-xs tabular-nums">{prefix} • Updated {relativeTime(issue.updatedAt)}</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight mt-2">{issue.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-[#33343b] hover:bg-[#373940] text-xs font-bold px-4 py-2 rounded-xl border border-[#464554]/20 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>close</span> Close
            </button>
            <button className="bg-[#c2c1ff] text-[#1800a7] text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-[0_10px_20px_-5px_rgba(194,193,255,0.3)]">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>check_circle</span> Approve Fix
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8">
          {/* Meta Grid — from Stitch */}
          <div className="grid grid-cols-4 gap-4 p-4 rounded-xl bg-[#0c0e14] border border-[#464554]/10">
            <div>
              <p className="text-[10px] text-[#c7c4d7] uppercase mb-1">Status</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#eac400] animate-pulse" />
                <span className="text-sm font-semibold capitalize">{issue.status.replace(/_/g, " ")}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[#c7c4d7] uppercase mb-1">Priority</p>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[#c2c1ff]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>bolt</span>
                <span className="text-sm font-semibold">{(issue as any).priority ?? "Normal"}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[#c7c4d7] uppercase mb-1">Agent</p>
              <div className="flex items-center gap-2">
                {assignedConfig && <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${assignedConfig.gradient}`} />}
                <span className="text-sm font-semibold">{assignedAgent?.name ?? "Unassigned"}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[#c7c4d7] uppercase mb-1">Updated</p>
              <span className="text-sm font-semibold tabular-nums">{relativeTime(issue.updatedAt)}</span>
            </div>
          </div>

          {/* Description */}
          {issue.description && (
            <article className="text-[#e2e2eb]/90 leading-relaxed text-sm whitespace-pre-wrap">
              {issue.description.length > 1000 ? issue.description.slice(0, 1000) + "..." : issue.description}
            </article>
          )}
        </div>

        {/* Terminal — from Stitch */}
        {assignedAgent && (
          <div className="h-48 bg-black border-t border-[#464554]/30 font-mono p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c2c1ff] shadow-[0_0_8px_rgba(194,193,255,0.6)]" />
                <span className="text-[10px] text-[#c2c1ff] tracking-widest uppercase font-bold">{assignedAgent.name} Execution Log</span>
              </div>
              <span className="text-[10px] text-[#918fa0] uppercase">Live Feed</span>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar text-[11px] leading-tight space-y-1">
              <p className="text-[#c7c4d7]"><span className="text-[#5e5ce6]">[{new Date().toLocaleTimeString("en-US", { hour12: false })}]</span> Awaiting task execution...</p>
              <p className="text-[#c7c4d7]/40">System ready. Agent {assignedAgent.name} standing by.</p>
              <div className="flex items-center gap-2 text-[#c2c1ff] animate-pulse mt-2"><span>_</span></div>
            </div>
          </div>
        )}
      </section>

      {/* Column 3: Operations Thread — from Stitch */}
      <section className="flex flex-col bg-[#0c0e14]">
        <div className="p-4 border-b border-[#464554]/10">
          <h2 className="text-xs font-bold tracking-[0.2em] text-[#c7c4d7] uppercase">Operations Thread</h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6">
          {comments.length > 0 ? comments.map(c => (
            c.isAgent ? (
              /* Agent Message — from Stitch */
              <div key={c.id} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 p-0.5" style={{ borderColor: `${c.config?.color ?? "#c2c1ff"}50` }}>
                  <div className={`w-full h-full rounded-full flex items-center justify-center text-[10px] font-bold text-white ${c.config ? `bg-gradient-to-br ${c.config.gradient}` : "bg-[#464554]"}`}>
                    {c.name[0]}
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: c.config?.color ?? "#c2c1ff" }}>{c.name}</span>
                    <span className="text-[10px] text-[#c7c4d7] tabular-nums">{c.time}</span>
                  </div>
                  <div className="glass-card p-3 rounded-xl rounded-tl-none border text-sm leading-relaxed" style={{ borderColor: `${c.config?.color ?? "#c2c1ff"}10` }}>
                    {typeof c.body === "string" && c.body.length > 300 ? c.body.slice(0, 300) + "..." : c.body}
                  </div>
                </div>
              </div>
            ) : (
              /* Human Message — from Stitch */
              <div key={c.id} className="flex gap-3 flex-row-reverse">
                <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-[#918fa0]/30 p-0.5 bg-[#282a30] flex items-center justify-center text-[10px] font-bold text-[#c7c4d7]">
                  {c.name[0]}
                </div>
                <div className="flex-1 space-y-1.5 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[10px] text-[#c7c4d7] tabular-nums">{c.time}</span>
                    <span className="text-xs font-bold">{c.name}</span>
                  </div>
                  <div className="bg-[#282a30] p-3 rounded-xl rounded-tr-none border border-[#464554]/10 text-sm leading-relaxed text-left">
                    {typeof c.body === "string" && c.body.length > 300 ? c.body.slice(0, 300) + "..." : c.body}
                  </div>
                </div>
              </div>
            )
          )) : (
            <p className="text-xs text-[#c7c4d7]/40 text-center py-8">No comments yet</p>
          )}
        </div>

        {/* Input — from Stitch */}
        <div className="p-4 bg-[#191b22] border-t border-[#464554]/10">
          <div className="relative">
            <div className="absolute left-3 top-3.5 text-[#c2c1ff]">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>terminal</span>
            </div>
            <textarea
              className="w-full bg-[#0c0e14] border border-[#464554]/20 focus:border-[#c2c1ff]/50 focus:ring-1 focus:ring-[#c2c1ff]/20 rounded-xl pl-10 pr-12 py-3 text-sm placeholder:text-[#918fa0]/50 resize-none transition-all text-[#e2e2eb] focus:outline-none"
              placeholder="Type / to invoke agent commands..."
              rows={1}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
            />
            <button className="absolute right-2 top-2 p-2 text-[#c2c1ff] hover:bg-[#c2c1ff]/10 rounded-lg transition-colors">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>send</span>
            </button>
          </div>
          {assignedAgent && assignedConfig && (
            <div className="flex gap-2 mt-3">
              <span className="text-[9px] font-bold tracking-widest text-[#918fa0] uppercase">Active:</span>
              <div className="flex gap-1.5">
                <span className="px-1.5 py-0.5 text-[9px] rounded font-bold uppercase cursor-pointer transition-colors" style={{ backgroundColor: `${assignedConfig.color}15`, color: assignedConfig.color }}>
                  /{assignedAgent.name.toLowerCase()}
                </span>
                <span className="px-1.5 py-0.5 bg-[#444652] text-[#c7c4d7] text-[9px] rounded font-bold uppercase cursor-pointer hover:bg-[#33343b]">/logs</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Background glows — from Stitch */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#c2c1ff]/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#8B5CF6]/5 rounded-full blur-[150px] pointer-events-none -z-10" />
    </div>
  );
}
