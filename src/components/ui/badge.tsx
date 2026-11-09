import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const badgeVariants = cva("inline-flex h-6 shrink-0 items-center gap-1 rounded-control px-2 text-caption font-medium whitespace-nowrap", {
  variants: {
    tone: {
      neutral: "bg-surface-3 text-muted",
      primary: "bg-primary-600 text-white",
      accent: "bg-surface-3 text-primary-300",
      danger: "bg-surface-3 text-danger",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
