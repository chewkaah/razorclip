/**
 * Connections — wired to real /companies/:id/connections API
 */
import { useEffect, useState } from "react";
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

function groupByCategory(conns: Connection[]): Record<string, Connection[]> {
  const g: Record<string, Connection[]> = {};
  for (const c of conns) (g[c.category] ??= []).push(c);
  return g;
}

export function Connections() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  useEffect(() => { setBreadcrumbs([{ label: "Connections" }]); }, [setBreadcrumbs]);

  const { data: connections, isLoading } = useQuery({
    queryKey: ["connections", selectedCompanyId],
    queryFn: () => connectionsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  // Also fetch installed MCP plugins to show them as connections
  const { data: plugins } = useQuery({
    queryKey: queryKeys.plugins.all,
    queryFn: () => pluginsApi.list(),
  });

  const testMutation = useMutation({
    mutationFn: ({ slug }: { slug: string }) => connectionsApi.test(selectedCompanyId!, slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["connections", selectedCompanyId] }),
  });

  const all = connections ?? [];
  const filtered = search
    ? all.filter(c => c.displayName.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()))
    : all;
  const groups = groupByCategory(filtered);
  const connectedCount = all.filter(c => c.status === "connected").length;

  if (isLoading) {
    return (
      <div className="max-w-5xl space-y-6">
        <div className="animate-pulse glass-card rounded-xl h-20" />
        <div className="animate-pulse glass-card rounded-xl h-40" />
        <div className="animate-pulse glass-card rounded-xl h-40" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8">
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
            {connectedCount} of {all.length} connected • MCPs, OAuth, and API keys
          </p>
        </div>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[--rc-on-surface-variant] text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>search</span>
        <input
          type="text" placeholder="Search connections..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-[--rc-surface-container-low] border border-[--rc-outline-variant]/20 rounded-xl pl-11 pr-4 py-3 text-sm text-[--rc-on-surface] placeholder:text-[--rc-on-surface-variant]/40 focus:outline-none focus:border-[--rc-primary]/40 focus:ring-1 focus:ring-[--rc-primary]/20 transition-all"
        />
      </div>

      {Object.entries(groups).map(([category, conns]) => (
        <section key={category} className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[--rc-on-surface-variant]">{category}</h3>
            <span className="text-[10px] tabular-nums text-[--rc-on-surface-variant]/50">
              {conns.filter(c => c.status === "connected").length}/{conns.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conns.map(conn => (
              <div key={conn.id} className="glass-card rounded-xl p-5 border border-[--rc-outline-variant]/10 hover:translate-y-[-2px] transition-all duration-300 group cursor-pointer hover:border-[--rc-primary]/20">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[--rc-surface-container-high] flex items-center justify-center border border-[--rc-outline-variant]/20 shrink-0">
                    <span className="material-symbols-outlined text-[--rc-primary] text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                      {ICON_MAP[conn.slug] ?? "cable"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-[--rc-on-surface]">{conn.displayName}</h4>
                      <span className={`w-2 h-2 rounded-full ${
                        conn.status === "connected" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                        conn.status === "error" ? "bg-[#ffb4ab] shadow-[0_0_8px_rgba(255,180,171,0.5)]" :
                        "bg-[--rc-outline-variant]"
                      }`} />
                    </div>
                    <p className="text-[10px] text-[--rc-on-surface-variant]/50 uppercase tracking-wider">{conn.connectionType} • {conn.authMechanism}</p>
                    {conn.lastError && (
                      <p className="text-[10px] text-[#ffb4ab] mt-1 truncate">{conn.lastError}</p>
                    )}
                    {conn.lastSyncAt && (
                      <p className="text-[10px] text-[--rc-on-surface-variant]/40 mt-1 tabular-nums">Last sync: {new Date(conn.lastSyncAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  {conn.status === "connected" ? (
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Connected</span>
                  ) : (
                    <button
                      onClick={() => testMutation.mutate({ slug: conn.slug })}
                      disabled={testMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-[--rc-primary]/10 text-[--rc-primary] text-[10px] font-bold uppercase tracking-widest hover:bg-[--rc-primary]/20 transition-all disabled:opacity-50"
                    >
                      {testMutation.isPending ? "Testing..." : "Configure"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {/* MCP Plugins — installed connectors from Paperclip plugin system */}
      {plugins && plugins.length > 0 && (
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[--rc-on-surface-variant]">MCP Connectors (Installed)</h3>
            <span className="text-[10px] tabular-nums text-[--rc-on-surface-variant]/50">
              {plugins.filter((p: any) => p.status === "running").length}/{plugins.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plugins.map((plugin: any) => (
              <div key={plugin.id} className="glass-card rounded-xl p-5 border border-[--rc-outline-variant]/10 hover:translate-y-[-2px] transition-all duration-300 group cursor-pointer hover:border-[--rc-primary]/20">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[--rc-surface-container-high] flex items-center justify-center border border-[--rc-outline-variant]/20 shrink-0">
                    <span className="material-symbols-outlined text-[--rc-primary] text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>extension</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-[--rc-on-surface]">{plugin.name || plugin.packageName}</h4>
                      <span className={`w-2 h-2 rounded-full ${
                        plugin.status === "running" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                        plugin.status === "error" ? "bg-[#ffb4ab]" : "bg-[--rc-outline-variant]"
                      }`} />
                    </div>
                    <p className="text-[10px] text-[--rc-on-surface-variant]/50 uppercase tracking-wider">
                      MCP Plugin • {plugin.status}
                    </p>
                    {plugin.version && (
                      <p className="text-[10px] text-[--rc-on-surface-variant]/30 mt-1 tabular-nums">v{plugin.version}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
