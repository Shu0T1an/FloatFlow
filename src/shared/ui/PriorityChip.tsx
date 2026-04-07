import type { Priority } from "@/shared/domain/app-state";

interface PriorityChipProps {
  priority: Priority;
}

const copy: Record<Priority, string> = {
  low: "!",
  medium: "!!",
  high: "!!!",
};

const tone: Record<Priority, string> = {
  low: "bg-[rgba(255,255,255,0.42)] text-[var(--ff-muted)] border border-[rgba(255,255,255,0.72)]",
  medium: "bg-[rgba(220,231,251,0.72)] text-[var(--ff-blue-strong)] border border-[rgba(204,220,246,0.92)]",
  high: "bg-[rgba(245,233,220,0.84)] text-[var(--ff-gold)] border border-[rgba(233,214,191,0.94)]",
};

export function PriorityChip({ priority }: PriorityChipProps) {
  return (
    <span
      className={`inline-flex min-w-14 items-center justify-center rounded-full px-3 py-1 text-xs font-bold tracking-[0.12em] shadow-[var(--ff-shadow-sm)] ${tone[priority]}`}
    >
      {copy[priority]}
    </span>
  );
}
