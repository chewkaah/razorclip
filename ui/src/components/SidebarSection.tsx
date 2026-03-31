import type { ReactNode } from "react";

interface SidebarSectionProps {
  label: string;
  children: ReactNode;
}

export function SidebarSection({ label, children }: SidebarSectionProps) {
  return (
    <div>
      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[--rc-on-surface-variant]/40">
        {label}
      </div>
      <div className="flex flex-col gap-0.5 mt-0.5">{children}</div>
    </div>
  );
}
