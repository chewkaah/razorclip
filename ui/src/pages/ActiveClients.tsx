/**
 * ActiveClients — ALL LIVE DATA from BI clients API
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { biApi, type BIClient } from "../api/bi";
import { AGENT_REGISTRY } from "../components/kinetic/AgentChip";

export function ActiveClients() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const { selectedCompanyId } = useCompany();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => { setBreadcrumbs([{ label: "Clients" }]); }, [setBreadcrumbs]);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["bi-clients", selectedCompanyId],
    queryFn: () => biApi.clients(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const selected = selectedId ? clients?.find(c => c.id === selectedId) : clients?.[0];

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] -m-8">
        <div className="w-80 border-r border-[--rc-outline-variant]/10 p-6">
          <div className="animate-pulse space-y-3">
            <div className="glass-card rounded-xl h-16" />
            <div className="glass-card rounded-xl h-16" />
          </div>
        </div>
        <div className="flex-1 p-8">
          <div className="animate-pulse glass-card rounded-xl h-40" />
        </div>
      </div>
    );
  }

  // Empty state — no clients
  if (!clients || clients.length === 0) {
    return (
      <div className="max-w-4xl">
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant] mb-2">
          <span>Razorclip</span>
          <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chevron_right</span>
          <span className="text-[--rc-primary]">Clients</span>
        </nav>
        <h2 className="text-4xl font-light tracking-tight text-[--rc-on-surface] mb-4">Active <span className="font-bold">Clients</span></h2>
        <div className="glass-card rounded-2xl p-12 border border-white/5 text-center">
          <span className="material-symbols-outlined text-4xl text-[--rc-on-surface-variant]/20 mb-4 block" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>group</span>
          <h3 className="text-xl font-semibold text-[--rc-on-surface] mb-2">No Clients Yet</h3>
          <p className="text-sm text-[--rc-on-surface-variant]/50 max-w-md mx-auto">
            Connect Notion CRM in the Connections page to sync your client data, or add clients manually through the BI API.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-8 flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left: Client List — LIVE */}
      <section className="w-80 border-r border-[--rc-outline-variant]/10 bg-[--rc-surface-container-lowest]/50 flex flex-col shrink-0">
        <div className="p-6 border-b border-[--rc-outline-variant]/5">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[--rc-on-surface-variant] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[--rc-primary] animate-pulse" />
            Active Entities • {clients.length}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {clients.map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`group p-3 rounded-xl cursor-pointer transition-all ${
                c.id === selected?.id
                  ? "bg-[--rc-primary]/5 border border-[--rc-primary]/20"
                  : "hover:bg-[--rc-surface-container-low] border border-transparent hover:border-[--rc-outline-variant]/10"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                  c.id === selected?.id ? "bg-[--rc-primary]/10 border-[--rc-primary]/30" : "bg-[--rc-surface-container-highest] border-[--rc-outline-variant]/10"
                }`}>
                  <span className="text-sm font-bold text-[--rc-primary]">{c.name[0]}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-semibold text-[--rc-on-surface]">{c.name}</h4>
                    <span className={`w-2 h-2 rounded-full ${c.healthScore === "green" ? "bg-emerald-500" : c.healthScore === "amber" ? "bg-amber-500" : "bg-red-500"}`} />
                  </div>
                  <p className="text-[10px] text-[--rc-on-surface-variant] uppercase tracking-wider font-medium">{c.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Right: Client Detail — LIVE */}
      <section className="flex-1 overflow-y-auto bg-[--rc-surface] p-8 no-scrollbar">
        {selected ? (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[--rc-primary]/20 border border-[--rc-primary]/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-[--rc-primary]">{selected.name[0]}</span>
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-[--rc-on-surface]">{selected.name}</h2>
                  <p className="text-xs uppercase tracking-widest text-[--rc-on-surface-variant] font-medium">{selected.status}</p>
                </div>
              </div>
              {selected.retainerAmount && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[--rc-on-surface-variant] mb-1">Monthly Retainer</p>
                  <h3 className="text-4xl font-black text-[--rc-primary] tabular-nums tracking-tighter">${selected.retainerAmount.toLocaleString()}</h3>
                </div>
              )}
            </div>

            <div className="glass-card rounded-3xl p-6 border border-white/5">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[--rc-on-surface-variant] mb-4">Health Score</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black tabular-nums ${selected.healthScore === "green" ? "text-emerald-400" : selected.healthScore === "amber" ? "text-amber-400" : "text-red-400"}`}>
                  {selected.healthScore === "green" ? "Healthy" : selected.healthScore === "amber" ? "At Risk" : "Critical"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[--rc-on-surface-variant]/50">Select a client</p>
        )}
      </section>
    </div>
  );
}
