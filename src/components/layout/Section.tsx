import type { ComponentProps, ReactNode } from "react";
import { Caption, Title } from "@/components/typography/Text";
import { cn } from "@/lib/utils";

type SectionProps = ComponentProps<"section"> & { title: string; aside?: ReactNode };

export function Section({ title, aside, className, children, ...props }: SectionProps) {
  return (
    <section className={cn("flex flex-col gap-3", className)} {...props}>
      <div className="flex items-baseline justify-between gap-4">
        <Title>{title}</Title>
        {aside != null && <Caption className="text-body">{aside}</Caption>}
      </div>
      {children}
    </section>
  );
}

export function Panel({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-card bg-surface", className)} {...props} />;
}
