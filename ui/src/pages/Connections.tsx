/**
 * Connections — shows predefined integration slots + installed plugins
 * with real status indicators and "Add Connection" flow
 */
import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { connectionsApi, type Connection } from "../api/connections";
import { pluginsApi } from "../api/plugins";
import { queryKeys } from "../lib/queryKeys";

const ICON_MAP: Record<string, string> = {
  gmail: "mail", "google-calendar": "calendar_month", apollo: "person_search",
  fireflies: "mic", linear: "linear_scale", notion: "edit_note",
  vercel: "cloud_upload", "stripe-mcp": "credit_card", canva: "palette",
  "stripe-bi": "payments", mercury: "account_balance",
  "vercel-analytics": "analytics", ga4: "monitoring",
  linkedin: "share", instagram: "photo_camera", "twitter-x": "tag",
  tiktok: "movie", symphony: "music_note",
};

interface ConnectionSlot {
  slug: string;
  displayName: string;
  category: string;
  connectionType: string;
  authMechanism: string;
  status: "connected" | "disconnected" | "error" | "running";
  description: string;
  icon: string;
  isPlugin?: boolean;
  pluginVersion?: string;
}

const PREDEFINED_SLOTS: ConnectionSlot[] = [
  // Communication & CRM — CONNECTED via MCP
  { slug: "gmail", displayName: "Gmail", category: "Communication & CRM", connectionType: "mcp_server", authMechanism: "oauth2", status: "connected", description: "Email read, search, and drafts", icon: "mail" },
  { slug: "google-calendar", displayName: "Google Calendar", category: "Communication & CRM", connectionType: "mcp_server", authMechanism: "oauth2", status: "connected", description: "Events, scheduling, free time", icon: "calendar_month" },
  { slug: "apollo", displayName: "Apollo.io", category: "Communication & CRM", connectionType: "mcp_server", authMechanism: "api_key", status: "connected", description: "Contact search, enrichment, campaigns", icon: "person_search" },
  { slug: "fireflies", displayName: "Fireflies.ai", category: "Communication & CRM", connectionType: "mcp_server", authMechanism: "api_key", status: "connected", description: "Meeting transcripts and summaries", icon: "mic" },
  // Project Management — CONNECTED via MCP
  { slug: "linear", displayName: "Linear", category: "Project Management", connectionType: "mcp_server", authMechanism: "oauth2", status: "connected", description: "Issues, projects, and cycles", icon: "linear_scale" },
  { slug: "notion", displayName: "Notion", category: "Project Management", connectionType: "mcp_server", authMechanism: "oauth2", status: "connected", description: "Databases, pages, CRM, pipeline", icon: "edit_note" },
  { slug: "obsidian", displayName: "Obsidian", category: "Project Management", connectionType: "mcp_server", authMechanism: "local", status: "connected", description: "Knowledge base vault read/write", icon: "book" },
  // Dev & Deploy — CONNECTED via MCP
  { slug: "vercel", displayName: "Vercel", category: "Dev & Deploy", connectionType: "mcp_server", authMechanism: "bearer_token", status: "connected", description: "Deployments, projects, logs, domains", icon: "cloud_upload" },
  { slug: "stripe-mcp", displayName: "Stripe", category: "Dev & Deploy", connectionType: "mcp_server", authMechanism: "api_key", status: "connected", description: "Products, prices, subscriptions, payments", icon: "credit_card" },
  { slug: "chrome-devtools", displayName: "Chrome DevTools", category: "Dev & Deploy", connectionType: "mcp_server", authMechanism: "local", status: "connected", description: "Browser automation, screenshots, debugging", icon: "code" },
  // Creative — CONNECTED via MCP
  { slug: "canva", displayName: "Canva", category: "Creative", connectionType: "mcp_server", authMechanism: "oauth2", status: "connected", description: "Design generation, editing, brand kits, exports", icon: "palette" },
  // AI & Media
  { slug: "fal", displayName: "FAL.ai", category: "AI & Media", connectionType: "api_key", authMechanism: "api_key", status: "disconnected", description: "Image generation, video, audio AI models", icon: "auto_awesome" },
  { slug: "symphony", displayName: "Symphony", category: "AI & Media", connectionType: "mcp_server", authMechanism: "api_key", status: "connected", description: "Music marketing campaigns and analytics", icon: "music_note" },
  // Infrastructure
  { slug: "scheduled-tasks", displayName: "Scheduled Tasks", category: "Infrastructure", connectionType: "mcp_server", authMechanism: "local", status: "connected", description: "Cron-style scheduled agent tasks", icon: "schedule" },
  { slug: "mcp-registry", displayName: "MCP Registry", category: "Infrastructure", connectionType: "mcp_server", authMechanism: "local", status: "connected", description: "Search and discover MCP connectors", icon: "hub" },
  { slug: "inmotion", displayName: "InMotion", category: "Infrastructure", connectionType: "api_key", authMechanism: "api_key", status: "disconnected", description: "Web hosting, domains, server management", icon: "dns" },
  // Financial (BI)
  { slug: "stripe-bi", displayName: "Stripe (Financial)", category: "Financial", connectionType: "bi_integration", authMechanism: "api_key", status: "disconnected", description: "Revenue, MRR, churn, payments", icon: "payments" },
  { slug: "mercury", displayName: "Mercury", category: "Financial", connectionType: "bi_integration", authMechanism: "api_key", status: "disconnected", description: "Banking, cash position, runway", icon: "account_balance" },
  // Analytics
  { slug: "vercel-analytics", displayName: "Vercel Analytics", category: "Analytics", connectionType: "bi_integration", authMechanism: "bearer_token", status: "disconnected", description: "Website traffic for Vercel sites", icon: "analytics" },
  { slug: "ga4", displayName: "Google Analytics 4", category: "Analytics", connectionType: "bi_integration", authMechanism: "oauth2", status: "disconnected", description: "Traffic, conversions, audience", icon: "monitoring" },
  // Social
  { slug: "linkedin", displayName: "LinkedIn", category: "Social", connectionType: "bi_integration", authMechanism: "oauth2", status: "disconnected", description: "Profile views, posts, SSI, followers", icon: "share" },
  { slug: "instagram", displayName: "Instagram", category: "Social", connectionType: "bi_integration", authMechanism: "oauth2", status: "disconnected", description: "Reach, engagement, followers", icon: "photo_camera" },
  { slug: "twitter-x", displayName: "Twitter / X", category: "Social", connectionType: "bi_integration", authMechanism: "bearer_token", status: "disconnected", description: "Impressions, mentions, followers", icon: "tag" },
  { slug: "tiktok", displayName: "TikTok", category: "Social", connectionType: "bi_integration", authMechanism: "oauth2", status: "disconnected", description: "Views, engagement, followers", icon: "movie" },
];

