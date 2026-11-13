import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full min-w-xl border-separate border-spacing-y-1 text-body", className)} {...props} />
    </div>
  );
}

export const THead = (props: ComponentProps<"thead">) => <thead {...props} />;
export const TBody = (props: ComponentProps<"tbody">) => <tbody {...props} />;

const cellAlign = cva("", {
  variants: { align: { left: "text-left", right: "text-right", center: "text-center" } },
  defaultVariants: { align: "left" },
});

export function TH({ className, align, ...props }: ComponentProps<"th"> & VariantProps<typeof cellAlign>) {
  return <th scope="col" className={cn(cellAlign({ align }), "h-8 px-3 text-label sm:px-4 font-medium text-muted uppercase", className)} {...props} />;
}

const rowVariants = cva("transition-colors [&>td:first-child]:rounded-l-card [&>td:last-child]:rounded-r-card", {
  variants: {
    inset: { false: "bg-surface", true: "bg-surface-2" },
    interactive: { true: "" },
  },
  compoundVariants: [
    { inset: false, interactive: true, className: "hover:bg-surface-2" },
    { inset: true, interactive: true, className: "hover:bg-surface-3" },
  ],
  defaultVariants: { inset: false },
});

export function TR({ className, interactive, inset, ...props }: ComponentProps<"tr"> & VariantProps<typeof rowVariants>) {
  return <tr className={cn(rowVariants({ interactive, inset }), className)} {...props} />;
}

export function TD({ className, align, ...props }: ComponentProps<"td"> & VariantProps<typeof cellAlign>) {
  return <td className={cn(cellAlign({ align }), "h-11 px-3 align-middle sm:px-4", className)} {...props} />;
}

export const RankCell = ({ n }: { n: number }) => <TD className="w-12 font-extrabold sm:w-16 text-primary-400 tabular-nums">#{n}</TD>;
