import { cva, type VariantProps } from "class-variance-authority";
import { Award } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBadges } from "@/hooks/queries";
import { assetUrl, type BadgeDef } from "@/lib/api";
import { cn } from "@/lib/utils";

const iconVariants = cva("inline-flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-3 text-primary-300", {
  variants: {
    size: {
      sm: "size-5 [&_svg]:size-3.5",
      md: "size-8 [&_svg]:size-5",
      lg: "size-14 [&_svg]:size-8",
    },
  },
  defaultVariants: { size: "md" },
});

/** A badge's picture (or a fallback icon), no tooltip. */
export function BadgeImage({ badge, size, className }: { badge: Pick<BadgeDef, "name" | "image">; className?: string } & VariantProps<typeof iconVariants>) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn(iconVariants({ size }), className)}>
      {badge.image && !failed ? (
        <img src={assetUrl(badge.image)} alt="" loading="lazy" className="aspect-square size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <Award aria-hidden />
      )}
    </span>
  );
}

/** A badge with its name and description in a tooltip. */
export function BadgeIcon({ badge, size, className }: { badge: BadgeDef; className?: string } & VariantProps<typeof iconVariants>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} aria-label={badge.name} className="inline-flex cursor-default rounded-control focus-visible:outline-2 focus-visible:outline-primary-400">
          <BadgeImage badge={badge} size={size} className={className} />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="block font-medium">{badge.name}</span>
        {badge.description && <span className="block text-muted">{badge.description}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

/** A row of small badge icons, looked up by id. Unknown ids are skipped. */
export function BadgeRow({ ids, defs, size = "sm", max = 6 }: { ids: number[]; defs: BadgeDef[] | undefined; max?: number } & VariantProps<typeof iconVariants>) {
  if (!defs || ids.length === 0) return null;
  const list = ids.map((id) => defs.find((d) => d.id === id)).filter((d): d is BadgeDef => !!d);
  if (list.length === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-1">
      {list.slice(0, max).map((b) => (
        <BadgeIcon key={b.id} badge={b} size={size} />
      ))}
      {list.length > max && <span className="text-caption text-muted">+{list.length - max}</span>}
    </span>
  );
}

export function WornBadge({ id, size = "sm" }: { id: number | null | undefined } & VariantProps<typeof iconVariants>) {
  const defs = useBadges().data?.badges;
  const badge = id == null ? undefined : defs?.find((d) => d.id === id);
  if (!badge) return null;
  return <BadgeIcon badge={badge} size={size} />;
}
