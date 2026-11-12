import type { ComponentProps, CSSProperties } from "react";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { cn } from "@/lib/utils";

type SpotlightPanelProps = ComponentProps<"div"> & { surface?: string; light?: string };

export function SpotlightPanel({ className, style, surface = "var(--color-surface)", light = "var(--color-primary-300)", ...props }: SpotlightPanelProps) {
  return (
    <SpotlightCard
      spotlightColor={light}
      intensity={0.35}
      spotlightSize={320}
      borderGlow={0.6}
      grain={0}
      className={cn("rounded-card", className)}
      style={
        {
          "--spotlight-card-surface": surface,
          "--spotlight-card-border": "transparent",
          "--spotlight-card-shadow": "none",
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  );
}
