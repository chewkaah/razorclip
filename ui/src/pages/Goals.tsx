import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { goalsApi } from "../api/goals";
import { useCompany } from "../context/CompanyContext";
import { useDialog } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { GoalTree } from "../components/GoalTree";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Target, Plus } from "lucide-react";

export function Goals() {
  const { selectedCompanyId } = useCompany();
  const { openNewGoal } = useDialog();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Goals" }]);
  }, [setBreadcrumbs]);

  const { data: goals, isLoading, error } = useQuery({
    queryKey: queryKeys.goals.list(selectedCompanyId!),
    queryFn: () => goalsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={Target} message="Select a company to view goals." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end mb-6">
        <div>
          <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant] mb-2">
            <span>Razorclip</span>
            <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chevron_right</span>
            <span className="text-[--rc-primary]">Goals</span>
          </nav>
          <h2 className="text-3xl font-light tracking-tight text-[--rc-on-surface]">
            Company <span className="font-bold">Goals</span>
          </h2>
          <div className="flex items-center gap-3 mt-1 text-[10px] uppercase tracking-[0.15em] text-[--rc-on-surface-variant]">
            <span>{(goals ?? []).length} total</span>
          </div>
        </div>
        <button
          onClick={() => openNewGoal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-[--rc-primary] text-[--rc-on-primary] rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_20px_-5px_rgba(0,255,170,0.3)]"
        >
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>add</span>
          New Goal
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {goals && goals.length === 0 && (
        <EmptyState
          icon={Target}
          message="No goals yet."
          action="Add Goal"
          onAction={() => openNewGoal()}
        />
      )}

      {goals && goals.length > 0 && (
        <GoalTree goals={goals} goalLink={(goal) => `/goals/${goal.id}`} />
      )}
    </div>
  );
}
