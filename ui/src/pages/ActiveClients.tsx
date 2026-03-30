/**
 * ActiveClients — pixel-perfect from Stitch active_clients_projects_desktop/code.html
 *
 * 2-column layout: Client sidebar list | Client detail with health score, agents, projects
 */
import { useEffect, useState } from "react";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { AGENT_REGISTRY } from "../components/kinetic/AgentChip";

const clients = [
  { id: "1", name: "Aether Corp", status: "Healthy", statusColor: "bg-emerald-500", icon: "deployed_code" },
  { id: "2", name: "Nebula Dynamics", status: "Healthy", statusColor: "bg-emerald-500", icon: "rocket_launch" },
  { id: "3", name: "QuantX Global", status: "At Risk", statusColor: "bg-amber-500", icon: "data_thresholding" },
  { id: "4", name: "Titan Forge", status: "Critical", statusColor: "bg-red-500", icon: "memory" },
];

const MI = ({ icon }: { icon: string }) => (
  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>{icon}</span>
);

export function ActiveClients() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [selected, setSelected] = useState("2");
  useEffect(() => { setBreadcrumbs([{ label: "Clients" }]); }, [setBreadcrumbs]);

  const client = clients.find(c => c.id === selected) ?? clients[1];

  return (
    <div className="-m-8 flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left: Client List — from Stitch */}
      <section className="w-80 border-r border-[#464554]/10 bg-[#0c0e14]/50 flex flex-col shrink-0">
        <div className="p-6 border-b border-[#464554]/5">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#c7c4d7] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c2c1ff] animate-pulse" />
            Active Entities
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {clients.map(c => (
            <div
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`group p-3 rounded-xl cursor-pointer transition-all ${
                c.id === selected
                  ? "bg-[#c2c1ff]/5 border border-[#c2c1ff]/20"
                  : "hover:bg-[#191b22] border border-transparent hover:border-[#464554]/10"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                  c.id === selected ? "bg-[#c2c1ff]/10 border-[#c2c1ff]/30" : "bg-[#33343b] border-[#464554]/10"
                }`}>
                  <span className="material-symbols-outlined text-[#c2c1ff]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>{c.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-semibold text-[#e2e2eb]">{c.name}</h4>
                    <span className={`w-2 h-2 rounded-full ${c.statusColor} shadow-[0_0_8px_currentColor]`} />
                  </div>
                  <p className="text-[10px] text-[#c7c4d7] uppercase tracking-wider font-medium">{c.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Right: Client Detail — from Stitch */}
      <section className="flex-1 overflow-y-auto bg-[#111319] p-8 no-scrollbar">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Hero */}
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#c2c1ff]/20 border border-[#c2c1ff]/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#c2c1ff] scale-125" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>{client.icon}</span>
              </div>
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#e2e2eb]">{client.name}</h2>
                <p className="text-xs uppercase tracking-widest text-[#c7c4d7] font-medium">Strategic Infrastructure Development</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#c7c4d7] mb-1">Monthly Retainer</p>
              <h3 className="text-5xl font-black text-[#c2c1ff] tabular-nums tracking-tighter">$42,500<span className="text-lg font-light opacity-50">.00</span></h3>
            </div>
          </div>

          {/* Health + Agents Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Health Score */}
            <div className="col-span-4 glass-card rounded-3xl p-6 relative overflow-hidden group border border-white/5">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#c7c4d7] mb-4">Operational Health Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-[#e2e2eb] tabular-nums">98.4</span>
                <span className="text-xl font-bold text-emerald-500">%</span>
              </div>
              <div className="mt-4 h-1.5 w-full bg-[#33343b] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#5e5ce6] to-[#c2c1ff] w-[98.4%] rounded-full" />
              </div>
              <p className="mt-4 text-xs text-[#c7c4d7] flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-emerald-500" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}>trending_up</span>
                +2.4% from last period
              </p>
            </div>

            {/* Agents */}
            <div className="col-span-8 glass-card rounded-3xl p-6 border border-white/5">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#c7c4d7]">Active Orchestration Agents</p>
                <button className="text-[10px] text-[#c2c1ff] font-bold uppercase tracking-widest hover:underline">Assign New Agent +</button>
              </div>
              <div className="flex flex-wrap gap-4">
                {(["dante", "rex", "nova"] as const).map(slug => {
                  const config = AGENT_REGISTRY[slug];
                  return (
                    <div key={slug} className="flex items-center gap-3 bg-[#191b22] px-4 py-3 rounded-2xl border border-[#464554]/10 hover:border-[#c2c1ff]/30 transition-all cursor-pointer">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${config.gradient} p-[1px]`}>
                        <div className="w-full h-full rounded-full bg-[#33343b] flex items-center justify-center text-xs font-bold" style={{ color: config.color }}>{config.label[0]}</div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#e2e2eb]">{config.label}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[9px] uppercase tracking-tighter text-[#c7c4d7] font-medium">Active</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Projects */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] uppercase tracking-[0.3em] font-black text-[#e2e2eb]">Live Project Stream</h3>
              <div className="h-px flex-1 mx-8 bg-gradient-to-r from-[#464554]/30 to-transparent" />
            </div>
            {[
              { id: "PJ-4029", name: "Quantum Neural Bridge Integration", phase: "Phase 3: Logic Gate Optimization", progress: 74, milestone: "Data Handover", deadline: "Oct 24, 2023" },
              { id: "PJ-4031", name: "Global Edge Latency Reduction", phase: "Phase 1: Node Distribution", progress: 22, milestone: "Ping Stability", deadline: "Nov 12, 2023" },
            ].map(project => (
              <div key={project.id} className="glass-card rounded-2xl p-6 hover:bg-[#191b22]/60 transition-colors border-l-4 border-l-[#c2c1ff] border border-white/5">
                <div className="grid grid-cols-12 gap-8 items-center">
                  <div className="col-span-4 space-y-1">
                    <span className="text-[10px] text-[#c7c4d7] tabular-nums">{project.id}</span>
                    <h4 className="text-sm font-bold text-[#e2e2eb]">{project.name}</h4>
                    <p className="text-[10px] text-[#c7c4d7]">{project.phase}</p>
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase text-[#c7c4d7]">Progress</span>
                      <span className="text-xs font-bold tabular-nums text-[#c2c1ff]">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#33343b] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#5e5ce6] to-[#c2c1ff] rounded-full" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-[10px] uppercase text-[#c7c4d7]">Milestone</p>
                    <p className="text-xs font-semibold text-[#e2e2eb]">{project.milestone}</p>
                  </div>
                  <div className="col-span-3 text-right">
                    <p className="text-[10px] uppercase text-[#c7c4d7]">Deadline</p>
                    <p className="text-xs font-semibold text-[#e2e2eb] tabular-nums">{project.deadline}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
