import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/typography/Text";
import { cn } from "@/lib/utils";

const statCardVariants = cva("flex min-h-28 flex-col gap-1 rounded-card p-5", {
  variants: {
    tone: {
      default: "bg-surface",
      highlight: "bg-primary-600",
    },
  },
  defaultVariants: { tone: "default" },
});

type StatCardProps = VariantProps<typeof statCardVariants> & {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  foot?: ReactNode;
  accent?: boolean;
  big?: boolean;
  className?: string;
};

export function StatCard({ label, value, sub, foot, tone, accent, big, className }: StatCardProps) {
  const hl = tone === "highlight";
  return (
    <div className={cn(statCardVariants({ tone }), className)}>
      <Text variant="label" tone="inherit" className={hl ? "text-primary-100" : "text-muted"}>
        {label}
      </Text>
      <Text variant={big ? "display" : "stat"} tone="inherit" className={cn("mt-1", hl ? "text-white" : accent ? "text-primary-300" : "text-fg")}>
        {value}
      </Text>
      {sub != null && (
        <Text variant="caption" tone="inherit" className={cn("mt-auto pt-2", hl ? "text-primary-100" : "text-muted")}>
          {sub}
        </Text>
      )}
      {foot != null && (
        <Text variant="caption" tone="inherit" className={hl ? "text-primary-100" : "text-muted"}>
          {foot}
        </Text>
      )}
    </div>
  );
}

export function StatCardSkeleton({ className, big }: { className?: string; big?: boolean }) {
  return (
    <div className={cn(statCardVariants(), className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className={cn("mt-1", big ? "h-10 w-32" : "h-8 w-20")} />
      <Skeleton className="mt-auto h-4 w-28" />
    </div>
  );
}
