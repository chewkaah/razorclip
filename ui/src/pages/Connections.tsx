import { useEffect, useState } from "react";
import { Plug, Search, Zap, ChevronRight, ExternalLink } from "lucide-react";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { GlassCard, SectionHeader, StatusDot } from "../components/kinetic";
import { cn } from "../lib/utils";

/** Connection registry — will be dynamic from API once backend is built */
interface ConnectionDef {
  slug: string;
  name: string;
  category: string;
  authType: "oauth2" | "api_key" | "bearer_token";
  status: "connected" | "disconnected" | "error";
  description: string;
}

const CONNECTIONS: ConnectionDef[] = [
  // Communication & CRM
  { slug: "gmail", name: "Gmail", category: "Communication & CRM", authType: "oauth2", status: "disconnected", description: "Email read, search, and drafts" },
  { slug: "google-calendar", name: "Google Calendar", category: "Communication & CRM", authType: "oauth2", status: "disconnected", description: "Events, scheduling, free time" },
  { slug: "apollo", name: "Apollo.io", category: "Communication & CRM", authType: "api_key", status: "disconnected", description: "Contact search, enrichment, campaigns" },
  { slug: "fireflies", name: "Fireflies.ai", category: "Communication & CRM", authType: "api_key", status: "disconnected", description: "Meeting transcripts and summaries" },
  // Project Management
  { slug: "linear", name: "Linear", category: "Project Management", authType: "oauth2", status: "disconnected", description: "Issues, projects, and cycles" },
  { slug: "notion", name: "Notion", category: "Project Management", authType: "oauth2", status: "disconnected", description: "Databases, pages, CRM, pipeline" },
  // Dev & Deploy
  { slug: "vercel", name: "Vercel", category: "Dev & Deploy", authType: "bearer_token", status: "disconnected", description: "Deployments, projects, and logs" },
  { slug: "stripe-mcp", name: "Stripe", category: "Dev & Deploy", authType: "api_key", status: "disconnected", description: "Products, prices, subscriptions" },
  // Creative
  { slug: "canva", name: "Canva", category: "Creative", authType: "oauth2", status: "disconnected", description: "Design generation and brand kits" },
  // Financial (BI)
  { slug: "stripe-bi", name: "Stripe (Financial)", category: "Financial", authType: "api_key", status: "disconnected", description: "Revenue, MRR, churn, payments" },
  { slug: "mercury", name: "Mercury", category: "Financial", authType: "api_key", status: "disconnected", description: "Banking, cash position, runway" },
  // Analytics
  { slug: "vercel-analytics", name: "Vercel Analytics", category: "Analytics", authType: "bearer_token", status: "disconnected", description: "Website traffic for Vercel sites" },
  { slug: "ga4", name: "Google Analytics 4", category: "Analytics", authType: "oauth2", status: "disconnected", description: "Traffic, conversions, audience" },
  // Social
  { slug: "linkedin", name: "LinkedIn", category: "Social", authType: "oauth2", status: "disconnected", description: "Profile views, posts, SSI, followers" },
  { slug: "instagram", name: "Instagram", category: "Social", authType: "oauth2", status: "disconnected", description: "Reach, engagement, followers" },
  { slug: "twitter-x", name: "Twitter / X", category: "Social", authType: "bearer_token", status: "disconnected", description: "Impressions, mentions, followers" },
  { slug: "tiktok", name: "TikTok", category: "Social", authType: "oauth2", status: "disconnected", description: "Views, engagement, followers" },
  // Music SaaS
  { slug: "symphony", name: "Symphony", category: "Music SaaS", authType: "api_key", status: "disconnected", description: "Music marketing campaigns and analytics" },
];

function groupByCategory(connections: ConnectionDef[]): Record<string, ConnectionDef[]> {
  const groups: Record<string, ConnectionDef[]> = {};
  for (const c of connections) {
    (groups[c.category] ??= []).push(c);
  }
  return groups;
}

export function Connections() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [search, setSearch] = useState("");

  useEffect(() => {
    setBreadcrumbs([{ label: "Connections" }]);
  }, [setBreadcrumbs]);

  const filtered = search
    ? CONNECTIONS.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.category.toLowerCase().includes(search.toLowerCase()),
      )
    : CONNECTIONS;

  const groups = groupByCategory(filtered);
  const connectedCount = CONNECTIONS.filter((c) => c.status === "connected").length;

  return (
    <div className="kt-page min-h-full pb-4 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <section>
        <div className="flex items-center gap-3 mb-1">
          <Plug className="w-5 h-5 text-kt-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-kt-on-surface">Connections</h1>
        </div>
        <p className="text-kt-on-surface-variant text-sm">
          {connectedCount} of {CONNECTIONS.length} connected • Manage MCPs, OAuth, and API keys
        </p>
      </section>

      {/* Search */}
      <div className="glass-card rounded-2xl border border-white/5 px-4 py-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-kt-on-surface-variant/50" />
        <input
          type="text"
          placeholder="Search connections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-kt-on-surface placeholder:text-kt-on-surface-variant/40 outline-none"
        />
      </div>

      {/* Connection Groups */}
      {Object.entries(groups).map(([category, connections]) => (
        <section key={category} className="space-y-3">
          <SectionHeader
            title={category}
            trailing={
              <span className="text-[10px] text-kt-on-surface-variant tabular-nums">
                {connections.filter((c) => c.status === "connected").length}/{connections.length}
              </span>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {connections.map((conn) => (
              <ConnectionCard key={conn.slug} connection={conn} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ConnectionCard({ connection }: { connection: ConnectionDef }) {
  return (
    <GlassCard
      variant="interactive"
      className="p-4 flex items-center gap-4"
    >
      {/* Status + Icon */}
      <div className="w-10 h-10 rounded-xl bg-kt-surface-container-high flex items-center justify-center shrink-0 border border-white/5">
        <Plug className="w-4 h-4 text-kt-on-surface-variant" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-kt-on-surface truncate">{connection.name}</span>
          <StatusDot
            status={connection.status === "connected" ? "connected" : connection.status === "error" ? "error" : "disconnected"}
            size="sm"
          />
        </div>
        <p className="text-[11px] text-kt-on-surface-variant/70 truncate mt-0.5">
          {connection.description}
        </p>
      </div>

      {/* Action */}
      <div className="shrink-0">
        {connection.status === "connected" ? (
          <span className="text-[10px] font-bold text-emerald-400 uppercase">Connected</span>
        ) : (
          <button className="text-[10px] font-bold text-kt-primary uppercase hover:text-kt-primary/80 transition-colors">
            Configure
          </button>
        )}
      </div>
    </GlassCard>
  );
}
