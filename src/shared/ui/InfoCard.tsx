import type { PropsWithChildren } from "react";

interface InfoCardProps {
  title: string;
  description?: string;
  className?: string;
}

export function InfoCard({
  title,
  description,
  className = "",
  children,
}: PropsWithChildren<InfoCardProps>) {
  return (
    <section className={`ff-panel p-4 ${className}`}>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {description ? <p className="mb-3 text-xs leading-6 ff-muted">{description}</p> : null}
      {children}
    </section>
  );
}
