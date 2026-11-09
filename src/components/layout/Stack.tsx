import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const stackVariants = cva("flex", {
  variants: {
    direction: { col: "flex-col", row: "flex-row" },
    gap: { 1: "gap-1", 2: "gap-2", 3: "gap-3", 4: "gap-4", 6: "gap-6", 8: "gap-8", 12: "gap-12" },
    align: { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch", baseline: "items-baseline" },
    justify: { start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between" },
    wrap: { true: "flex-wrap" },
  },
  defaultVariants: { direction: "col", gap: 4 },
});

export function Stack({ className, direction, gap, align, justify, wrap, ...props }: ComponentProps<"div"> & VariantProps<typeof stackVariants>) {
  return <div className={cn(stackVariants({ direction, gap, align, justify, wrap }), className)} {...props} />;
}

export const Row = (props: ComponentProps<typeof Stack>) => <Stack direction="row" align="center" {...props} />;
