import { cva, type VariantProps } from "class-variance-authority";
import { useRanks } from "@/hooks/queries";
import { assetUrl } from "@/lib/api";
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

export function RankBadge({ rank, size, className }: { rank?: string | null; className?: string } & VariantProps<typeof rankBadgeVariants>) {
  const ranks = useRanks().data?.ranks;
  if (!hasRank(rank)) return null;
  const icon = ranks?.find((r) => r.id === rank)?.icon;
  const name = rankName(rank);
  return (
    <img
      src={icon ? assetUrl(icon) : `/ranks/${rank}.svg`}
      alt={name}
      title={name}
      draggable={false}
      className={cn(rankBadgeVariants({ size }), className)}
    />
  );
}
