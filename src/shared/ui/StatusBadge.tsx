interface StatusBadgeProps {
  label: string;
  tone?: "default" | "success" | "warning";
}

const tones = {
  default: "bg-[rgba(255,255,255,0.48)] text-[var(--ff-muted)] border border-[rgba(255,255,255,0.82)]",
  success: "bg-[var(--ff-green-soft)] text-[var(--ff-success)] border border-[rgba(210,228,220,0.9)]",
  warning: "bg-[rgba(245,233,220,0.84)] text-[var(--ff-gold)] border border-[rgba(233,214,191,0.94)]",
};

export function StatusBadge({ label, tone = "default" }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-[var(--ff-shadow-sm)] ${tones[tone]}`}>
      {label}
    </span>
  );
}
