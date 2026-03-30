/**
 * Connections — using Stitch design language (no Stitch HTML for this page,
 * but matches the exact same visual patterns from other Stitch screens)
 */
import { useEffect, useState } from "react";
import { useBreadcrumbs } from "../context/BreadcrumbContext";

interface ConnectionDef {
  slug: string; name: string; category: string;
  authType: string; status: "connected" | "disconnected" | "error";
  description: string; icon: string;
}

const CONNECTIONS: ConnectionDef[] = [
  { slug: "gmail", name: "Gmail", category: "Communication & CRM", authType: "oauth2", status: "disconnected", description: "Email read, search, and drafts", icon: "mail" },
  { slug: "google-calendar", name: "Google Calendar", category: "Communication & CRM", authType: "oauth2", status: "disconnected", description: "Events, scheduling, free time", icon: "calendar_month" },
  { slug: "apollo", name: "Apollo.io", category: "Communication & CRM", authType: "api_key", status: "disconnected", description: "Contact search, enrichment, campaigns", icon: "person_search" },
  { slug: "fireflies", name: "Fireflies.ai", category: "Communication & CRM", authType: "api_key", status: "disconnected", description: "Meeting transcripts and summaries", icon: "mic" },
  { slug: "linear", name: "Linear", category: "Project Management", authType: "oauth2", status: "disconnected", description: "Issues, projects, and cycles", icon: "linear_scale" },
  { slug: "notion", name: "Notion", category: "Project Management", authType: "oauth2", status: "disconnected", description: "Databases, pages, CRM, pipeline", icon: "edit_note" },
  { slug: "vercel", name: "Vercel", category: "Dev & Deploy", authType: "bearer_token", status: "disconnected", description: "Deployments, projects, and logs", icon: "cloud_upload" },
  { slug: "stripe-mcp", name: "Stripe", category: "Dev & Deploy", authType: "api_key", status: "disconnected", description: "Products, prices, subscriptions", icon: "credit_card" },
  { slug: "canva", name: "Canva", category: "Creative", authType: "oauth2", status: "disconnected", description: "Design generation and brand kits", icon: "palette" },
  { slug: "stripe-bi", name: "Stripe (Financial)", category: "Financial", authType: "api_key", status: "disconnected", description: "Revenue, MRR, churn, payments", icon: "payments" },
  { slug: "mercury", name: "Mercury", category: "Financial", authType: "api_key", status: "disconnected", description: "Banking, cash position, runway", icon: "account_balance" },
  { slug: "vercel-analytics", name: "Vercel Analytics", category: "Analytics", authType: "bearer_token", status: "disconnected", description: "Website traffic for Vercel sites", icon: "analytics" },
  { slug: "ga4", name: "Google Analytics 4", category: "Analytics", authType: "oauth2", status: "disconnected", description: "Traffic, conversions, audience", icon: "monitoring" },
  { slug: "linkedin", name: "LinkedIn", category: "Social", authType: "oauth2", status: "disconnected", description: "Profile views, posts, SSI, followers", icon: "share" },
  { slug: "instagram", name: "Instagram", category: "Social", authType: "oauth2", status: "disconnected", description: "Reach, engagement, followers", icon: "photo_camera" },
  { slug: "twitter-x", name: "Twitter / X", category: "Social", authType: "bearer_token", status: "disconnected", description: "Impressions, mentions, followers", icon: "tag" },
  { slug: "tiktok", name: "TikTok", category: "Social", authType: "oauth2", status: "disconnected", description: "Views, engagement, followers", icon: "movie" },
  { slug: "symphony", name: "Symphony", category: "Music SaaS", authType: "api_key", status: "disconnected", description: "Music marketing campaigns and analytics", icon: "music_note" },
];

function groupByCategory(conns: ConnectionDef[]): Record<string, ConnectionDef[]> {
  const g: Record<string, ConnectionDef[]> = {};
  for (const c of conns) (g[c.category] ??= []).push(c);
  return g;
}

export function Connections() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [search, setSearch] = useState("");
  useEffect(() => { setBreadcrumbs([{ label: "Connections" }]); }, [setBreadcrumbs]);

  const filtered = search ? CONNECTIONS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase())) : CONNECTIONS;
  const groups = groupByCategory(filtered);
  const connectedCount = CONNECTIONS.filter(c => c.status === "connected").length;

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header — Stitch style */}
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
            {connectedCount} of {CONNECTIONS.length} connected • MCPs, OAuth, and API keys
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[--rc-on-surface-variant] text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>search</span>
        <input
          type="text" placeholder="Search connections..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-[--rc-surface-container-low] border border-[--rc-outline-variant]/20 rounded-xl pl-11 pr-4 py-3 text-sm text-[--rc-on-surface] placeholder:text-[--rc-on-surface-variant]/40 focus:outline-none focus:border-[#c2c1ff]/40 focus:ring-1 focus:ring-[#c2c1ff]/20 transition-all"
        />
      </div>

      {/* Groups */}
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
              <div key={conn.slug} className="glass-card rounded-xl p-5 border border-[--rc-outline-variant]/10 hover:translate-y-[-2px] transition-all duration-300 group cursor-pointer hover:border-[#c2c1ff]/20">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[--rc-surface-container-high] flex items-center justify-center border border-[--rc-outline-variant]/20 shrink-0">
                    <span className="material-symbols-outlined text-[--rc-primary] text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>{conn.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-[--rc-on-surface]">{conn.name}</h4>
                      <span className={`w-2 h-2 rounded-full ${conn.status === "connected" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : conn.status === "error" ? "bg-[#ffb4ab] shadow-[0_0_8px_rgba(255,180,171,0.5)]" : "bg-[#464554]"}`} />
                    </div>
                    <p className="text-[11px] text-[--rc-on-surface-variant]/60 leading-relaxed">{conn.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  {conn.status === "connected" ? (
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Connected</span>
                  ) : (
                    <button className="px-3 py-1.5 rounded-lg bg-[--rc-primary]/10 text-[--rc-primary] text-[10px] font-bold uppercase tracking-widest hover:bg-[--rc-primary]/20 transition-all">
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
