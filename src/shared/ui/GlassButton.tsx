import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantMap: Record<Variant, string> = {
  primary:
    "border border-[rgba(115,157,236,0.18)] bg-[linear-gradient(180deg,#79a2f4,#4f7fe8)] text-white shadow-[0_12px_24px_rgba(104,142,220,0.24)]",
  secondary:
    "ff-glass text-[var(--ff-title)] hover:bg-[rgba(255,255,255,0.7)]",
  ghost:
    "border border-[rgba(255,255,255,0.8)] bg-[rgba(255,255,255,0.22)] text-[var(--ff-muted)] hover:text-[var(--ff-blue-strong)]",
};

export function GlassButton({
  children,
  className = "",
  variant = "secondary",
  type = "button",
  ...props
}: PropsWithChildren<GlassButtonProps>) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${variantMap[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
