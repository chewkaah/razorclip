/**
 * CommandPaletteRC — Razorclip Kinetic Terminal command palette.
 *
 * Triggered by Cmd+K / Ctrl+K. Searches agents, issues, and pages.
 * Glass card styling matching the Kinetic Terminal design system.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { issuesApi } from "@/api/issues";
import { agentsApi } from "@/api/agents";
import { queryKeys } from "@/lib/queryKeys";
import { cn, agentUrl } from "@/lib/utils";
import type { Agent } from "@paperclipai/shared";

interface SearchResult {
  id: string;
  type: "agent" | "issue" | "page";
  label: string;
  sublabel?: string;
  icon: string;
  path: string;
}

const pageResults: SearchResult[] = [
  { id: "page-home", type: "page", label: "Dashboard", sublabel: "Home command center", icon: "dashboard", path: "home" },
  { id: "page-chat", type: "page", label: "Chat", sublabel: "Conversations", icon: "chat_bubble", path: "chat" },
  { id: "page-agents", type: "page", label: "Agents", sublabel: "Agent grid view", icon: "smart_toy", path: "agents/grid" },
  { id: "page-issues", type: "page", label: "Issues", sublabel: "All issues", icon: "error", path: "issues" },
  { id: "page-inbox", type: "page", label: "Inbox", sublabel: "Your inbox", icon: "inbox", path: "inbox/mine" },
  { id: "page-routines", type: "page", label: "Routines", sublabel: "Scheduled routines", icon: "sync", path: "routines" },
  { id: "page-goals", type: "page", label: "Goals", sublabel: "Company goals", icon: "target", path: "goals" },
  { id: "page-projects", type: "page", label: "Projects", sublabel: "All projects", icon: "folder", path: "projects" },
  { id: "page-costs", type: "page", label: "Costs", sublabel: "Spend analytics", icon: "payments", path: "costs" },
  { id: "page-activity", type: "page", label: "Activity", sublabel: "Activity feed", icon: "timeline", path: "activity" },
  { id: "page-health", type: "page", label: "Health", sublabel: "System health", icon: "monitor_heart", path: "health" },
  { id: "page-approvals", type: "page", label: "Approvals", sublabel: "Approval queue", icon: "verified", path: "approvals/queue" },
  { id: "page-settings", type: "page", label: "Settings", sublabel: "Company settings", icon: "settings", path: "company/settings" },
  { id: "page-connections", type: "page", label: "Connections", sublabel: "Integrations", icon: "cable", path: "connections" },
  { id: "page-skills", type: "page", label: "Skills", sublabel: "Company skills", icon: "build", path: "skills" },
];

export function CommandPaletteRC() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompany();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Fetch data only when palette is open
  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && open,
  });

  const { data: issues = [] } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && open,
  });

  const { data: searchedIssues = [] } = useQuery({
    queryKey: queryKeys.issues.search(selectedCompanyId!, query.trim()),
    queryFn: () => issuesApi.list(selectedCompanyId!, { q: query.trim() }),
    enabled: !!selectedCompanyId && open && query.trim().length > 0,
  });

  // Build search results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const all: SearchResult[] = [];

    // Agents
    const activeAgents = agents.filter((a: Agent) => a.status !== "terminated");
    for (const agent of activeAgents) {
      if (q && !agent.name.toLowerCase().includes(q) && !(agent.title ?? "").toLowerCase().includes(q)) continue;
      all.push({
        id: `agent-${agent.id}`,
        type: "agent",
        label: agent.name,
        sublabel: agent.title || agent.role,
        icon: "smart_toy",
        path: agentUrl(agent),
      });
    }

    // Issues
    const issuePool = q.length > 0 ? searchedIssues : issues;
    for (const issue of issuePool.slice(0, 15)) {
      if (q && !issue.title.toLowerCase().includes(q) && !(issue.identifier ?? "").toLowerCase().includes(q)) continue;
      all.push({
        id: `issue-${issue.id}`,
        type: "issue",
        label: issue.title,
        sublabel: issue.identifier ?? issue.id.slice(0, 8),
        icon: "error",
        path: `/issues/${issue.identifier ?? issue.id}`,
      });
    }

    // Pages
    for (const page of pageResults) {
      if (q && !page.label.toLowerCase().includes(q) && !(page.sublabel ?? "").toLowerCase().includes(q)) continue;
      all.push(page);
    }

    return all;
  }, [query, agents, issues, searchedIssues]);

  // Group results
  const grouped = useMemo(() => {
    const groups: { type: string; label: string; items: SearchResult[] }[] = [];
    const agentItems = results.filter((r) => r.type === "agent");
    const issueItems = results.filter((r) => r.type === "issue");
    const pageItems = results.filter((r) => r.type === "page");
    if (agentItems.length > 0) groups.push({ type: "agent", label: "Agents", items: agentItems.slice(0, 6) });
    if (issueItems.length > 0) groups.push({ type: "issue", label: "Issues", items: issueItems.slice(0, 8) });
    if (pageItems.length > 0) groups.push({ type: "page", label: "Pages", items: pageItems.slice(0, 8) });
    return groups;
  }, [results]);

  const flatResults = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = flatResults[selectedIndex];
        if (selected) {
          setOpen(false);
          navigate(selected.path);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [flatResults, selectedIndex, navigate],
  );

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      {/* Palette */}
      <div className="relative w-full max-w-lg mx-4 glass-card rounded-2xl border border-[--rc-primary]/15 shadow-[0_25px_50px_-12px_rgba(0,255,170,0.15)] overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--rc-outline-variant]/10">
          <span
            className="material-symbols-outlined text-lg text-[--rc-primary]/60"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
          >
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm text-[--rc-on-surface] placeholder:text-[--rc-on-surface-variant]/40 focus:outline-none"
            placeholder="Search agents, issues, pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="text-[9px] uppercase tracking-widest text-[--rc-on-surface-variant]/40 border border-[--rc-outline-variant]/10 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {flatResults.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[--rc-on-surface-variant]/50">
              No results found
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.type}>
                <div className="px-5 pt-3 pb-1">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-medium text-[--rc-on-surface-variant]/40">
                    {group.label}
                  </span>
                </div>
                {group.items.map((item) => {
                  const idx = flatIndex++;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      className={cn(
                        "w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors",
                        isSelected
                          ? "bg-[--rc-primary]/10 text-[--rc-on-surface]"
                          : "text-[--rc-on-surface-variant] hover:bg-[--rc-primary]/5",
                      )}
                      onClick={() => {
                        setOpen(false);
                        navigate(item.path);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span
                        className={cn(
                          "material-symbols-outlined text-base",
                          isSelected ? "text-[--rc-primary]" : "text-[--rc-on-surface-variant]/50",
                        )}
                        style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="text-sm truncate block">{item.label}</span>
                        {item.sublabel && (
                          <span className="text-[10px] text-[--rc-on-surface-variant]/40 truncate block">
                            {item.sublabel}
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] uppercase tracking-widest text-[--rc-primary]/60">
                          Enter
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-[--rc-outline-variant]/10 text-[9px] uppercase tracking-widest text-[--rc-on-surface-variant]/30">
          <span>Navigate with arrows</span>
          <span>CMD+K to toggle</span>
        </div>
      </div>
    </div>
  );
}
