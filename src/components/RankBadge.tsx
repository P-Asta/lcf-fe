import { cva, type VariantProps } from "class-variance-authority";
import { useRanks } from "@/hooks/queries";
import { assetUrl } from "@/lib/api";
import { isRatingHidden } from "@/lib/format";
import { hasRank, rankName } from "@/lib/ranks";
import { cn } from "@/lib/utils";

const rankBadgeVariants = cva("inline-block aspect-square shrink-0 select-none object-contain", {
  variants: {
    size: {
      sm: "size-7",
      md: "size-10",
      lg: "size-16",
    },
  },
  defaultVariants: { size: "sm" },
});

export function RankBadge({ rank, tr, rd, rating_hidden, size, className }: { rank?: string | null; tr?: number; rd?: number; rating_hidden?: boolean; className?: string } & VariantProps<typeof rankBadgeVariants>) {
  const data = useRanks().data;
  const hidden = isRatingHidden({ tr, rd, rating_hidden });
  if (!hidden && !hasRank(rank)) return null;
  const emblem = hidden ? data?.hidden_rating : data?.ranks.find((r) => r.id === rank);
  const name = hidden ? (emblem?.name ?? "Unrated") : rankName(rank);
  return (
    <img
      src={emblem ? assetUrl(emblem.icon) : `/ranks/${hidden ? "unknown" : rank}.svg`}
      alt={name}
      title={name}
      draggable={false}
      className={cn(rankBadgeVariants({ size }), className)}
    />
  );
}