function groupByCategory(slots: ConnectionSlot[]): Record<string, ConnectionSlot[]> {
  const g: Record<string, ConnectionSlot[]> = {};
  for (const s of slots) (g[s.category] ??= []).push(s);
  return g;
}

export function Connections() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const { selectedCompanyId } = useCompany();
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Custom");

  const createMutation = useMutation({
    mutationFn: (data: { slug: string; displayName: string; category: string }) =>
      connectionsApi.create(selectedCompanyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections", selectedCompanyId] });
      setShowAddForm(false);
      setNewName("");
      setNewSlug("");
      setNewCategory("Custom");
    },
  });

  useEffect(() => { setBreadcrumbs([{ label: "Connections" }]); }, [setBreadcrumbs]);

  // Fetch real connections from API (if available)
  const { data: apiConnections } = useQuery({
    queryKey: ["connections", selectedCompanyId],
    queryFn: () => connectionsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    retry: false,
  });

  // Fetch installed plugins
  const { data: plugins } = useQuery({
    queryKey: queryKeys.plugins.all,
    queryFn: () => pluginsApi.list(),
    retry: false,
  });

  // Merge: API connections override predefined statuses, plugins add as connected
  const allSlots = useMemo(() => {
    const slots = [...PREDEFINED_SLOTS];

    // Override from API — but only upgrade status (connected beats disconnected),
    // or apply real status for BI integrations that require actual API key setup.
    // MCP connections that are hardcoded as "connected" stay connected since they're
    // actually running as MCP servers in the current session.
    if (apiConnections && apiConnections.length > 0) {
      for (const apiConn of apiConnections) {
        const idx = slots.findIndex(s => s.slug === apiConn.slug);
        if (idx >= 0) {
          const slot = slots[idx];
          const apiStatus = apiConn.status as ConnectionSlot["status"];
          // For BI integrations (need real API keys), always trust the API status
          if (slot.connectionType === "bi_integration") {
            slots[idx] = { ...slot, status: apiStatus };
          }
          // For MCP connections, only upgrade (disconnected → connected), never downgrade
          else if (apiStatus === "connected" || apiStatus === "running") {
            slots[idx] = { ...slot, status: apiStatus };
          }
          // If API says error, show that regardless
          else if (apiStatus === "error") {
            slots[idx] = { ...slot, status: "error" };
          }
          // Otherwise keep the hardcoded status (MCP servers we know are running)
        }
      }
    }

    // Add installed plugins as connected items
    if (plugins) {
      for (const plugin of plugins) {
        const pluginSlot: ConnectionSlot = {
          slug: `plugin-${(plugin as any).id}`,
          displayName: (plugin as any).name || (plugin as any).packageName || "Plugin",
          category: "Installed Plugins",
          connectionType: "mcp_plugin",
          authMechanism: "plugin",
          status: (plugin as any).status === "running" ? "connected" : (plugin as any).status === "error" ? "error" : "disconnected",
          description: `MCP Plugin • ${(plugin as any).status} • v${(plugin as any).version || "?"}`,
          icon: "extension",
          isPlugin: true,
          pluginVersion: (plugin as any).version,
        };
        slots.push(pluginSlot);
      }
    }

    return slots;
  }, [apiConnections, plugins]);

  const filtered = search
    ? allSlots.filter(s => s.displayName.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()))
    : allSlots;
  const groups = groupByCategory(filtered);
  const connectedCount = allSlots.filter(s => s.status === "connected" || s.status === "running").length;

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant] mb-2">
            <span>Razorclip</span>
            <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chevron_right</span>
            <span className="text-[--rc-primary]">Connections</span>
          </nav>
          <h2 className="text-4xl font-light tracking-tight text-[--rc-on-surface]">
            Manage <span className="font-bold">Connections</span>
          </h2>
          <p className="text-[--rc-on-surface-variant] mt-2 text-sm font-medium">
            {connectedCount} of {allSlots.length} connected • MCPs, OAuth, and API keys
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[--rc-primary] text-[--rc-on-primary] rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_20px_-5px_rgba(0,255,170,0.3)]"
        >
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>add</span>
          Add Connection
        </button>
      </div>

      {/* Add Connection Form */}
      {showAddForm && (
        <div className="glass-card rounded-2xl p-6 border border-[--rc-primary]/20 space-y-4">
          <h3 className="text-sm font-bold text-[--rc-on-surface]">Add New Connection</h3>
          <p className="text-xs text-[--rc-on-surface-variant]">
            Install an MCP server or configure an API key for a new integration.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[--rc-on-surface-variant] mb-2 block">Connection Name</label>
              <input
                type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Slack, Discord, HubSpot"
                className="w-full bg-[--rc-surface-container-low] border border-[--rc-outline-variant]/20 rounded-xl px-4 py-3 text-sm text-[--rc-on-surface] placeholder:text-[--rc-on-surface-variant]/40 focus:outline-none focus:border-[--rc-primary]/40 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[--rc-on-surface-variant] mb-2 block">NPM Package or Slug</label>
              <input
                type="text" value={newSlug} onChange={e => setNewSlug(e.target.value)}
                placeholder="e.g. @modelcontextprotocol/server-slack"
                className="w-full bg-[--rc-surface-container-low] border border-[--rc-outline-variant]/20 rounded-xl px-4 py-3 text-sm text-[--rc-on-surface] placeholder:text-[--rc-on-surface-variant]/40 focus:outline-none focus:border-[--rc-primary]/40 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[--rc-on-surface-variant] mb-2 block">Category</label>
              <select
                value={newCategory} onChange={e => setNewCategory(e.target.value)}
                className="w-full bg-[--rc-surface-container-low] border border-[--rc-outline-variant]/20 rounded-xl px-4 py-3 text-sm text-[--rc-on-surface] focus:outline-none focus:border-[--rc-primary]/40 transition-all"
              >
                <option value="Custom">Custom</option>
                <option value="Communication & CRM">Communication & CRM</option>
                <option value="Project Management">Project Management</option>
                <option value="Dev & Deploy">Dev & Deploy</option>
                <option value="Creative">Creative</option>
                <option value="AI & Media">AI & Media</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Financial">Financial</option>
                <option value="Analytics">Analytics</option>
                <option value="Social">Social</option>
              </select>
            </div>
          </div>
          {createMutation.error && (
            <p className="text-xs text-[#ffb4ab]">{(createMutation.error as Error).message}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => { setShowAddForm(false); setNewName(""); setNewSlug(""); }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[--rc-on-surface-variant] border border-[--rc-outline-variant]/20 hover:bg-[--rc-surface-container-high] transition-all"
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[--rc-primary] text-[--rc-on-primary] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({
                slug: newSlug.trim() || newName.trim().toLowerCase().replace(/\s+/g, "-"),
                displayName: newName.trim(),
                category: newCategory,
              })}
            >
              {createMutation.isPending ? "Installing..." : "Install Connection"}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[--rc-on-surface-variant] text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>search</span>
        <input
          type="text" placeholder="Search connections..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-[--rc-surface-container-low] border border-[--rc-outline-variant]/20 rounded-xl pl-11 pr-4 py-3 text-sm text-[--rc-on-surface] placeholder:text-[--rc-on-surface-variant]/40 focus:outline-none focus:border-[--rc-primary]/40 focus:ring-1 focus:ring-[--rc-primary]/20 transition-all"
        />
      </div>

      {/* Connection Groups */}
      {Object.entries(groups).map(([category, slots]) => (
        <section key={category} className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[--rc-on-surface-variant]">{category}</h3>
            <span className="text-[10px] tabular-nums text-[--rc-on-surface-variant]/50">
              {slots.filter(s => s.status === "connected" || s.status === "running").length}/{slots.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map(slot => (
              <div key={slot.slug} className="glass-card rounded-xl p-5 border border-[--rc-outline-variant]/10 hover:translate-y-[-2px] transition-all duration-300 group cursor-pointer hover:border-[--rc-primary]/20">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[--rc-surface-container-high] flex items-center justify-center border border-[--rc-outline-variant]/20 shrink-0">
                    <span className="material-symbols-outlined text-[--rc-primary] text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>{slot.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-[--rc-on-surface]">{slot.displayName}</h4>
                      {/* Real status indicator */}
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        slot.status === "connected" || slot.status === "running"
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          : slot.status === "error"
                            ? "bg-[#ffb4ab] shadow-[0_0_8px_rgba(255,180,171,0.5)]"
                            : "bg-[--rc-outline-variant]/40"
                      }`} />
                    </div>
                    <p className="text-[11px] text-[--rc-on-surface-variant]/60 leading-relaxed">{slot.description}</p>
                    {slot.isPlugin && slot.pluginVersion && (
                      <p className="text-[10px] text-[--rc-on-surface-variant]/30 mt-1 tabular-nums">v{slot.pluginVersion}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    slot.status === "connected" || slot.status === "running"
                      ? "text-emerald-400"
                      : slot.status === "error"
                        ? "text-[#ffb4ab]"
                        : "text-[--rc-on-surface-variant]/40"
                  }`}>
                    {slot.status === "connected" || slot.status === "running" ? "● Connected" : slot.status === "error" ? "● Error" : "○ Not connected"}
                  </span>
                  {slot.status !== "connected" && slot.status !== "running" && (
                    <button
                      onClick={() => {
                        setNewName(slot.displayName);
                        setNewSlug(slot.slug);
                        setNewCategory(slot.category);
                        setShowAddForm(true);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[--rc-primary]/10 text-[--rc-primary] text-[10px] font-bold uppercase tracking-widest hover:bg-[--rc-primary]/20 transition-all"
                    >
                      Configure
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
