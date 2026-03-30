/**
 * ApprovalQueue — pixel-perfect from Stitch approval_queue_desktop/code.html
 */
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { approvalsApi } from "../api/approvals";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { AGENT_REGISTRY, type AgentSlug } from "../components/kinetic/AgentChip";
import type { Approval } from "@paperclipai/shared";

function resolveSlug(name: string): AgentSlug | null {
  const s = name.toLowerCase().trim();
  return s in AGENT_REGISTRY ? (s as AgentSlug) : null;
}

const APPROVAL_AVATARS: Record<string, string> = {
  dante: "https://lh3.googleusercontent.com/aida-public/AB6AXuA4CnmxXN3cbnMkPwq7xqTXPlih_mk-p61bHCyfcGPiY8ExbUaS8U2oYXYlWKj089Jdhe0W3CHMKmia3S__7kP9O_M7uDXp5cnscxBMIVj-GM3Tmiss56-EMpSja-A2ehUlpbfjtrE01K-5pQrCym2UI-ExZ9-h5eCcLNzwJE1-91ipgdTAutfD-W633YZGRUzN28mxnqwzwJqcE2hHC132_c-7AiOyg0MRltPQIaPl2vV66nZqGUaucmGJ_OhScwA-AkHdh-yyOTc",
  brent: "https://lh3.googleusercontent.com/aida-public/AB6AXuBYo-0636EjXCSBp3TBlCrPcObjmhasDXV2MFFYvW2Xlx5jT9CQjCBpspBvpvZr4IlPpj41ujlJ12EKI9TiWI7EIlngJMKayMDszH0cGAwA7-krH2_Q0YMb6RBTBi00JKjIGC1u5v7VcUDNgbTOxxLhSsRqVLp8azbVlvlfAC31oPWweKRkiH3LhfBkXn1LYar9WBC6fnoAvzBFes56eu1b0rfwCM2XPFfCyLIC2_UVR25WKyCI_NMaJZczrwLH_Hft4AKQqG1Hx9I",
};

export function ApprovalQueue() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => { setBreadcrumbs([{ label: "Approval Queue" }]); }, [setBreadcrumbs]);

  const { data: approvals, isLoading } = useQuery({
    queryKey: queryKeys.approvals.list(selectedCompanyId!, "pending"),
    queryFn: () => approvalsApi.list(selectedCompanyId!, "pending"),
    enabled: !!selectedCompanyId,
  });

  const pending = useMemo(() => (approvals ?? []).filter((a: Approval) => a.status === "pending"), [approvals]);

  if (isLoading) return <div className="animate-pulse h-96 glass-card rounded-xl" />;

  return (
    <div className="max-w-6xl">
      {/* Breadcrumbs & Header — from Stitch */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant] mb-2">
            <span>Razorclip</span>
            <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chevron_right</span>
            <span className="text-[--rc-primary]">Approval Queue</span>
          </nav>
          <h2 className="text-4xl font-light tracking-tight text-[--rc-on-surface]">
            Pending <span className="font-bold">Authorizations</span>
          </h2>
          <p className="text-[--rc-on-surface-variant] mt-2 max-w-lg font-medium text-sm">
            Reviewing {pending.length} actions from autonomous agents across the production stack.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant]">Est. Burn</span>
            <span className="tabular-nums font-bold text-[--rc-primary]">$412.08</span>
          </div>
          <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant]">Queue Depth</span>
            <span className="tabular-nums font-bold text-[--rc-primary]">{pending.length}</span>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {pending.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}>check_circle</span>
          </div>
          <h3 className="text-2xl font-bold text-[--rc-on-surface] mb-2">All Clear</h3>
          <p className="text-[--rc-on-surface-variant]">No pending authorizations</p>
        </div>
      )}

      {/* Approval Grid — from Stitch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {pending.map((approval) => {
          const p = approval.payload ?? {};
          const agentName = (p.agentName as string) ?? "Agent";
          const slug = resolveSlug(agentName);
          const config = slug ? AGENT_REGISTRY[slug] : null;
          const accentColor = config?.color ?? "#c2c1ff";
          const accentLight = config?.colorLight ?? "#c7c4d7";
          const title = (p.title as string) ?? (p.summary as string) ?? `${approval.type} request`;
          const desc = (p.description as string) ?? (p.plan as string) ?? null;
          const avatarUrl = slug ? APPROVAL_AVATARS[slug] : null;

          return (
            <div key={approval.id} className="glass-card rounded-2xl flex flex-col p-6 hover:translate-y-[-4px] transition-all duration-300 group">
              {/* Agent Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full p-[2px]" style={{ background: `linear-gradient(to bottom right, ${accentColor}, ${accentLight})`, boxShadow: `0 0 30px -5px ${accentColor}30` }}>
                    <div className="w-full h-full rounded-full bg-[--rc-surface-container] flex items-center justify-center overflow-hidden">
                      {avatarUrl ? (
                        <img alt={agentName} src={avatarUrl} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold" style={{ color: accentColor }}>{agentName[0]}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-[--rc-on-surface]">{agentName}</h3>
                    <span className="text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant] py-0.5 px-2 bg-[--rc-surface-container-high] rounded-full border border-[--rc-outline-variant]/20">
                      {approval.type}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="tabular-nums text-xs font-semibold text-[--rc-primary]">~$— API</span>
                  <span className="text-[10px] text-[--rc-on-surface-variant] uppercase">Cost Impact</span>
                </div>
              </div>

              {/* Requested Action */}
              <div className="mb-4">
                <p className="text-xs uppercase tracking-widest text-[--rc-on-surface-variant] mb-2 font-bold">Requested Action</p>
                <p className="text-sm font-medium leading-relaxed">{title}</p>
              </div>

              {/* Context */}
              {desc && (
                <div className="bg-[--rc-surface-container-lowest]/50 rounded-xl p-4 mb-6 border border-[--rc-outline-variant]/10">
                  <span className="text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant] block mb-2">Context Summary</span>
                  <p className="text-[11px] text-[--rc-on-surface-variant] leading-relaxed line-clamp-3">{desc}</p>
                </div>
              )}

              {/* Signal + Actions — from Stitch */}
              <div className="mt-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-1 w-4 rounded-full" style={{ backgroundColor: i < 2 ? accentColor : `${accentColor}30` }} />
                    ))}
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-tighter tabular-nums">—% Signal</span>
                </div>
                <div className="flex gap-2">
                  <button className="w-10 h-10 rounded-xl border border-[--rc-outline-variant]/20 flex items-center justify-center hover:bg-[#ffb4ab]/10 hover:text-[#ffb4ab] transition-all active:scale-90">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>close</span>
                  </button>
                  <button className="px-4 py-2 rounded-xl bg-[--rc-primary] text-[--rc-on-primary] text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-[#c2c1ff]/10">
                    Approve
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
