/**
 * Issues — Razorclip-styled wrapper around the existing IssuesList component.
 *
 * Keeps ALL Paperclip functionality (filter, sort, group, kanban, search)
 * but wraps it in the Razorclip design language for the header area.
 * The IssuesList component handles the actual rendering.
 */
import { useEffect, useMemo, useCallback } from "react";
import { Link, useLocation, useSearchParams } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { heartbeatsApi } from "../api/heartbeats";
import { useCompany } from "../context/CompanyContext";
import { useDialog } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { createIssueDetailLocationState } from "../lib/issueDetailBreadcrumb";
import { IssuesList } from "../components/IssuesList";
import { EmptyState } from "../components/EmptyState";
import { CircleDot } from "lucide-react";

export function Issues() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { openNewIssue } = useDialog();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const initialSearch = searchParams.get("q") ?? "";
  const participantAgentId = searchParams.get("participantAgentId") ?? undefined;

  const handleSearchChange = useCallback((search: string) => {
    const trimmedSearch = search.trim();
    const currentSearch = new URLSearchParams(window.location.search).get("q") ?? "";
    if (currentSearch === trimmedSearch) return;
    const url = new URL(window.location.href);
    if (trimmedSearch) url.searchParams.set("q", trimmedSearch);
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
  });

  const liveIssueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const run of liveRuns ?? []) { if (run.issueId) ids.add(run.issueId); }
    return ids;
  }, [liveRuns]);

  const issueLinkState = useMemo(
    () => createIssueDetailLocationState("Issues", `${location.pathname}${location.search}${location.hash}`),
    [location.pathname, location.search, location.hash],
  );

  useEffect(() => { setBreadcrumbs([{ label: "Issues" }]); }, [setBreadcrumbs]);

  const { data: issues, isLoading, error } = useQuery({
    queryKey: [...queryKeys.issues.list(selectedCompanyId!), "participant-agent", participantAgentId ?? "__all__"],
    queryFn: () => issuesApi.list(selectedCompanyId!, { participantAgentId }),
    enabled: !!selectedCompanyId,
  });

  const updateIssue = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => issuesApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId!) }); },
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={CircleDot} message="Select a company to view issues." />;
  }

  const activeCount = (issues ?? []).filter((i: any) => i.status === "in_progress" || i.status === "todo" || i.status === "in_review").length;
  const totalCount = (issues ?? []).length;

  return (
    <div>
      {/* Razorclip header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant] mb-2">
            <span>Razorclip</span>
            <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chevron_right</span>
            <span className="text-[--rc-primary]">Issues</span>
          </nav>
          <h2 className="text-3xl font-light tracking-tight text-[--rc-on-surface]">
            Active <span className="font-bold">Issues</span>
          </h2>
          <div className="flex items-center gap-3 mt-1 text-[10px] uppercase tracking-[0.15em] text-[--rc-on-surface-variant]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {activeCount} active
            </span>
            <span className="w-1 h-1 rounded-full bg-[--rc-outline-variant]/30" />
            <span>{totalCount} total</span>
            <span className="w-1 h-1 rounded-full bg-[--rc-outline-variant]/30" />
            <span>{liveIssueIds.size} live</span>
          </div>
        </div>
        <button
          onClick={() => openNewIssue()}
          className="flex items-center gap-2 px-5 py-2.5 bg-[--rc-primary] text-[--rc-on-primary] rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_20px_-5px_rgba(194,193,255,0.3)]"
        >
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>add</span>
          New Issue
        </button>
      </div>

      {/* Existing IssuesList with all Paperclip functionality */}
      <IssuesList
        issues={issues ?? []}
        isLoading={isLoading}
        error={error as Error | null}
        agents={agents}
        projects={projects}
        liveIssueIds={liveIssueIds}
        viewStateKey="paperclip:issues-view"
        issueLinkState={issueLinkState}
        initialAssignees={searchParams.get("assignee") ? [searchParams.get("assignee")!] : undefined}
        initialSearch={initialSearch}
        onSearchChange={handleSearchChange}
        onUpdateIssue={(id, data) => updateIssue.mutate({ id, data })}
        searchFilters={participantAgentId ? { participantAgentId } : undefined}
      />
    </div>
  );
}
