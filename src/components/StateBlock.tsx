import { CircleAlert, Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Text } from "@/components/typography/Text";
import { cn } from "@/lib/utils";

type StateBlockProps = { icon: LucideIcon; title: string; children?: ReactNode; className?: string; tone?: "muted" | "danger" };

function StateBlock({ icon: Icon, title, children, className, tone = "muted" }: StateBlockProps) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex flex-col items-center justify-center gap-2 rounded-card bg-surface px-6 py-12 text-center", className)}>
      <Icon aria-hidden className={cn("size-6", tone === "danger" ? "text-danger" : "text-muted")} />
      <Text variant="title">{title}</Text>
      {children != null && (
        <Text variant="body" tone="muted" className="max-w-md">
          {children}
        </Text>
      )}
    </div>
  );
}

export const EmptyState = (p: Omit<StateBlockProps, "icon" | "tone"> & { icon?: LucideIcon }) => <StateBlock icon={p.icon ?? Inbox} {...p} />;

export function ErrorState({ error, className }: { error: unknown; className?: string }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <StateBlock icon={CircleAlert} tone="danger" title="Could not load data" className={className}>
      {msg}. Retrying automatically.
    </StateBlock>
  );
}
