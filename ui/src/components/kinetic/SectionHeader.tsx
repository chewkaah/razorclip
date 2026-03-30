import { type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface SectionHeaderProps {
  title: string;
  /** Right-side element (badge, link, icon) */
  trailing?: ReactNode;
  className?: string;
}

/**
 * SectionHeader — Uppercase label for Kinetic Terminal page sections.
 *
 * Design: label-sm, all-caps, +0.1em tracking, on-surface-variant color.
 */
export function SectionHeader({ title, trailing, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-kt-on-surface-variant">
        {title}
      </h2>
      {trailing}
    </div>
  );
}
