interface TagChipProps {
  label: string;
}

export function TagChip({ label }: TagChipProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-[color:var(--ff-line)] bg-[color:var(--ff-surface-strong)] px-3 py-1 text-xs font-medium text-[var(--ff-muted)] shadow-[var(--ff-shadow-sm)]">
      {label}
    </span>
  );
}
