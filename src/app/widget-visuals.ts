import type { CSSProperties } from "react";
import { clampOpacity } from "@/shared/domain/app-state";

export type WidgetVisualMode = "glass" | "solid";

type WidgetStyle = CSSProperties & Record<`--${string}`, string>;

export interface WidgetVisualState {
  mode: WidgetVisualMode;
  style: WidgetStyle;
}

export function buildWidgetVisualState(windowOpacity: number): WidgetVisualState {
  const opacity = clampOpacity(windowOpacity);
  const solidness = Number((((opacity - 0.1) / 0.9) || 0).toFixed(3));
  const mix = (glass: number, solid: number) =>
    (glass + (solid - glass) * solidness).toFixed(3);

  return {
    mode: opacity >= 0.995 ? "solid" : "glass",
    style: {
      "--ff-widget-top-alpha": mix(0.54, 0.98),
      "--ff-widget-bottom-alpha": mix(0.74, 0.995),
      "--ff-widget-glow-alpha": mix(0.26, 0.1),
      "--ff-surface-alpha": mix(0.36, 0.94),
      "--ff-surface-strong-alpha": mix(0.82, 0.98),
      "--ff-soft-surface-alpha": mix(0.34, 0.86),
      "--ff-input-surface-alpha": mix(0.38, 0.92),
      "--ff-dim-surface-alpha": mix(0.26, 0.72),
      "--ff-dashed-surface-alpha": mix(0.24, 0.76),
      "--ff-card-hover-alpha": mix(0.52, 0.97),
      "--ff-line-alpha": mix(0.72, 0.92),
      "--ff-line-soft-alpha": mix(0.2, 0.34),
      "--ff-dashed-border-alpha": mix(0.45, 0.74),
      "--ff-toolbar-pill-alpha": mix(0.2, 0.48),
      "--ff-shadow-opacity": mix(0.12, 0.08),
      "--ff-blur-strength": `${Math.round(28 - 12 * solidness)}px`,
    },
  };
}
